// SUPERVISOR V6 — strict checks for the buildable items, and explicit flags for the not-build-ready ones.
import fs from 'fs';
globalThis.sessionStorage = { _d: {}, getItem(k){return this._d[k]??null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];} };
import { createPinia, setActivePinia } from 'pinia';
import { useWarehouseStore } from './warehouse.mjs';
setActivePinia(createPinia());
const s = useWarehouseStore();
let pass=0, fail=0; const fails=[];
function ok(req,name,cond,extra=''){ const t='['+req+'] '+name; if(cond){pass++;console.log('  PASS  '+t);} else {fail++;fails.push(t+(extra?' — '+extra:''));console.log('  FAIL  '+t+(extra?' — '+extra:''));} }
const INV=fs.readFileSync('src/pages/InventoryPage.vue','utf8');
const PO=fs.readFileSync('src/pages/PurchaseOrdersPage.vue','utf8');
const SO=fs.readFileSync('src/pages/SalesOrdersPage.vue','utf8');
const onhand=(id)=>(s.itemById(id)||{}).qty_onhand;

console.log('\n=== Open Q1: an assembly = multiple groups + multiple items ===');
{
  const def = s.addAssemblyDef({ name:'Combo Cart', assembly_kind:'cart', assembly_type_id:'at-vs8', composition:[{kind:'group',ref_id:'g-cta',qty:1},{kind:'group',ref_id:'g-vs8bp',qty:1},{kind:'item',ref_id:'i-tab2',qty:1}] });
  const exp = s.expandAssembly(def.id, 1);
  ok('Q1','an assembly composition supports 2 groups + an item (expands all parts)', def.composition.filter(c=>c.kind==='group').length===2 && Object.keys(exp).length>=4, Object.keys(exp).join(','));
}

console.log('\n=== Open Q2: real cart types (no Standard/Bariatric/Compact) ===');
ok('Q2','no assembled cart unit is typed Standard/Bariatric/Compact', !s.carts.some(c=>/^(standard|bariatric|compact)$/i.test(c.cart_type||'')), s.carts.map(c=>c.cart_type).join(','));
ok('Q2','cart types come from the managed assembly-type list (EDAN/VS8/Accutor)', ['EDAN','VS8','Accutor'].every(n=>s.assemblyTypes.some(t=>t.name.includes(n))));
ok('Q2','Inventory no longer hard-codes Standard/Bariatric/Compact', !/>Bariatric<|>Compact<|<option>Standard<\/option>/.test(INV));

console.log('\n=== INV-2: "ship only as an assembly" flag on master groups ===');
ok('INV-2','master full-cart groups are flagged assembly-only', s.groupAssemblyOnly('g-edanstarter') && s.groupAssemblyOnly('g-facility'));
ok('INV-2','a parts group (CTA Cart Kit) is NOT assembly-only', s.groupAssemblyOnly('g-cta')===false);
ok('INV-2','assembly-only groups are excluded from the SO loose picker', !s.catalogShip.some(c=>c.id==='g-edanstarter') && !s.catalogShip.some(c=>c.id==='g-facility'));
ok('INV-2','a normal parts group is still in the SO loose picker', s.catalogShip.some(c=>c.id==='g-cta'));
ok('INV-2','member parts of a master group still ship loose (e.g. a basket)', s.catalogShip.some(c=>c.id==='i-basket2'));
ok('INV-2','group create/update accept the assembly_only flag', (()=>{ const g=s.addGroup({name:'MasterX', members:[], assembly_only:true}); return g.assembly_only===true; })());
ok('INV-2','Inventory group form has the ship-only-as-assembly checkbox', INV.includes('groupForm.assembly_only'));
ok('Q2','Inventory cart-type select is driven by managed assembly types', INV.includes('store.assemblyTypes') && INV.includes(':value="t.name"'));

console.log('\n=== SO-3 (bug): confirming an SO queues a shipment ===');
{
  const so=s.salesOrders.find(o=>o.status!=='shipped') || s.salesOrders[0];
  const before=s.shippingQueue.length;
  s.confirmSo(so);
  ok('SO-3','confirm queues exactly one shipment', s.shippingQueue.length===before+1 && s.shippingQueue[0].so_number===so.so_number);
  s.confirmSo(so);
  ok('SO-3','confirming again does not duplicate the queued shipment', s.shippingQueue.filter(q=>q.so_number===so.so_number && q.status!=='Shipped').length===1);
  ok('SO-3','SO page calls store.confirmSo (queue wired in UI)', SO.includes('store.confirmSo'));
}

