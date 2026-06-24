/* STRICT supervisor-request journey suite.
   Every check maps to a specific supervisor request (V3 delivered + V4 Phase-0 delivered).
   It only verifies adherence to the request — no improvements, no gap-filling.
   Store behavior is exercised live; UI-only requests are verified by source wiring presence. */
import fs from 'node:fs';
globalThis.sessionStorage = { _d:{}, getItem(k){return this._d[k]??null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];} };
import { createPinia, setActivePinia } from 'pinia';
import { useWarehouseStore } from './warehouse.mjs';
setActivePinia(createPinia());
const s = useWarehouseStore();
let pass=0, fail=0; const fails=[];
const approx=(a,b,e=0.011)=>Math.abs(a-b)<=e;
function ok(req,name,cond,extra=''){ const tag='['+req+'] '+name; if(cond){pass++;console.log('  PASS  '+tag);} else {fail++;fails.push(tag+(extra?' — '+extra:''));console.log('  FAIL  '+tag+(extra?' — '+extra:''));} }
const onhand=(id)=>(s.itemById(id)||{}).qty_onhand;
const src=(p)=>fs.readFileSync(p,'utf8');
const PO=src('src/pages/PurchaseOrdersPage.vue'), INV=src('src/pages/InventoryPage.vue'), SO=src('src/pages/SalesOrdersPage.vue');

console.log('\n=== FLOW A — Inventory & Groups ===');
// V3 Inventory#1 — fast group building (lightweight picker)
ok('V3 INV-1','group member picker uses the lightweight catalog (no-lag fix)', INV.includes(':options="store.catalogLite"'));
// V4 Inventory#1 — pinned header
ok('V4 INV-1','items list header is pinned (sticky) on scroll', INV.includes('sticky top-0'));
// V3 SO-Groups#1 — a group is one line whose qty scales members (5 groups: singles x5, the double x10)
{
  const exp=s.expandGroup('g-starter',1); // basket per_group 2 = the "double"
  const members=Object.keys(exp).map(k=>({vendor_item_id:k,per_group:exp[k]}));
  const eff=s.soLineEffective({kind:'group',members},5);
  const by=Object.fromEntries(eff.map(e=>[e.vendor_item_id,e.qty]));
  ok('V3 SO-GRP-1','5 groups -> single items become 5', by['i-tab']===5 && by['i-mount']===5 && by['i-mdm']===5, JSON.stringify(by));
  ok('V3 SO-GRP-1','5 groups -> the double item (x2) becomes 10', by['i-basket']===10, 'basket='+by['i-basket']);
}

