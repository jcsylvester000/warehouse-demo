// DOCUMENTATION ALIGNMENT — each assertion is a concrete claim made in the supervisor documents,
// checked against the actual application (store behaviour + UI strings). If a claim fails, the
// app and the docs disagree and must be reconciled.
import fs from 'fs';
globalThis.sessionStorage = { _d: {}, getItem(k){return this._d[k]??null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];} };
import { createPinia, setActivePinia } from 'pinia';
import { useWarehouseStore } from './warehouse.mjs';
setActivePinia(createPinia());
const s = useWarehouseStore();
const INV = fs.readFileSync('src/pages/InventoryPage.vue','utf8');
const PO  = fs.readFileSync('src/pages/PurchaseOrdersPage.vue','utf8');
const SO  = fs.readFileSync('src/pages/SalesOrdersPage.vue','utf8');
const AST = fs.readFileSync('src/pages/AssetsPage.vue','utf8');

let pass=0, fail=0; const fails=[];
const approx=(a,b,e=0.011)=>Math.abs(a-b)<=e;
function ok(doc,name,cond,extra=''){ const t='('+doc+') '+name; if(cond){pass++;console.log('  PASS  '+t);} else {fail++;fails.push(t+(extra?' — '+extra:''));console.log('  FAIL  '+t+(extra?' — '+extra:''));} }
const onhand=(id)=>(s.itemById(id)||{}).qty_onhand;

console.log('\n=== Claims in “What’s New — Asset Model Amendment” ===');
ok("WN","“Only assemblies become tracked assets … a single is never an asset”", s.itemIsAsset('i-laptop')===false && s.itemIsAsset('i-tab')===false && s.itemIsAsset('i-cable-usb')===false);
ok("WN","“laptops/gameshows carry an only-ship-as-an-assembly flag”", s.itemAssemblyOnly('i-laptop') && s.itemAssemblyOnly('i-gameshow'));
ok("WN","“cannot be added to a Sales Order on its own”", !s.catalogShip.some(c=>c.id==='i-laptop') && !s.catalogShip.some(c=>c.id==='i-gameshow'));
ok("WN","“assembling means entering RAM, make, price, serial”", JSON.stringify(s.assemblyById('asm-laptop').fields)===JSON.stringify(['RAM','Make / Company','Price','Serial No.']));
ok("WN","“receive 20 laptops, assemble none → none shippable”", onhand('i-laptop2')>0 && s.availableUnits('asm-laptop2').length===0);
ok("WN","“no pop-up asking for asset info at receiving”", !/Enter asset info/i.test(PO) && PO.includes('commitReceive(null)'));
ok("WN","“Cart assembly auto-fills VS8 → CTA Cart / CTA Key / VS8”", (()=>{const a=s.assemblyAutoFill('asm-vs8');return a.cart_type==='CTA Cart'&&a.key_type==='CTA Key'&&a.bp_device==='VS8';})());
ok("WN","“A Cart Code is required / A Unit Code is required”", !!s.buildAssembly({assembly_id:'asm-vs8'}).error && !!s.buildAssembly({assembly_id:'asm-laptop'}).error);
{
  // “order 20 of every cart part and assemble 10 → 10 carts + 10 of each remaining part”
  const parts=['i-edancart','i-key','i-basket2','i-tab']; const before={}; parts.forEach(p=>before[p]=onhand(p));
  const po={ id:'po-wn', po_number:s.nextPoNumber(), vendor_id:'v-edan', order_date:'2026-06-16', expected_date:'', status:'open', progress:'', sent:null, notes:'', landed_costs:[], payments:[], deposit:0, items: parts.map((p,i)=>({id:'wl'+i, kind:'item', vendor_item_id:p, name:(s.itemById(p)||{}).name, qty:20, qty_received:0, unit_cost:(s.itemById(p)||{}).cost||0})) };
  s.purchaseOrders.unshift(po); s.receivePO(po, po.items.map(l=>({id:l.id,qty:20})),0,null);
  let built=0; for(let i=0;i<10;i++){ if(!s.buildAssembly({assembly_id:'asm-edan', code:'WN-E'+i}).error) built++; }
  ok("WN","“assemble 10 → 10 carts + 10 of each remaining part”", built===10 && parts.every(p=>onhand(p)===before[p]+10));
}
{
  const exp=s.assemblyUnitCost('asm-vs8'); const r=s.buildAssembly({assembly_id:'asm-vs8', code:'WN-V1'});
  ok("WN","“Landed cost carries into the assembled unit”", approx(r.cart.cost, exp), 'unit='+r.cart.cost+' exp='+exp);
  const cartSO={id:'so-wn1', so_number:s.nextSoNumber(), recipient_type:'facility', recipient_id:'f-maple', ship_to_type:'facility', regional_id:'reg-rosa', facility_id:'f-maple', order_date:'2026-06-16', expected_date:'', delivery_method:'Freight', shipping_address:'M', shipping_cost:0, landed_costs:[], status:'in_progress', notes:'', backorder_of:null, attachments:[], groups:[], items:[{kind:'assembly', assembly_id:'asm-vs8', name:'VS8 Cart', facility_id:'f-maple', qty:1, qty_shipped:0}]};
  s.salesOrders.unshift(cartSO); s.shipSO(cartSO,[{idx:0,unit_ids:[r.cart.id]}],[]);
  const c2=s.carts.find(c=>c.id===r.cart.id);
  ok("WN","“Carts → assigned to facility and Regional”", c2.location==='Facility'&&c2.facility_id==='f-maple'&&c2.regional_id==='reg-rosa');
  const lap=s.buildAssembly({assembly_id:'asm-laptop', code:'WN-L1', fields:{'RAM':'8 GB'}}).cart;
  const empSO={id:'so-wn2', so_number:s.nextSoNumber(), recipient_type:'employee', recipient_id:'u-carl', ship_to_type:'facility', regional_id:null, facility_id:'f-maple', order_date:'2026-06-16', expected_date:'', delivery_method:'Courier', shipping_address:'M', shipping_cost:0, landed_costs:[], status:'in_progress', notes:'', backorder_of:null, attachments:[], groups:[], items:[{kind:'assembly', assembly_id:'asm-laptop', name:'Dell Latitude Laptop', facility_id:'f-maple', qty:1, qty_shipped:0}]};
  s.salesOrders.unshift(empSO); const uaB=s.userAssets.length; s.shipSO(empSO,[{idx:0,unit_ids:[lap.id],employee_id:'u-carl'}],[]);
  ok("WN","“Laptops/Gameshows → assigned to the employee”", s.userAssets.length===uaB+1 && s.userAssets[0].user==='Carl Chen');
}
ok("WN","“group on a PO is one line whose qty scales every part”", PO.includes("kind: 'group', group_id: id"));
ok("WN","“deposit calculates off the full bill total (100% of $350 = $350)”", s.poDepositFor((s.addVendor({name:'WNDep',deposit_percent:100}).id),350)===350);
ok("WN","“Record Deposit disappears once a deposit is recorded”", PO.includes("!(cur.payments||[]).some(p=>p.note==='Deposit')"));
ok("WN","“Record Payment disappears once the PO is fully paid”", PO.includes('store.poRemaining(cur) > 0') && /Paid in full/i.test(PO));
ok("WN","“Manage Vendors lets you change a vendor’s terms”", /Manage Vendors/i.test(PO) && typeof s.updateVendor==='function');
ok("WN","“column-header row stays pinned while you scroll”", /sticky top-0/.test(INV));
ok("WN","“add an assembly … pick the exact built unit; assembly-only can’t be added loose”", SO.includes('store.catalogShip') && SO.includes('store.availableUnits(l.assembly_id)'));
ok("WN","“the multiple-vendors-on-one-PO feature is gone”", !/multi_vendor:\s*true/.test(PO));

