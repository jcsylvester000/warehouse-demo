<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useWarehouseStore } from '@/stores/warehouse';
import { shortName } from '@/utils/geo';
import Hero from '@/components/ui/Hero.vue';
import Card from '@/components/ui/Card.vue';
import Badge from '@/components/ui/Badge.vue';
import Btn from '@/components/ui/BaseButton.vue';
import ReqTag from '@/components/ui/ReqTag.vue';

const store = useWarehouseStore();
const hasLeaflet = typeof window !== 'undefined' && !!window.L;
const classLabel = (k) => store.assetClassMeta(k).label.replace(/s$/, '');
const STATUS_TONE = { 'In Warehouse': 'slate', 'Deployed': 'emerald', 'Assigned': 'blue', 'Out of Service': 'amber', 'Incomplete': 'amber', 'Retired': 'slate', 'Return Pending': 'rose', 'Returned': 'violet', 'Active': 'emerald', 'Deactivated': 'slate' };
const tone = (st) => STATUS_TONE[st] || 'slate';

// ---- filters ----
const facSearch = ref('');
const stateSel = ref('');
const regionalSel = ref('');
const userSearch = ref('');
const onlyIssues = ref(false);
const showFacSug = ref(false);
const showUserSug = ref(false);
const selectedUser = ref(null);

// ---- multi-select facility list ----
const listSearch = ref('');
const selectedIds = ref([]);
const isSelected = (id) => selectedIds.value.includes(id);
function toggleSelect(id) { selectedIds.value = isSelected(id) ? selectedIds.value.filter((x) => x !== id) : [...selectedIds.value, id]; }
function clearSelection() { selectedIds.value = []; }

// ---- facility autosuggest ----
const facSuggestions = computed(() => {
  const q = facSearch.value.trim().toLowerCase();
  if (!q) return [];
  return store.mapFacilities.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 8);
});

// ---- user data (first-name-only display) ----
const allStaff = computed(() => store.staffWithEquipment.map((u) => ({ ...u, display: shortName(u.name) })));
const userSuggestions = computed(() => {
  const q = userSearch.value.trim().toLowerCase();
  if (q.length < 1) return [];
  return allStaff.value.filter((u) => u.display.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)).slice(0, 8);
});
function pickUser(u) { selectedUser.value = u; userSearch.value = u.display; showUserSug.value = false; if (u.state) stateSel.value = u.state; }
function clearUser() { selectedUser.value = null; userSearch.value = ''; }

// ---- main filtered set (respects all filters) ----
const facilities = computed(() => {
  const q = facSearch.value.trim().toLowerCase();
  return store.mapFacilities.filter((f) => {
    if (stateSel.value && f.state !== stateSel.value) return false;
    if (regionalSel.value && f.regional !== regionalSel.value) return false;
    if (onlyIssues.value && !(f.statusCounts['Out of Service'] || f.statusCounts['Incomplete'])) return false;
    if (q && !f.name.toLowerCase().includes(q)) return false;
    return true;
  });
});
// the list below the filters: filtered set, narrowed by its own quick search
const listFacilities = computed(() => {
  const q = listSearch.value.trim().toLowerCase();
  return facilities.value.filter((f) => !q || f.name.toLowerCase().includes(q) || f.city.toLowerCase().includes(q) || f.state.toLowerCase().includes(q));
});
// the map shows the selected facilities if any are ticked, otherwise the filtered set
const mapList = computed(() => selectedIds.value.length ? store.mapFacilities.filter((f) => isSelected(f.id)) : facilities.value);

function selectAllShown() { selectedIds.value = [...new Set([...selectedIds.value, ...listFacilities.value.map((f) => f.id)])]; }

const statesAvailable = computed(() => store.mapStates);
const regionalsAvailable = computed(() => store.mapRegionals);
const chips = computed(() => [
  { label: 'Facilities mapped', value: store.mapFacilities.length },
  { label: 'States', value: store.mapStates.length },
  { label: selectedIds.value.length ? 'Selected' : 'Showing', value: selectedIds.value.length || facilities.value.length },
]);

