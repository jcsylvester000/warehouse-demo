// ASSET REGISTRY — verifies the real asset data (from the Cart List inventory) is modelled correctly
// and stays consistent with the supervisor amendment (carts → facility; IT → employee; holder = employee|facility).
import fs from 'fs';
globalThis.sessionStorage = { _d: {}, getItem(k){return this._d[k]??null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];} };
import { createPinia, setActivePinia } from 'pinia';
import { useWarehouseStore } from './warehouse.mjs';
setActivePinia(createPinia());
const s = useWarehouseStore();
let pass=0, fail=0; const fails=[];
function ok(req,name,cond,extra=''){ const t='['+req+'] '+name; if(cond){pass++;console.log('  PASS  '+t);} else {fail++;fails.push(t+(extra?' — '+extra:''));console.log('  FAIL  '+t+(extra?' — '+extra:''));} }

console.log('\n=== Seed loaded: all 8 classes present ===');
const CLASSES=['cart','laptop','gameshow','tablet','monitor','desktop','cellphone','ezpass'];
ok('SEED','registry holds thousands of real units', s.assetTotal>2000, 'got '+s.assetTotal);
CLASSES.forEach(k=>ok('SEED','class "'+k+'" has units', s.assetClassCount(k)>0, 'got '+s.assetClassCount(k)));
ok('SEED','carts are the largest class (~1,375)', s.assetClassCount('cart')>1000, 'got '+s.assetClassCount('cart'));
ok('SEED','legacy "Laptops old" folded into laptops', s.assetsOf('laptop').some(a=>a.legacy));

console.log('\n=== Cart field correction (Cart Type = wheel; BP Machine = edan/vs8/accutar) ===');
const carts=s.assetsOf('cart');
const ctypes=new Set(carts.map(c=>(c.cart_type||'').toLowerCase()).filter(Boolean));
const bps=new Set(carts.map(c=>(c.bp_machine||'').toLowerCase()).filter(Boolean));
ok('CART','Cart Type values are wheels (cta wheel / yellow / microlife)', [...ctypes].every(v=>/wheel|yellow|microlife/.test(v)), [...ctypes].join(','));
ok('CART','BP Machine values are edan / vs8 / accutar — NOT the cart type', [...bps].every(v=>/edan|vs8|accut/.test(v)), [...bps].join(','));
ok('CART','no cart mislabels EDAN/VS8 as its Cart Type', !carts.some(c=>/edan|vs8|accut/.test((c.cart_type||'').toLowerCase())));
ok('CART','carts carry the real attributes (key, tablet type, basket, regional)', carts.some(c=>c.key && c.tablet_type && c.regional));

console.log('\n=== Holder model: employee OR facility only ===');
const badHolder=s.assets.filter(a=>!['employee','facility',''].includes(a.holder_type||''));
ok('HOLD','every asset holder_type is employee, facility, or none', badHolder.length===0, badHolder.slice(0,3).map(a=>a.holder_type).join(','));
ok('HOLD','carts are held by a facility or sit in the warehouse (never an employee)', !carts.some(c=>c.holder_type==='employee'));
ok('HOLD','laptops are held by an employee or a company facility (corporate office/home)', s.assetsOf('laptop').filter(a=>a.holder_type).every(a=>['employee','facility'].includes(a.holder_type)));
ok('HOLD','a warehouse cart has no holder and status In Warehouse', carts.some(c=>!c.holder_type && c.status==='In Warehouse'));

console.log('\n=== Amendment alignment: assignment target by class ===');
ok('AMD','cart class assigns to a facility', s.assetClassMeta('cart').assign==='facility');
['laptop','gameshow','tablet','monitor','desktop','cellphone','ezpass'].forEach(k=>
  ok('AMD','class "'+k+'" assigns to an employee', s.assetClassMeta(k).assign==='employee'));

console.log('\n=== Statuses ===');
const allowed=new Set(s.assetStatusOptions);
const badStatus=s.assets.filter(a=>a.status && !allowed.has(a.status));
ok('STAT','every asset status is a known status', badStatus.length===0, [...new Set(badStatus.map(a=>a.status))].slice(0,5).join(','));
ok('STAT','EZ Pass tags use Active/Deactivated', s.assetsOf('ezpass').every(a=>['Active','Deactivated','In Warehouse'].includes(a.status)));

