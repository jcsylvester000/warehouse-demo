<script setup>
import { ref, watch } from 'vue';
import { useWarehouseStore } from '@/stores/warehouse';

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Start typing an address…' },
});
const emit = defineEmits(['update:modelValue']);

const store = useWarehouseStore();

/* Live lookup uses OpenStreetMap (Nominatim) for the demo. In production this is
   swapped for Google Maps Places Autocomplete. To keep the field useful even when
   the live service is blocked / offline / rate-limited, we always blend in a
   curated local pool (the app's own facility & regional addresses + common NJ
   destinations) so suggestions never disappear and the control never looks broken. */
const STATIC_POOL = [
  '36 Airport Rd., #101, Lakewood, NJ 08701',
  '1 Warehouse Way, Lakewood, NJ 08701',
  '120 Maple Ave, Lakewood, NJ 08701',
  '88 Bay Blvd, Toms River, NJ 08753',
  '15 Cedar Rd, Brick, NJ 08723',
  '40 River St, Red Bank, NJ 07701',
  '200 North Office Pkwy, Newark, NJ 07102',
  '15 South Center Dr, Cherry Hill, NJ 08002',
  '1 Hospital Plaza, Toms River, NJ 08755',
  '300 Second St, Lakewood, NJ 08701',
  '500 Route 70, Brick, NJ 08723',
  '75 Main St, Freehold, NJ 07728',
];
function localPool() {
  const fromStore = [];
  (store.facilities || []).forEach((f) => { if (f.address) fromStore.push(f.address); });
  (store.regionals || []).forEach((r) => { if (r.address) fromStore.push(r.address); });
  return Array.from(new Set([...fromStore, ...STATIC_POOL]));
}
function localMatches(term) {
  const t = term.toLowerCase();
  return localPool().filter((a) => a.toLowerCase().includes(t)).slice(0, 6);
}

const q = ref(props.modelValue || '');
watch(() => props.modelValue, (v) => { if (v !== q.value) q.value = v || ''; });

const results = ref([]);     // [{ text, source: 'live' | 'local' }]
const open = ref(false);
const loading = ref(false);
const offline = ref(false);  // last live lookup failed/blocked
let timer = null;
let reqId = 0;

function showLocalOnly(term) {
  results.value = localMatches(term).map((text) => ({ text, source: 'local' }));
}

function onInput() {
  emit('update:modelValue', q.value); // free text always works, lookup or not
  open.value = true;
  offline.value = false;
  if (timer) clearTimeout(timer);
  const term = q.value.trim();
  if (term.length < 3) { results.value = []; loading.value = false; return; }
  showLocalOnly(term);          // instant local suggestions while live result loads
  loading.value = true;
  timer = setTimeout(() => lookup(term), 450); // debounce — respects OSM usage policy
}

async function lookup(term) {
  const myReq = ++reqId;
  try {
    const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=0&limit=5&countrycodes=us&q=' + encodeURIComponent(term);
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (myReq !== reqId) return;             // superseded by a newer keystroke
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const live = (Array.isArray(data) ? data : []).map((d) => ({ text: d.display_name, source: 'live' }));
    const seen = new Set(live.map((x) => x.text.toLowerCase()));
    const locals = localMatches(term).filter((t) => !seen.has(t.toLowerCase())).map((text) => ({ text, source: 'local' }));
    results.value = [...live, ...locals];
    offline.value = live.length === 0;       // reachable but no hits → still show locals
  } catch (e) {
    if (myReq !== reqId) return;
    offline.value = true;                    // blocked / offline → local suggestions only
    showLocalOnly(term);
  } finally {
    if (myReq === reqId) loading.value = false;
  }
}

function pick(text) { q.value = text; emit('update:modelValue', text); results.value = []; open.value = false; }
function blur() { setTimeout(() => { open.value = false; }, 180); }
</script>

<template>
  <div class="relative w-full">
    <div class="relative">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
      <input
        v-model="q"
        :placeholder="placeholder"
        class="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none"
        @input="onInput"
        @focus="open = true"
        @blur="blur"
      />
      <svg v-if="loading" class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" class="opacity-20" /><path d="M21 12a9 9 0 00-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round" /></svg>
    </div>

    <div v-if="open && (results.length || q.trim().length >= 3)" class="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
      <button v-for="(r, i) in results" :key="i" type="button" class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50" @mousedown.prevent="pick(r.text)">
        <svg class="w-3.5 h-3.5 shrink-0 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        <span class="flex-1 min-w-0 truncate">{{ r.text }}</span>
        <span v-if="r.source === 'local'" class="shrink-0 text-[9px] font-bold uppercase tracking-wide text-slate-400">saved</span>
      </button>

      <div v-if="!results.length && !loading" class="px-3 py-2 text-sm text-slate-400">No matches — you can type the full address.</div>

      <div class="px-3 py-1 text-[10px] text-slate-400 border-t border-slate-100 flex items-center gap-1">
        <span v-if="offline" class="text-amber-600 font-semibold">Live lookup unavailable — showing saved suggestions.</span>
        <span v-else>Live suggestions via OpenStreetMap (demo).</span>
        <span class="ml-auto">Production: Google Maps Places</span>
      </div>
    </div>
  </div>
</template>