function facHasIssue(f) { return !!(f.statusCounts['Out of Service'] || f.statusCounts['Incomplete']); }
const statusLine = (f) => Object.keys(f.statusCounts).map((k) => k + ': ' + f.statusCounts[k]).join(' · ');

// ---- Leaflet map ----
let map = null; let layer = null; const markerById = {};
const selectedFacility = ref(null);
function openDetail(f) { selectedFacility.value = f; }
function closeDetail() { selectedFacility.value = null; }
const detailStaff = computed(() => selectedFacility.value ? store.facilityStaff(selectedFacility.value) : []);
const cartTypeBreakdown = computed(() => {
  if (!selectedFacility.value) return [];
  const m = {}; selectedFacility.value.carts.forEach((c) => { const k = (c.cart_type || '—') + ' / ' + (c.bp_machine || '—'); m[k] = (m[k] || 0) + 1; });
  return Object.keys(m).map((k) => ({ k, n: m[k] })).sort((a, b) => b.n - a.n);
});

function tooltipHtml(f) {
  const staff = store.facilityStaff(f);
  const staffList = staff.slice(0, 5).map((u) => shortName(u.name) + ' (' + u.items.length + ')').join(', ') + (staff.length > 5 ? '…' : '');
  return '<div style="min-width:215px;font-family:Inter,Arial,sans-serif;padding:10px 12px">' +
    '<div style="font-weight:700;color:#0f172a;font-size:13px">' + f.name + '</div>' +
    '<div style="color:#64748b;font-size:11px">' + f.city + ', ' + f.state + ' · Regional: ' + shortName(f.regional) + '</div>' +
    '<div style="border-top:1px solid #e2e8f0;margin:6px 0"></div>' +
    '<div style="color:#4338ca;font-weight:600;font-size:12px">' + f.cartCount + ' carts deployed</div>' +
    '<div style="font-size:11px;color:#475569">' + statusLine(f) + '</div>' +
    '<div style="border-top:1px solid #e2e8f0;margin:6px 0"></div>' +
    '<div style="color:#0f766e;font-weight:600;font-size:12px">' + staff.length + ' team member(s) in ' + f.state + '</div>' +
    (staff.length ? '<div style="font-size:11px;color:#475569">' + staffList + '</div>' : '') +
    '</div>';
}
function popupHtml(f) {
  const carts = f.carts.slice(0, 6).map((c) => '<li style="font-size:11px;margin:1px 0">' + c.code + ' — ' + (c.cart_type || '?') + ' / ' + (c.bp_machine || '?') + ' · <i style="color:#64748b">' + c.status + '</i></li>').join('');
  const staff = store.facilityStaff(f);
  const staffHtml = staff.slice(0, 8).map((u) => '<li style="font-size:11px;margin:1px 0"><b>' + shortName(u.name) + '</b> — ' + u.items.map((it) => classLabel(it.klass) + ' ' + it.code).slice(0, 4).join(', ') + '</li>').join('');
  return '<div style="min-width:260px;max-width:320px;font-family:Inter,Arial,sans-serif">' +
    '<div style="font-weight:700;color:#0f172a;font-size:13px">' + f.name + '</div>' +
    '<div style="color:#64748b;font-size:11px;margin-bottom:5px">' + f.city + ', ' + f.state + ' · Regional: ' + shortName(f.regional) + '</div>' +
    '<div style="font-weight:600;font-size:11px;color:#4338ca">Equipment at this facility (' + f.cartCount + ' carts)</div>' +
    '<ul style="margin:3px 0 7px 16px;padding:0">' + carts + (f.cartCount > 6 ? '<li style="font-size:11px;color:#94a3b8">+' + (f.cartCount - 6) + ' more…</li>' : '') + '</ul>' +
    '<div style="font-weight:600;font-size:11px;color:#0f766e">Team in ' + f.state + ' & their equipment</div>' +
    '<ul style="margin:3px 0 0 16px;padding:0">' + (staffHtml || '<li style="font-size:11px;color:#94a3b8">No team records in this state</li>') + '</ul>' +
    '</div>';
}
function pinHtml(f) {
  const issue = facHasIssue(f);
  const sel = isSelected(f.id);
  const color = issue ? '#e11d48' : (sel ? '#0d9488' : '#4f46e5');
  const ring = sel ? '#5eead4' : '#ffffff';
  const size = Math.round(Math.min(24 + f.cartCount * 0.7, 42));
  return { size, html: '<div class="equip-pin" style="width:' + size + 'px;height:' + size + 'px;border-radius:9999px;background:radial-gradient(circle at 32% 28%, rgba(255,255,255,.45), rgba(255,255,255,0) 60%), ' + color + ';border:2px solid ' + ring + ';box-shadow:0 4px 12px rgba(15,23,42,.40);display:flex;align-items:center;justify-content:center;">' + '<span style="color:#fff;font-weight:800;font-size:' + (size > 32 ? 12 : 10) + 'px;font-family:Inter,Arial">' + f.cartCount + '</span></div>' };
}

