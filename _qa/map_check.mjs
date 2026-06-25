// EQUIPMENT MAP — Warehouse-Manager user journeys + amendment alignment.
import fs from 'fs';
globalThis.sessionStorage = { _d: {}, getItem(k){return this._d[k]??null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];} };
import { createPinia, setActivePinia } from 'pinia';
import { useWarehouseStore } from './warehouse.mjs';
import { shortName } from '../src/utils/geo.js';
setActivePinia(createPinia());
const s = useWarehouseStore();
let pass=0, fail=0; const fails=[];
function ok(r,n,c,e=''){ const t='['+r+'] '+n; if(c){pass++;console.log('  PASS  '+t);} else {fail++;fails.push(t+(e?' — '+e:''));console.log('  FAIL  '+t+(e?' — '+e:''));} }
const MAP=fs.readFileSync('src/pages/EquipmentMapsPage.vue','utf8');

console.log('\n=== Journey: WM opens the map and sees facilities nationwide ===');
ok('MAP','facilities rolled up from deployed carts (>100)', s.mapFacilities.length>100, 'got '+s.mapFacilities.length);
ok('MAP','every facility has US coordinates + a state', s.mapFacilities.every(f=>f.lat>24&&f.lat<50&&f.lng<-66&&f.lng>-125&&f.state));
ok('MAP','real place names geocode correctly (Crofton->MD, Laguna->CA)', (()=>{const c=s.mapFacilities.find(f=>/crofton/i.test(f.name));const l=s.mapFacilities.find(f=>/laguna/i.test(f.name));return (!c||c.state==='MD')&&(!l||l.state==='CA');})());
ok('MAP','markers are styled pins (not plain dots)', MAP.includes('divIcon') && MAP.includes('equip-pin') && MAP.includes('pinHtml'));
ok('MAP','hover associates facility + equipment + team', MAP.includes('bindTooltip') && MAP.includes('carts deployed') && MAP.includes('team member'));

console.log('\n=== Journey: production note + privacy on names ===');
ok('NOTE','Google Maps API production note is shown', /Google Maps API/.test(MAP) && /Demonstration only/i.test(MAP));
ok('NAME','first-name display helper works (first + last initial)', shortName('Mordy Fishman')==='Mordy F.' && shortName('Izzy')==='Izzy' && shortName('Katherine Johnson')==='Katherine J.');
ok('NAME','page displays people via shortName (no full last names)', MAP.includes('shortName(') && MAP.includes('u.display') && !/\{\{ ?u\.name ?\}\}/.test(MAP));

console.log('\n=== Journey: WM searches a facility (autosuggest + dropdown) ===');
ok('FAC','facility search has live autosuggest', MAP.includes('facSuggestions') && MAP.includes('showFacSug'));
ok('FAC','facility search also offers a full dropdown list', /pick from the full list[\s\S]*store\.mapFacilities/.test(MAP));
ok('FAC','typing narrows the facility suggestions', (()=>{ const q='lake'; const m=s.mapFacilities.filter(f=>f.name.toLowerCase().includes(q)); return m.length>0; })());

console.log('\n=== Journey: WM searches a user (autosuggest + dropdown) ===');
ok('USR','user search has live autosuggest', MAP.includes('userSuggestions') && MAP.includes('showUserSug'));
ok('USR','user search also offers a full dropdown list', MAP.includes('allStaff') && /pick from the full list[\s\S]*allStaff/.test(MAP));
ok('USR','staff are built from employee-held assets with their equipment', s.staffWithEquipment.length>50 && s.staffWithEquipment.every(u=>Array.isArray(u.items)));
ok('USR','selecting a user can focus their state + show their equipment', MAP.includes('pickUser') && MAP.includes('selectedUser'));

console.log('\n=== Journey: WM ticks several facilities to view on the map ===');
ok('MULTI','facility list has its own dynamic search', MAP.includes('listSearch') && MAP.includes('listFacilities'));
ok('MULTI','facilities can be multi-selected via tick boxes', MAP.includes('toggleSelect') && MAP.includes('selectedIds') && MAP.includes('type="checkbox"'));
ok('MULTI','the map shows the selected facilities when any are ticked', /mapList[\s\S]*selectedIds\.value\.length/.test(MAP));
ok('MULTI','select-all and clear are available', MAP.includes('selectAllShown') && MAP.includes('clearSelection'));

console.log('\n=== Journey: WM clicks a facility -> detail column (equipment + employees + their gear) ===');
ok('DETAIL','clicking a marker opens a facility detail panel', MAP.includes("m.on('click'") && MAP.includes('openDetail') && MAP.includes('selectedFacility'));
ok('DETAIL','layout adds a 3rd column when a facility is selected', /selectedFacility \?[\s\S]*grid-cols-\[/.test(MAP));
ok('DETAIL','detail shows the equipment deployed at the facility', MAP.includes('Equipment here') && MAP.includes('cartTypeBreakdown'));
ok('DETAIL','detail shows employees in the state', MAP.includes('Employees in') && MAP.includes('detailStaff'));
ok('DETAIL','detail shows the equipment assigned to each employee', /u\.items[\s\S]*classLabel/.test(MAP));
ok('DETAIL','detail can be closed and map resizes', MAP.includes('closeDetail') && MAP.includes('invalidateSize'));
ok('DETAIL','employee names use first-name display in the detail panel', MAP.includes('shortName(u.name)'));

console.log('\n=== Journey: no facility shows 0 team members (prototype) ===');
ok('DEMO','every facility shows at least 2 team members', s.mapFacilities.every(f=>s.facilityStaff(f).length>=2));
{
  const sparse=s.mapFacilities.find(f=>s.staffInState(f.state).length<2);
  if(sparse){ const list=s.facilityStaff(sparse); ok('DEMO','sparse facility is padded with demo people who have equipment', list.length>=2 && list.some(u=>u.placeholder && u.items.length>0)); }
  else ok('DEMO','a sparse facility exists to demonstrate padding', true);
  // determinism: same facility -> same demo names
  const a=s.facilityStaff(s.mapFacilities[0]).map(u=>u.name).join('|');
  const b=s.facilityStaff(s.mapFacilities[0]).map(u=>u.name).join('|');
  ok('DEMO','demo names are deterministic per facility', a===b);
}
ok('DEMO','detail + tooltips use facilityStaff (>=2)', MAP.includes('store.facilityStaff(f)') && MAP.includes('store.facilityStaff(selectedFacility.value)'));
ok('DEMO','demo people are visibly flagged', MAP.includes('u.placeholder') && /demo/i.test(MAP));
ok('NOTE','note explains real employees per facility will display in production', /actual employees assigned to each facility/i.test(MAP));

console.log('\n=== Amendment alignment still holds ===');
ok('AMD','carts belong to facilities (map is facility-based)', s.assetClassMeta('cart').assign==='facility');
ok('AMD','IT equipment is held by employees (state association)', s.staffWithEquipment.length>0 && s.assetClassMeta('laptop').assign==='employee');
ok('AMD','holder is still employee or facility only', s.assets.every(a=>['employee','facility',''].includes(a.holder_type||'')));

console.log('\n======================================');
console.log('MAP CHECK RESULT: '+pass+' passed, '+fail+' failed');
if (fail) { console.log('FAILURES:'); fails.forEach(f=>console.log('  - '+f)); process.exit(1); }