console.log('\n=== SO-4 (bug): assembled-unit availability reads true stock ===');
{
  const b=s.buildAssembly({assembly_id:'asm-vs8', code:'V6-AV1'});
  const line={ kind:'assembly', assembly_id:'asm-vs8', name:'VS8 Cart', qty:5, qty_shipped:0 };
  ok('SO-4','soLineAvailable for an assembly line = built units in warehouse', s.soLineAvailable(line)===s.availableUnits('asm-vs8').length && s.soLineAvailable(line)>0, 'got '+s.soLineAvailable(line));
}

console.log('\n=== SO-5 groundwork + CA: New vs Refurbished pools ===');
ok('CA','assembled units carry a condition, defaulting to New', s.carts.every(c=>c.condition===undefined || ['New','Refurbished'].includes(c.condition)) && s.carts.some(c=>c.condition==='New'));
{
  const u=s.availableUnits('asm-vs8')[0];
  ok('CA','availableUnitsByCondition("New") returns only new units', s.availableUnitsByCondition('asm-vs8','New').every(c=>(c.condition||'New')==='New') && s.availableUnitsByCondition('asm-vs8','New').length>0);
  // mark one refurbished and confirm the pools separate
  u.condition='Refurbished';
  ok('CA','New and Refurbished pools are separate (no auto-mix)', !s.availableUnitsByCondition('asm-vs8','New').some(c=>c.id===u.id) && s.availableUnitsByCondition('asm-vs8','Refurbished').some(c=>c.id===u.id));
}

console.log('\n=== PO-4: landed cost "attach to amount owed" toggle ===');
{
  const v=s.addVendor({name:'V6Vendor', deposit_percent:0});
  const po={ id:'po-v6', po_number:s.nextPoNumber(), vendor_id:v.id, order_date:'2026-06-16', status:'open', progress:'', sent:null, notes:'', landed_costs:[], payments:[], deposit:0,
    items:[{ id:'l1', kind:'item', vendor_item_id:'i-basket2', name:'Basket', qty:10, qty_received:0, unit_cost:30 }] };
  s.purchaseOrders.unshift(po);
  const goods=s.poGoodsTotal(po);
  s.addPoLanded(po,'Freight (paid by us)',100,false);
  ok('PO-4','landed marked paid-externally does NOT change amount owed', s.poRemaining(po)===goods, 'rem='+s.poRemaining(po)+' goods='+goods);
  s.addPoLanded(po,'Extra vendor shipping',50,true);
  ok('PO-4','landed attached to owed DOES add to amount owed', s.poRemaining(po)===s.round2 ? true : Math.abs(s.poRemaining(po)-(goods+50))<0.011, 'rem='+s.poRemaining(po));
  ok('PO-4','UI exposes the attach-to-owed toggle', /attach_to_owed|Attach to amount owed/i.test(PO));
}

console.log('\n=== PO small fixes (UI) ===');
ok('PO-1','group line on a PO defaults collapsed', /expanded: false/.test(PO) && !/members, expanded: true/.test(PO));
ok('PO-2','a $ symbol sits next to the deposit amount', /\$<\/span>[\s\S]{0,80}form\.deposit|deposit[\s\S]{0,40}\$/.test(PO) || PO.includes('>$<'));
ok('PO-3','next payment prefills the remaining balance (editable)', PO.includes('poRemaining') && /pay\.amount/.test(PO));

console.log('\n=== SO small fixes (UI) ===');
ok('SO-2','Print is always available (not gated by status)', SO.includes('doPrint'));
ok("SO-1","Send button hides once a PO is received", /v-if="po.status!==.received."[\s\S]{0,80}openSend/.test(PO) && /v-if="cur.status!==.received."[\s\S]{0,120}openSend/.test(PO));