console.log('\n=== FLOW B — Purchase Orders ===');
// V3 PO#1 — deposit auto-fills from vendor rule (and field stays editable)
ok('V3 PO-1','deposit auto-fills from vendor rule (MedCarts 30% of 1000 = 300)', approx(s.poDepositFor('v-medcarts',1000),300), 'got '+s.poDepositFor('v-medcarts',1000));
ok('V3 PO-1','deposit field is editable (bound to form.deposit)', PO.includes('v-model.number="form.deposit"'));
// V3 PO#2 — Save closes the PO
ok('V3 PO-2','Save closes the PO (saveNotes hides it)', /function saveNotes\(po\)\s*\{[^}]*showPO\.value = false/.test(PO));
// V3 PO#3 — remaining payment owed after receiving
{
  s.addItem({name:'Recon A',vendor_id:'v-techsource',item_type_id:'',cost:100,qty_onhand:0,threshold:0,bin_location:'Z-9',is_active:true});
  const it=s.items.find(i=>i.name==='Recon A');
  const po={id:'po-t1',po_number:s.nextPoNumber(),vendor_id:'v-techsource',order_date:'2026-06-16',expected_date:'',status:'open',progress:'',sent:null,notes:'',landed_costs:[],payments:[],deposit:0,items:[{id:'t1l',kind:'item',vendor_item_id:it.id,name:'Recon A',qty:5,qty_received:0,unit_cost:100}]};
  s.purchaseOrders.unshift(po);
  s.receivePO(po,[{id:'t1l',qty:5}],0,null);
  ok('V3 PO-3','remaining owed shown after receiving (=500, no payment)', approx(s.poRemaining(po),500), 'got '+s.poRemaining(po));
  s.addPoPayment(po,{amount:200,note:'Partial'});
  ok('V3 PO-3','remaining updates after a payment (=300)', approx(s.poRemaining(po),300), 'got '+s.poRemaining(po));
  // V3 PO#4 — payments editable + changed flag + total
  const pid=po.payments[0].id;
  ok('V3 PO-4','payment starts unchanged', po.payments[0].edited===false);
  s.updatePoPayment(po,pid,{amount:250});
  ok('V3 PO-4','editing a payment sets the changed flag', po.payments[0].edited===true);
  s.addPoPayment(po,{amount:50,note:'Final'});
  ok('V3 PO-4','payments total sums all payments (250+50=300)', approx(s.poPaymentsTotal(po),300), 'got '+s.poPaymentsTotal(po));
  // V4 PO#5 — no payment when fully paid
  s.addPoPayment(po,{amount:200,note:'Top-up'}); // total 500 = goods
  ok('V4 PO-5','remaining reaches 0 when fully paid', approx(s.poRemaining(po),0), 'got '+s.poRemaining(po));
}
ok('V4 PO-5','record-payment is gated by remaining > 0 (UI)', PO.includes('store.poRemaining(cur) > 0'));
// V4 PO#1 — group line on a PO is one line that scales every member into stock on receive
{
  const po=s.purchaseOrders.find(p=>p.id==='po-193'); // seeded group line: VS8 BP Device Kit x5
  ok('V4 PO-1','PO group line scales goods (5 x kit unit cost)', approx(s.poGoodsTotal(po), 5*(210+11.5+34)), 'got '+s.poGoodsTotal(po));
  const a=onhand('i-bpdev'), b=onhand('i-bphose'), c=onhand('i-spo2');
  s.receivePO(po,[{id:po.items[0].id,qty:5}],0,null);
  ok('V4 PO-1','receiving the group fans out +5 to every member', onhand('i-bpdev')===a+5 && onhand('i-bphose')===b+5 && onhand('i-spo2')===c+5);
}
// V4 PO#3 — deposit % calculates off the bill total via vendor rule (100% of 350 = 350)
s.updateVendor('v-techsource',{deposit_percent:100});
ok('V4 PO-3','100% vendor deposit on a $350 bill = $350', approx(s.poDepositFor('v-techsource',350),350), 'got '+s.poDepositFor('v-techsource',350));
// V4 PO#4 — Manage Vendors edits terms
s.updateVendor('v-edan',{pay_terms:'Net 60', email:'ap@edan.com'});
ok('V4 PO-4','Manage Vendors edits terms (EDAN -> Net 60)', s.vendors.find(v=>v.id==='v-edan').pay_terms==='Net 60' && s.vendors.find(v=>v.id==='v-edan').email==='ap@edan.com');
ok('V4 PO-4','Manage Vendors UI is wired', PO.includes('openManageVendors') && PO.includes('Manage Vendors'));
// V4 PO#2 — hide Record-Deposit after a deposit is recorded
{
  const po={id:'po-t2',po_number:s.nextPoNumber(),vendor_id:'v-medcarts',order_date:'2026-06-16',expected_date:'',status:'open',progress:'',sent:null,notes:'',landed_costs:[],payments:[],deposit:300,items:[{id:'t2l',kind:'item',vendor_item_id:'i-cart',name:'Care Cart — Standard',qty:1,qty_received:0,unit_cost:640}]};
  s.purchaseOrders.unshift(po);
  s.addPoPayment(po,{amount:300,note:'Deposit'});
  ok('V4 PO-2','a recorded deposit is detectable (drives hiding the option)', (po.payments||[]).some(p=>p.note==='Deposit'));
}
ok('V4 PO-2','deposit row is gated by no existing Deposit payment (UI)', PO.includes("p.note==='Deposit'") || PO.includes('p.note===’Deposit’'));
// V4 SO#2 — multiple-vendors-on-one-PO removed
ok('V4 SO-2','multi-vendor PO removed from the page', !PO.includes('multi_vendor'));
{
  const po={id:'po-t3',po_number:s.nextPoNumber(),vendor_id:'v-techsource',order_date:'2026-06-16',expected_date:'',status:'open',progress:'',sent:null,notes:'',landed_costs:[],payments:[],deposit:0,items:[{id:'t3a',kind:'item',vendor_item_id:'i-tab',name:'Tab',qty:1,qty_received:0,unit_cost:184},{id:'t3b',kind:'item',vendor_item_id:'i-mount',name:'Mount',qty:1,qty_received:0,unit_cost:19.75}]};
  s.purchaseOrders.unshift(po);
  const r=s.receivePO(po,po.items.map(l=>({id:l.id,qty:l.qty})),0,null);
  ok('V4 SO-2','a PO produces exactly one Vendor bill (single vendor)', r.billIds.length===1 && r.multi===false, 'bills='+r.billIds.length);
}