function drawMarkers() {
  if (!map || !window.L) return;
  if (layer) { layer.clearLayers(); } else { layer = window.L.layerGroup().addTo(map); }
  Object.keys(markerById).forEach((k) => delete markerById[k]);
  mapList.value.forEach((f) => {
    const p = pinHtml(f);
    const icon = window.L.divIcon({ html: p.html, className: 'equip-pin-wrap', iconSize: [p.size, p.size], iconAnchor: [p.size / 2, p.size / 2] });
    const m = window.L.marker([f.lat, f.lng], { icon });
    m.bindTooltip(tooltipHtml(f), { direction: 'top', className: 'equip-tip', offset: [0, -p.size / 2], opacity: 1 });
    m.bindPopup(popupHtml(f));
    m.on('click', () => openDetail(f));
    m.addTo(layer);
    markerById[f.id] = m;
  });
}
function flyTo(f) { openDetail(f); if (!map) { return; } map.setView([f.lat, f.lng], 8, { animate: true }); const m = markerById[f.id]; if (m) m.openPopup(); }
function selectAndFly(f) { if (!isSelected(f.id)) toggleSelect(f.id); facSearch.value = ''; showFacSug.value = false; nextTick(() => flyTo(f)); }

onMounted(async () => {
  if (!hasLeaflet) return;
  await nextTick();
  map = window.L.map('equip-map', { scrollWheelZoom: true, zoomControl: true }).setView([39.5, -98.35], 4);
  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap contributors' }).addTo(map);
  setTimeout(() => map && map.invalidateSize(), 200);
  drawMarkers();
});
onBeforeUnmount(() => { if (map) { map.remove(); map = null; } });
watch(mapList, () => drawMarkers());
watch(selectedFacility, () => { nextTick(() => { setTimeout(() => map && map.invalidateSize(), 60); }); });

function resetFilters() { facSearch.value = ''; stateSel.value = ''; regionalSel.value = ''; userSearch.value = ''; onlyIssues.value = false; selectedUser.value = null; clearSelection(); }
function hideFacSug() { setTimeout(() => { showFacSug.value = false; }, 150); }
function hideUserSug() { setTimeout(() => { showUserSug.value = false; }, 150); }
</script>

