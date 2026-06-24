// Requirement audit harness — verifies the supervisor's logic-level requirements.
globalThis.sessionStorage = { _d:{}, getItem(k){return this._d[k]??null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];} };
import { createPinia, setActivePinia } from 'pinia';
import { useWarehouseStore } from './warehouse.mjs';
setActivePinia(createPinia());
const s = useWarehouseStore();
let pass=0, fail=0; const fails=[];
const approx=(a,b,e=0.011)=>Math.abs(a-b)<=e;
function ok(name,cond,extra=''){ if(cond){pass++;console.log('  PASS  '+name);} else {fail++;fails.push(name+(extra?' — '+extra:''));console.log('  FAIL  '+name+(extra?' — '+extra:''));} }
const onhand=(id)=>(s.itemById(id)||{}).qty_onhand;

console.log('\n=== SO Groups #1: group is ONE line whose qty scales every member ===');
{
  // g-starter members: tab1, mount1, stylus1, basket2, mdm1  (basket is the "double" item)
  const exp = s.expandGroup('g-starter',1);
  const members = Object.keys(exp).map(k=>({ vendor_item_id:k, name:(s.itemById(k)||{}).name, per_group:exp[k] }));
  const line = { kind:'group', group_id:'g-starter', name:'Starter Kit A', members };
  const eff = s.soLineEffective(line, 5); // order 5 of the group
  const byId = Object.fromEntries(eff.map(e=>[e.vendor_item_id, e.qty]));
  ok('order 5 groups -> single items become 5', byId['i-tab']===5 && byId['i-mount']===5 && byId['i-mdm']===5, JSON.stringify(byId));
  ok('order 5 groups -> the "double" (basket x2) becomes 10', byId['i-basket']===10, 'basket='+byId['i-basket']);
  ok('group line unit cost = sum(per_group * fifo)', approx(s.soLineUnitCost(line), members.reduce((t,m)=>t+m.per_group*s.fifoUnitCost(m.vendor_item_id),0)));

  // ship a group line end-to-end: every member decrements by per_group * qty
  const so = { id:'so-grp', so_number:s.nextSoNumber(), recipient_type:'facility', recipient_id:'f-maple', ship_to_type:'facility', regional_id:null, facility_id:'f-maple', order_date:'2026-06-16', expected_date:'', delivery_method:'Freight', shipping_address:'Maple', shipping_cost:0, landed_costs:[], status:'in_progress', notes:'', backorder_of:null, attachments:[], groups:[],
    items:[{ kind:'group', group_id:'g-starter', name:'Starter Kit A', facility_id:'f-maple', qty:2, qty_shipped:0, shipped_cost_total:0, shipped_detail:[], members }] };
  s.salesOrders.unshift(so);
  const tabB=onhand('i-tab'), basketB=onhand('i-basket');
  s.shipSO(so, [{ idx:0, qty:2, employee_id:'' }], []);
  ok('shipping 2 groups draws 2 tabs', onhand('i-tab')===tabB-2, `${tabB}->${onhand('i-tab')}`);
  ok('shipping 2 groups draws 4 baskets (2x2)', onhand('i-basket')===basketB-4, `${basketB}->${onhand('i-basket')}`);
}

console.log('\n=== PO #1: deposit auto-populates from vendor rule, stays editable ===');
{
  // medcarts deposit_percent = 30
  ok('poDepositFor(medcarts, 1000) = 300', approx(s.poDepositFor('v-medcarts',1000),300), 'got '+s.poDepositFor('v-medcarts',1000));
  ok('poDepositFor(techsource=0%, 1000) = 0', approx(s.poDepositFor('v-techsource',1000),0));
}