console.log('\n=== Terminated employee → recover assets (returns) ===');
ok('TERM','terminated employees list is seeded', s.terminatedList.length>0);
ok('TERM','there are assets outstanding to recover', s.assetsToRecover.length>0, 'got '+s.assetsToRecover.length);
{
  // pick a terminated employee who actually holds assets
  const who=s.terminatedList.map(t=>t.name).find(n=>s.assetsForEmployee(n).some(a=>a.status!=='Returned'))
            || s.assets.find(a=>a.holder_type==='employee' && a.status!=='Returned').holder;
  const held=s.assetsForEmployee(who).filter(a=>a.status!=='Returned');
  const n=s.recoverTerminatedAssets(who);
  ok('TERM','starting recovery flags their held assets as Return Pending', n===held.length && s.assetsForEmployee(who).filter(a=>a.status==='Return Pending').length===n, 'n='+n);
  const one=s.assetsForEmployee(who).find(a=>a.status==='Return Pending');
  if(one){ s.returnAsset(one.id, 'TRK-123'); ok('TERM','marking an asset returned sets status Returned + tracking', one.status==='Returned' && one.return_tracking==='TRK-123'); }
  else ok('TERM','employee had a recoverable asset', false, who);
}

console.log('\n=== Status edit + reassign ===');
{
  const a=s.assets.find(x=>x.klass==='monitor');
  s.setAssetUnitStatus(a.id,'Out of Service');
  ok('EDIT','an asset status can be changed', s.assets.find(x=>x.id===a.id).status==='Out of Service');
  s.reassignAsset(a.id,'employee','Test Person');
  ok('EDIT','an asset can be reassigned to an employee', a.holder==='Test Person' && a.holder_type==='employee' && a.status==='Assigned');
}

console.log('\n=== Edit / Add / Pagination (Warehouse Manager) ===');
{
  const AST=fs.readFileSync('src/pages/AssetsPage.vue','utf8');
  // store actions
  const code=s.nextAssetCode('laptop');
  ok('WM','nextAssetCode produces a prefixed sequential code', /^LT-\d{4}$/.test(code), code);
  const before=s.assetClassCount('laptop');
  const a=s.addAsset('laptop',{code, holder_type:'', holder:'', status:'In Warehouse', brand:'Dell'});
  ok('WM','addAsset registers a new unit (In Warehouse)', s.assetClassCount('laptop')===before+1 && a.status==='In Warehouse' && a.brand==='Dell');
  s.updateAsset(a.id,{holder_type:'employee', holder:'Jane Doe', emp_state:'NJ', status:'Assigned', brand:'HP'});
  const u=s.assets.find(x=>x.id===a.id);
  ok('WM','updateAsset edits all fields incl. holder', u.holder==='Jane Doe' && u.holder_type==='employee' && u.brand==='HP' && u.status==='Assigned');
  // UI presence
  ok('WM','page has pagination with default 10 + options up to 50', /pageSize = ref\(10\)/.test(AST) && /pageOptions = \[10, 20, 30, 40, 50\]/.test(AST));
  ok('WM','page exposes Prev/Next + rows-per-page selector', AST.includes('Rows per page') && AST.includes('Prev') && AST.includes('Next'));
  ok('WM','rows have an Edit action and there is an Add button', AST.includes('@click="openEdit(a)"') && AST.includes('@click="openAdd"'));
  ok('WM','holder editor enforces employee-or-facility (amendment)', AST.includes('>Employee<') && AST.includes('>Facility<') && AST.includes('None (warehouse)'));
  ok('WM','current view can be exported to CSV', AST.includes('exportCsv'));
}

console.log('\n======================================');
console.log('ASSET REGISTRY RESULT: ' + pass + ' passed, ' + fail + ' failed');
if (fail) { console.log('FAILURES:'); fails.forEach(f=>console.log('  - '+f)); process.exit(1); }