console.log('\n=== FLOW C — Sales Orders ===');
// V3 SO#1 — one recipient search finds any type
{
  const kinds=new Set(s.recipients.map(r=>r.kind));
  ok('V3 SO-1','one recipient search returns facility, regional, employee, provider', ['facility','regional','provider','employee'].every(k=>kinds.has(k)), [...kinds].join(','));
}
// V3 SO#2 — Google-style address lookup
ok('V3 SO-2','address line uses the autocomplete lookup component', SO.includes('AddressAutocomplete'));
// V3 SO#3 — landed cost adds up (PO vs SO reconcile)
{
  s.addItem({name:'Recon B',vendor_id:'v-techsource',item_type_id:'',cost:100,qty_onhand:0,threshold:0,bin_location:'Z-8',is_active:true});
  const it=s.items.find(i=>i.name==='Recon B');
  const po={id:'po-t4',po_number:s.nextPoNumber(),vendor_id:'v-techsource',order_date:'2026-06-16',expected_date:'',status:'open',progress:'',sent:null,notes:'',landed_costs:[{id:'lc',label:'Freight',amount:50}],payments:[],deposit:0,items:[{id:'t4l',kind:'item',vendor_item_id:it.id,name:'Recon B',qty:10,qty_received:0,unit_cost:100}]};
  s.purchaseOrders.unshift(po);
  const poTotal=s.poTotalWithLanded(po);
  s.receivePO(po,[{id:'t4l',qty:10}],s.poLandedTotal(po),null);
  const so={id:'so-t1',so_number:s.nextSoNumber(),recipient_type:'facility',recipient_id:'f-maple',ship_to_type:'facility',regional_id:null,facility_id:'f-maple',order_date:'2026-06-16',expected_date:'',delivery_method:'Freight',shipping_address:'Maple',shipping_cost:0,landed_costs:[],status:'in_progress',notes:'',backorder_of:null,attachments:[],groups:[],items:[{kind:'item',vendor_item_id:it.id,name:'Recon B',facility_id:'f-maple',qty:10,qty_shipped:0,shipped_cost_total:0,unit_cost:105}]};
  s.salesOrders.unshift(so);
  ok('V3 SO-3','SO goods reconciles with PO goods+landed (no longer off)', approx(s.soGoodsTotal(so),poTotal), 'SO='+s.soGoodsTotal(so)+' PO='+poTotal);
}
// V3 SO#4 — upload BOL on an SO; it shows under the facility
{
  s.addSoAttachment('so-142','BOL-strict-test.pdf','BOL');
  const docs=s.facilityShipmentDocs('f-maple');
  ok('V3 SO-4','an SO attachment (BOL) appears under the destination facility', docs.some(d=>d.name==='BOL-strict-test.pdf' && d.kind==='BOL'));
}
// V3 SO#5 — shipping slips: one order per page, numbered 1 of N
ok('V3 SO-5','shipping labels number multiples X of N', SO.includes('{{ L.x }} of {{ L.n }}'));
ok('V3 SO-5','shipping slips force one order per page (print CSS)', SO.includes('page-break-after'));

console.log('\n--- NOT YET IMPLEMENTED (planned, per approved V4 plan — reported, not failed) ---');
console.log('  PENDING  V4 Item Types (Single/Group/Assembly): IT-1..IT-5  [Phases 1-3]');
console.log('  PENDING  V4 Assemblies (cart build/auto-fill/edit): AS-1..AS-7  [Phase 2-3]');
console.log('  PENDING  V4 SO-1 (ship a specific asset/assembly unit from an SO)  [Phase 4]');

console.log('\n======================================');
console.log('RESULT: '+pass+' passed, '+fail+' failed');
if (fail){ console.log('FAILURES:'); fails.forEach(f=>console.log('  - '+f)); process.exit(1); }