console.log('\n=== PO #3 + #4: remaining-after-receiving, editable payments + changed flag + total ===');
{
  s.addItem({ name:'Widget X', vendor_id:'v-techsource', item_type_id:'', cost:100, qty_onhand:0, threshold:0, bin_location:'Z-1', is_active:true });
  const widget = s.items.find(i=>i.name==='Widget X');
  const po = { id:'po-pay', po_number:s.nextPoNumber(), vendor_id:'v-techsource', multi_vendor:false, order_date:'2026-06-16', expected_date:'', status:'open', progress:'Not started', sent:null, notes:'', landed_costs:[], payments:[], deposit:0,
    items:[{ id:'pl1', vendor_item_id:widget.id, name:'Widget X', vendor_id:'v-techsource', qty:10, qty_received:0, unit_cost:100 }] };
  s.purchaseOrders.unshift(po);
  ok('goods total = 1000', approx(s.poGoodsTotal(po),1000));
  s.addPoPayment(po,{amount:400,note:'Deposit'});
  ok('remaining owed after a 400 payment = 600', approx(s.poRemaining(po),600), 'got '+s.poRemaining(po));
  s.receivePO(po, [{id:'pl1', qty:10}], 0, null);
  ok('remaining still computed after receiving (=600)', approx(s.poRemaining(po),600), 'got '+s.poRemaining(po));
  const payId = po.payments[0].id;
  ok('payment starts unchanged (edited=false)', po.payments[0].edited===false);
  s.updatePoPayment(po, payId, { amount: 450 });
  ok('editing a payment flips the changed flag', po.payments[0].edited===true);
  s.addPoPayment(po,{amount:150,note:'Final'});
  ok('payments total sums all payments (450+150=600)', approx(s.poPaymentsTotal(po),600), 'got '+s.poPaymentsTotal(po));
}

console.log('\n=== SO #3: landed cost reconciles — PO total (goods+landed) == SO goods for same items ===');
{
  s.addItem({ name:'Recon Item', vendor_id:'v-techsource', item_type_id:'', cost:100, qty_onhand:0, threshold:0, bin_location:'Z-2', is_active:true });
  const it = s.items.find(i=>i.name==='Recon Item');
  const po = { id:'po-recon', po_number:s.nextPoNumber(), vendor_id:'v-techsource', multi_vendor:false, order_date:'2026-06-16', expected_date:'', status:'open', progress:'Not started', sent:null, notes:'', landed_costs:[{id:'lc1',label:'Freight',amount:50}], payments:[], deposit:0,
    items:[{ id:'rl1', vendor_item_id:it.id, name:'Recon Item', vendor_id:'v-techsource', qty:10, qty_received:0, unit_cost:100 }] };
  s.purchaseOrders.unshift(po);
  const poTotal = s.poTotalWithLanded(po); // 1000 + 50 = 1050
  ok('PO total incl landed = 1050', approx(poTotal,1050), 'got '+poTotal);
  s.receivePO(po, [{id:'rl1', qty:10}], s.poLandedTotal(po), null); // landed 50 -> +5/unit
  ok('received FIFO unit cost = base+landed = 105', approx(s.fifoUnitCost(it.id),105), 'got '+s.fifoUnitCost(it.id));
  const so = { id:'so-recon', so_number:s.nextSoNumber(), recipient_type:'facility', recipient_id:'f-maple', ship_to_type:'facility', regional_id:null, facility_id:'f-maple', order_date:'2026-06-16', expected_date:'', delivery_method:'Freight', shipping_address:'Maple', shipping_cost:0, landed_costs:[], status:'in_progress', notes:'', backorder_of:null, attachments:[], groups:[],
    items:[{ kind:'item', vendor_item_id:it.id, name:'Recon Item', facility_id:'f-maple', qty:10, qty_shipped:0, shipped_cost_total:0, shipped_detail:[], unit_cost:105 }] };
  s.salesOrders.unshift(so);
  ok('SO goods = PO total incl landed (1050) — landed rides along, no longer "off"', approx(s.soGoodsTotal(so),poTotal), 'SO='+s.soGoodsTotal(so)+' PO='+poTotal);
}

console.log('\n=== SO #1: single recipient search returns ALL types ===');
{
  const kinds = new Set(s.recipients.map(r=>r.kind));
  ok('recipients include facility, regional, provider, employee', ['facility','regional','provider','employee'].every(k=>kinds.has(k)), [...kinds].join(','));
}

console.log('\n=== SO #4: SO attachments are visible under the destination Facility ===');
{
  const so = s.salesOrders.find(o=>o.id==='so-142'); // ships to f-maple, seeded w/ BOL + POD
  s.addSoAttachment('so-142','BOL-new-test.pdf','BOL');
  const docs = s.facilityShipmentDocs('f-maple');
  ok('facility view surfaces the SO BOL', docs.some(d=>d.name==='BOL-new-test.pdf' && d.kind==='BOL'), 'docs='+docs.map(d=>d.name).join(','));
  ok('facility view also surfaces proof-of-delivery', docs.some(d=>d.kind==='Proof of delivery'));
}

console.log('\n======================================');
console.log('RESULT: '+pass+' passed, '+fail+' failed');
if (fail){ console.log('FAILURES:'); fails.forEach(f=>console.log('  - '+f)); process.exit(1); }
