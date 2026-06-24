// V4 Phase-0 checks — vendor management, deposit %, group-on-PO, fully-paid logic.
globalThis.sessionStorage = { _d:{}, getItem(k){return this._d[k]??null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];} };
import { createPinia, setActivePinia } from 'pinia';
import { useWarehouseStore } from './warehouse.mjs';
setActivePinia(createPinia());
const s = useWarehouseStore();
let pass=0, fail=0; const fails=[];
const approx=(a,b,e=0.011)=>Math.abs(a-b)<=e;
function ok(n,c,x=''){ if(c){pass++;console.log('  PASS  '+n);} else {fail++;fails.push(n+(x?' — '+x:''));console.log('  FAIL  '+n+(x?' — '+x:''));} }
const onhand=(id)=>(s.itemById(id)||{}).qty_onhand;

console.log('\n=== PO-3 / PO-4: Manage Vendors drives the deposit % ===');
{
  ok('TechSource starts at 0% deposit', s.vendors.find(v=>v.id==='v-techsource').deposit_percent===0);
  s.updateVendor('v-techsource', { deposit_percent: 100 });
  ok('updateVendor sets 100%', s.vendors.find(v=>v.id==='v-techsource').deposit_percent===100);
  ok('100% deposit on a $350 order = $350 (bug fixed)', approx(s.poDepositFor('v-techsource', 350), 350), 'got '+s.poDepositFor('v-techsource',350));
  s.updateVendor('v-techsource', { email: 'new@techsource.io' }); // partial patch
  ok('partial vendor edit keeps deposit %', s.vendors.find(v=>v.id==='v-techsource').deposit_percent===100 && s.vendors.find(v=>v.id==='v-techsource').email==='new@techsource.io');
}

console.log('\n=== PO-1: group line on a PO scales + receives into members ===');
{
  const exp = s.expandGroup('g-starter', 1); // tab1,mount1,stylus1,basket2,mdm1
  const members = Object.keys(exp).map(k=>({ vendor_item_id:k, name:(s.itemById(k)||{}).name, per_group:exp[k], unit_cost:(s.itemById(k)||{}).cost||0 }));
  const expectedUnit = members.reduce((t,m)=>t+m.per_group*m.unit_cost,0);
  const po = { id:'po-g', po_number:s.nextPoNumber(), vendor_id:'v-techsource', order_date:'2026-06-16', expected_date:'', status:'open', progress:'Not started', sent:null, notes:'', landed_costs:[], payments:[], deposit:0,
    items:[{ id:'gl', kind:'group', group_id:'g-starter', name:'Starter Kit A', qty:4, qty_received:0, members }] };
  s.purchaseOrders.unshift(po);
  ok('group line goods = 4 x kit unit cost', approx(s.poLineGoods(po.items[0]), 4*expectedUnit), 'got '+s.poLineGoods(po.items[0]));
  const basketB = onhand('i-basket');
  s.receivePO(po, [{ id:'gl', qty:4 }], 0, null);
  ok('receiving 4 kits adds 8 baskets (per_group 2 x 4)', onhand('i-basket') === basketB + 8, `${basketB}->${onhand('i-basket')}`);
  ok('PO marked received', po.status==='received', po.status);
}

console.log('\n=== PO-5: remaining hits zero when fully paid ===');
{
  s.addItem({ name:'Paid Widget', vendor_id:'v-techsource', item_type_id:'', cost:50, qty_onhand:0, threshold:0, bin_location:'P-1', is_active:true });
  const it = s.items.find(i=>i.name==='Paid Widget');
  const po = { id:'po-paid', po_number:s.nextPoNumber(), vendor_id:'v-techsource', order_date:'2026-06-16', expected_date:'', status:'open', progress:'Not started', sent:null, notes:'', landed_costs:[], payments:[], deposit:0,
    items:[{ id:'pw', kind:'item', vendor_item_id:it.id, name:'Paid Widget', qty:10, qty_received:0, unit_cost:50 }] };
  s.purchaseOrders.unshift(po);
  ok('remaining = goods (500) before payment', approx(s.poRemaining(po), 500));
  s.addPoPayment(po, { amount: 500, note:'Final' });
  ok('remaining = 0 when fully paid (hides record-payment)', approx(s.poRemaining(po), 0), 'got '+s.poRemaining(po));
}

console.log('\n======================================');
console.log('RESULT: '+pass+' passed, '+fail+' failed');
if (fail){ console.log('FAILURES:'); fails.forEach(f=>console.log('  - '+f)); process.exit(1); }