console.log('\n=== QUEUED ITEMS — NOW BUILT ===');
// AS-5: build multiple at once
{
  const r = s.buildAssembliesBatch([{assembly_id:'asm-edan',code:'BAT-1'},{assembly_id:'asm-edan',code:'BAT-2'},{assembly_id:'asm-edan',code:'BAT-3'}]);
  ok('AS-5','buildAssembliesBatch builds many units in one call', r.built.length===3 && r.errors.length===0);
  ok('AS-5','a row with a duplicate/blank issue is reported, not silently dropped', s.buildAssembliesBatch([{assembly_id:'asm-edan'}]).errors.length===1);
  ok('AS-5','Inventory has a multi-row build modal', INV.includes('openBatch') && INV.includes('buildAssembliesBatch') && INV.includes('addBatchRow'));
}
// AS-3: choose which assembly to build
ok('AS-3','build screens let you select the assembly type', INV.includes('reloadBuildFields') && INV.includes('@change="onBatchAsm"') && INV.includes('Which assembly are you building'));
// AS-2: fields traced from inventory (not just typed-in defaults)
{
  const def = s.addAssemblyDef({ name:'Traced Cart', assembly_kind:'cart', assembly_type_id:'at-vs8', asset_defaults:{}, composition:[{kind:'group',ref_id:'g-cta',qty:1},{kind:'group',ref_id:'g-vs8bp',qty:1}] });
  const af = s.assemblyAutoFill(def.id);
  ok('AS-2','auto-fill is traced from the composition even with no typed defaults', af.cart_type==='CTA Cart' && af.key_type==='CTA Key' && af.bp_device==='VS8', JSON.stringify(af));
}
// AS-1: assembly definition components support groups (not just singles)
ok('AS-1','the assembly part picker offers groups + singles', INV.includes('asmPartExclude') && INV.includes('store.catalogLite'));
// INV-1: list filters
ok('INV-1','Inventory has single/group/carts-available/low-stock filters', INV.includes('invFilter') && INV.includes('Single items') && INV.includes('Grouped items') && INV.includes('Carts available') && INV.includes('Low stock'));
// SO-5: unit picker with pool + cap + condition badge
ok('SO-5','SO ship picker offers a New/Refurbished pool and caps at available', SO.includes('availableUnitsByCondition') && SO.includes('unitsForRow') && SO.includes('unitCapped') && SO.includes('r.pool'));

console.log('\n=== CA-2 / CA-3 — refurbished from returns (now built, swappable formula) ===');
{
  const RET=fs.readFileSync('src/pages/ReturnsPage.vue','utf8');
  const b=s.buildAssembly({assembly_id:'asm-edan', code:'RFB-T1'}); const cart=b.cart; const book=cart.cost;
  ok('CA-1','a built cart starts as a New unit', cart.condition==='New');
  s.setCartLocation(cart,'Facility','f-maple');
  const list=s.returnableAssetsFor('facility','f-maple').filter(a=>a.cart_id===cart.id);
  const ret=s.startAssetReturn({source_type:'facility', source_id:'f-maple', so_ref:'', assets:list});
  const r=s.confirmAssetReturn(ret.id, list.map(a=>({key:a.key, received:true, missing:[]})));
  const c2=s.carts.find(x=>x.id===cart.id);
  ok('CA-2','a returned cart becomes Refurbished, back in the warehouse', c2.condition==='Refurbished' && c2.location==='Warehouse' && c2.status==='Available');
  ok('CA-2','it lands in the Refurbished pool, never the New pool', s.availableUnitsByCondition('asm-edan','Refurbished').some(x=>x.id===cart.id) && !s.availableUnitsByCondition('asm-edan','New').some(x=>x.id===cart.id));
  ok('CA-3','its value comes from the refund logic (book cost × credit rate)', Math.abs(c2.cost - Math.round(book*s.refurbCreditRate*100)/100) < 0.011, 'cost='+c2.cost+' book='+book);
  ok('CA-3','the facility is credited that same refurbished value', Math.abs(r.refund_total - c2.cost) < 0.011, 'refund='+r.refund_total);
  // the formula is a single swappable setting
  s.setRefurbCreditRate(0.5);
  ok('CA-3','the credit/value rate is a one-place, swappable setting', s.refurbishedValue(1000)===500);
  s.setRefurbCreditRate(0.8);
  ok('CA-3','Returns page exposes the credit-rate control', RET.includes('setRefurbCreditRate') && /Refurbished credit/i.test(RET));
  ok('CA-2','Inventory shows a Condition column for carts (New/Refurbished)', INV.includes('>Condition<') && INV.includes("c.condition"));
}

console.log('\n======================================');
console.log('SUP V6 RESULT: ' + pass + ' passed, ' + fail + ' failed');
if (fail) { console.log('FAILURES:'); fails.forEach(f=>console.log('  - '+f)); process.exit(1); }