<template>
  <div>
    <Hero title="Equipment Maps" subtitle="Pinpoint equipment down to the facility — carts on the map, the team in each state, and the gear assigned to them." :chips="chips" />

    <div class="-mt-2 mb-3 flex flex-wrap items-center gap-2">
      <ReqTag ver="V5" code="MAP" text="NEW — OpenStreetMap view of every facility with deployed carts. Hover a marker for the facility, its equipment and the team in that state; click for full detail." />
      <ReqTag ver="V5" code="MAP-FILTER" text="NEW — autosuggest facility & user search, state and Regional filters, and a tick-box facility multi-select, so equipment can be located fast." />
    </div>

    <!-- production note -->
    <div class="mb-4 rounded-xl border border-indigo-200 bg-indigo-50/70 text-indigo-900 px-4 py-3 text-sm flex items-start gap-2">
      <svg class="w-5 h-5 shrink-0 mt-0.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      <span><b>Demonstration only.</b> During live production this map will use the <b>Google Maps API</b> for exact address geocoding. The locations are approximated to real US cities from the current inventory data, and where a facility has no staff records yet, demo names are shown so the layout is clear — in production the <b>actual employees assigned to each facility</b> will display here.</span>
    </div>

    <div v-if="!hasLeaflet" class="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 p-4 text-sm mb-4">The map library could not load (no internet in this preview). The filters and facility list below still work.</div>

    <div class="grid gap-4 items-start" :class="selectedFacility ? 'xl:grid-cols-[320px_minmax(0,1fr)_340px] lg:grid-cols-[300px_minmax(0,1fr)]' : 'lg:grid-cols-[340px_1fr]'">
      <div class="space-y-3">
        <!-- filters -->
        <Card title="Find equipment" sub="Search & filter the map">
          <div class="space-y-3">
            <!-- facility autosuggest + dropdown -->
            <div class="relative">
              <span class="block text-slate-600 mb-1 text-xs font-semibold uppercase tracking-wide">Facility search</span>
              <input v-model="facSearch" placeholder="Start typing a facility…" class="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm" @focus="showFacSug=true" @input="showFacSug=true" @blur="hideFacSug" />
              <div v-if="showFacSug && facSuggestions.length" class="absolute z-[1000] mt-1 w-full bg-white rounded-lg border border-slate-200 shadow-lg max-h-56 overflow-y-auto">
                <button v-for="f in facSuggestions" :key="f.id" class="w-full text-left px-3 py-2 hover:bg-indigo-50 text-sm" @mousedown.prevent="selectAndFly(f)">
                  <div class="font-medium text-slate-800">{{ f.name }}</div>
                  <div class="text-[11px] text-slate-500">{{ f.city }}, {{ f.state }} · {{ f.cartCount }} carts</div>
                </button>
              </div>
              <select class="mt-2 w-full h-9 px-2 rounded-lg border border-slate-300 text-sm bg-white" @change="(e)=>{ const f=store.mapFacilities.find(x=>x.id===e.target.value); if(f) selectAndFly(f); e.target.value=''; }">
                <option value="">…or pick from the full list</option>
                <option v-for="f in store.mapFacilities" :key="f.id" :value="f.id">{{ f.name }} ({{ f.state }})</option>
              </select>
            </div>

            <label class="text-sm block"><span class="block text-slate-600 mb-1 text-xs font-semibold uppercase tracking-wide">State</span>
              <select v-model="stateSel" class="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm"><option value="">All states</option><option v-for="st in statesAvailable" :key="st" :value="st">{{ st }}</option></select>
            </label>
            <label class="text-sm block"><span class="block text-slate-600 mb-1 text-xs font-semibold uppercase tracking-wide">Regional</span>
              <select v-model="regionalSel" class="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm"><option value="">All regionals</option><option v-for="r in regionalsAvailable" :key="r" :value="r">{{ shortName(r) }}</option></select>
            </label>

            <!-- user autosuggest + dropdown -->
            <div class="relative">
              <span class="block text-slate-600 mb-1 text-xs font-semibold uppercase tracking-wide">User search</span>
              <input v-model="userSearch" placeholder="Start typing a name…" class="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm" @focus="showUserSug=true" @input="showUserSug=true; selectedUser=null" @blur="hideUserSug" />
              <div v-if="showUserSug && userSuggestions.length" class="absolute z-[1000] mt-1 w-full bg-white rounded-lg border border-slate-200 shadow-lg max-h-56 overflow-y-auto">
                <button v-for="u in userSuggestions" :key="u.name" class="w-full text-left px-3 py-2 hover:bg-indigo-50 text-sm" @mousedown.prevent="pickUser(u)">
                  <div class="font-medium text-slate-800">{{ u.display }} <span class="text-[11px] font-normal text-slate-400">{{ u.state || '—' }}</span></div>
                  <div class="text-[11px] text-slate-500">{{ u.items.length }} item(s)</div>
                </button>
              </div>
              <select class="mt-2 w-full h-9 px-2 rounded-lg border border-slate-300 text-sm bg-white" @change="(e)=>{ const u=allStaff.find(x=>x.name===e.target.value); if(u) pickUser(u); e.target.value=''; }">
                <option value="">…or pick from the full list</option>
                <option v-for="u in allStaff" :key="u.name" :value="u.name">{{ u.display }} ({{ u.state || '—' }})</option>
              </select>
            </div>

            <label class="flex items-center gap-2 text-sm text-slate-600"><input v-model="onlyIssues" type="checkbox" /> Only facilities with out-of-service carts</label>
            <Btn variant="secondary" size="sm" class="w-full" @click="resetFilters">Reset filters</Btn>
          </div>
        </Card>

        <!-- selected user equipment -->
        <Card v-if="selectedUser" :title="selectedUser.display + (selectedUser.state ? ' · ' + selectedUser.state : '')" sub="Equipment assigned to this person">
          <div class="space-y-1.5">
            <div v-for="(it,i) in selectedUser.items" :key="i" class="flex items-center gap-2 text-sm rounded-lg border border-slate-200 px-3 py-1.5">
              <Badge tone="indigo">{{ classLabel(it.klass) }}</Badge>
              <span class="font-mono text-xs text-slate-600">{{ it.code }}</span>
              <Badge :tone="it.status==='Return Pending' ? 'rose' : 'slate'" class="ml-auto">{{ it.status }}</Badge>
            </div>
            <Btn variant="ghost" size="sm" class="w-full" @click="clearUser">Clear</Btn>
          </div>
        </Card>

        <!-- facilities multi-select -->
        <Card title="Facilities" :sub="selectedIds.length ? (selectedIds.length + ' selected · map shows these') : (listFacilities.length + ' shown')">
          <input v-model="listSearch" placeholder="Search this list…" class="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm mb-2" />
          <div class="flex items-center gap-2 mb-2">
            <Btn variant="secondary" size="sm" @click="selectAllShown">Select all shown</Btn>
            <Btn v-if="selectedIds.length" variant="ghost" size="sm" @click="clearSelection">Clear ({{ selectedIds.length }})</Btn>
          </div>
          <div class="space-y-1 max-h-[340px] overflow-y-auto">
            <label v-for="f in listFacilities.slice(0, 120)" :key="f.id" class="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 cursor-pointer hover:bg-slate-50" :class="isSelected(f.id) ? 'border-teal-300 bg-teal-50/40' : (facHasIssue(f) ? 'border-rose-200' : 'border-slate-200')">
              <input type="checkbox" :checked="isSelected(f.id)" @change="toggleSelect(f.id)" />
              <span class="flex-1 min-w-0">
                <span class="block font-semibold text-slate-800 text-sm truncate">{{ f.name }}</span>
                <span class="block text-[11px] text-slate-500">{{ f.city }}, {{ f.state }} · {{ shortName(f.regional) }}</span>
              </span>
              <Badge :tone="facHasIssue(f) ? 'rose' : 'indigo'">{{ f.cartCount }}</Badge>
              <button class="text-[11px] font-semibold text-indigo-600 hover:underline" @click.prevent="flyTo(f)">View</button>
            </label>
            <p v-if="!listFacilities.length" class="text-center text-slate-400 text-sm py-4">No facilities match.</p>
          </div>
        </Card>
      </div>

      <!-- map -->
      <Card title="Facility map" sub="Hover a marker for details · click to zoom in" class="overflow-hidden">
        <div id="equip-map" class="w-full rounded-xl" style="height: 660px; background:#e8eef6"></div>
        <div class="flex flex-wrap items-center gap-4 pt-3 text-xs text-slate-500">
          <span class="inline-flex items-center gap-1.5"><span class="inline-block w-3.5 h-3.5 rounded-full" style="background:#4f46e5;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3)"></span> Facility (size = carts)</span>
          <span class="inline-flex items-center gap-1.5"><span class="inline-block w-3.5 h-3.5 rounded-full" style="background:#e11d48;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3)"></span> Has out-of-service carts</span>
          <span class="inline-flex items-center gap-1.5"><span class="inline-block w-3.5 h-3.5 rounded-full" style="background:#0d9488;border:2px solid #5eead4;box-shadow:0 1px 3px rgba(0,0,0,.3)"></span> Selected</span>
        </div>
      </Card>

      <!-- third column: facility detail (appears on facility click) -->
      <div v-if="selectedFacility" class="space-y-3">
        <Card>
          <div class="flex items-start gap-2">
            <div class="min-w-0">
              <div class="text-base font-bold text-slate-800 leading-tight">{{ selectedFacility.name }}</div>
              <div class="text-[11px] text-slate-500">{{ selectedFacility.city }}, {{ selectedFacility.state }} · Regional: {{ shortName(selectedFacility.regional) }}</div>
            </div>
            <button class="ml-auto text-slate-400 hover:text-slate-700 text-lg leading-none" title="Close" @click="closeDetail">&times;</button>
          </div>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <Badge v-for="(n,st) in selectedFacility.statusCounts" :key="st" :tone="st==='Out of Service'||st==='Incomplete' ? 'rose' : 'emerald'">{{ st }}: {{ n }}</Badge>
          </div>
          <Btn variant="secondary" size="sm" class="w-full mt-3" @click="flyTo(selectedFacility)">Zoom to facility</Btn>
        </Card>

        <Card :title="'Equipment here'" :sub="selectedFacility.cartCount + ' carts deployed'">
          <div class="space-y-1 mb-2">
            <div v-for="b in cartTypeBreakdown" :key="b.k" class="flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 rounded px-2 py-1"><span class="truncate">{{ b.k }}</span><b class="tabular-nums">{{ b.n }}</b></div>
          </div>
          <div class="space-y-1 max-h-[240px] overflow-y-auto">
            <div v-for="c in selectedFacility.carts.slice(0, 60)" :key="c.id" class="flex items-center gap-2 text-xs rounded border border-slate-100 px-2 py-1">
              <span class="font-mono text-slate-700">{{ c.code }}</span>
              <span class="text-slate-400 truncate">{{ c.cart_type }}</span>
              <Badge :tone="tone(c.status)" class="ml-auto">{{ c.status }}</Badge>
            </div>
            <p v-if="selectedFacility.cartCount>60" class="text-[11px] text-slate-400 text-center pt-1">+{{ selectedFacility.cartCount-60 }} more carts…</p>
          </div>
        </Card>

        <Card :title="'Employees in ' + selectedFacility.state" :sub="detailStaff.length + ' people · equipment assigned'">
          <p class="text-[11px] text-slate-400 mb-2">Showing at least 2 for the demo; <span class="text-slate-500">in production the real employees assigned to this facility appear here.</span></p>
          <div class="space-y-2 max-h-[320px] overflow-y-auto">
            <div v-for="u in detailStaff" :key="u.name" class="rounded-lg border border-slate-200 px-2.5 py-2">
              <div class="text-sm font-semibold text-slate-800">{{ shortName(u.name) }} <span v-if="u.placeholder" class="ml-1 align-middle text-[9px] font-bold uppercase tracking-wide px-1 py-0.5 rounded bg-amber-100 text-amber-700">demo</span> <span class="text-[11px] font-normal text-slate-400">{{ u.items.length }} item(s)</span></div>
              <div class="mt-1 flex flex-wrap gap-1">
                <span v-for="(it,i) in u.items" :key="i" class="inline-flex items-center gap-1 text-[10px] rounded-full bg-slate-100 text-slate-600 px-1.5 py-0.5"><b>{{ classLabel(it.klass) }}</b> {{ it.code }}</span>
              </div>
            </div>
            <p v-if="!detailStaff.length" class="text-center text-slate-400 text-xs py-4">No employee records in this state.</p>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>

<style>
.equip-pin-wrap { background: transparent; border: none; }
.equip-pin { transition: transform .12s ease; cursor: pointer; }
.equip-pin:hover { transform: scale(1.18); }
.leaflet-tooltip.equip-tip { background: #fff; border: none; border-radius: 12px; box-shadow: 0 10px 30px rgba(15,23,42,.20); padding: 0; }
.leaflet-tooltip.equip-tip::before { display: none; }
.leaflet-popup-content-wrapper { border-radius: 12px; }
</style>