console.log('\n=== Claims in “User Guide Addendum (Item Types & Assemblies)” ===');
ok("ADD","“Add → Single / Group / Assembly”", INV.includes('>Single item<') && INV.includes('>Group<') && INV.includes('>Assembly '));
ok("ADD","“A Single has a can-only-be-shipped-as-an-assembly checkbox”", INV.includes('itemForm.assembly_only') && /only be shipped as an assembly/i.test(INV));
ok("ADD","“Define a Cart assembly … auto-fill defaults Cart Type, Key Type, BP Device”", INV.includes('asmForm.asset_defaults.cart_type') && INV.includes('asmForm.asset_defaults.key_type') && INV.includes('asmForm.asset_defaults.bp_device'));
ok("ADD","“Define a Single-item assembly … choose the source (assembly-only) item”", INV.includes('store.items.filter(i=>i.assembly_only)'));
ok("ADD","“… list the info fields to capture”", INV.includes('asmForm.fields.push'));
ok("ADD","“Cart assembly / Single-item assembly choice on the Add screen”", INV.includes('Cart assembly') && INV.includes('Single-item assembly'));
ok("ADD","“Manage cart types from the Carts tab”", /Manage cart types/i.test(INV));
ok("ADD","“cart types EDAN / VS8 / Accutor”", ['EDAN','VS8','Accutor'].every(n=>s.assemblyTypes.some(t=>t.name.includes(n))));
ok("ADD","“employee-held assets appear under Assets ▸ User Assets”", AST.includes('User Assets') && AST.includes('assetsForEmployee'));
ok("ADD","“assembling a single-item consumes one source from inventory”", (()=>{const b=onhand('i-laptop'); const r=s.buildAssembly({assembly_id:'asm-laptop', code:'ADD-L1', fields:{}}); return !r.error && onhand('i-laptop')===b-1;})());

console.log('\n=== Claims in “User Guide & Journeys” (updated) ===');
ok("UG","“One PO is for a single vendor” (no multi-vendor control)", !/Allow multiple vendors/i.test(PO));
ok("UG","“Inventory lists single items, groups, and assemblies”", ['item','group','assembly'].every(k=>s.catalog.some(c=>c.kind===k)));

console.log('\n======================================');
console.log('DOC ALIGNMENT RESULT: ' + pass + ' passed, ' + fail + ' failed');
if (fail) { console.log('MISALIGNMENTS:'); fails.forEach(f=>console.log('  - '+f)); process.exit(1); }
