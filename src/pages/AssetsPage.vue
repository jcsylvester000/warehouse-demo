<script setup>
import { ref, reactive, computed } from 'vue';
import { useWarehouseStore, TODAY } from '@/stores/warehouse';
import { useToast } from '@/composables/useToast';
import { useDocViewer } from '@/composables/useDocViewer';
import { money, uid } from '@/utils/format';
import Hero from '@/components/ui/Hero.vue';
import Card from '@/components/ui/Card.vue';
import Badge from '@/components/ui/Badge.vue';
import Btn from '@/components/ui/BaseButton.vue';
import Modal from '@/components/ui/BaseModal.vue';

const store = useWarehouseStore();
const toast = useToast();
const CART_ST = ['Available', 'Assigned', 'In repair', 'Retired'];
const TRACKED_ST = ['In warehouse', 'Assigned', 'Shipped', 'In repair', 'Retired', 'Lost'];
const FAC_ST = ['Active', 'In transit', 'Returned', 'Damaged'];
const USER_ST = ['Active', 'Returned', 'Lost', 'Damaged'];
function setStatus(collection, id, ev) { store.setAssetStatus(collection, id, ev.target.value); toast.success('Status updated to ' + ev.target.value + '.'); }
const docViewer = useDocViewer();
function viewDoc(name, kind, facility) { docViewer.open({ name, kind, facility }); }
const tab = ref('warehouse');

const warehouseCarts = computed(() => store.carts.filter((c) => c.location === 'Warehouse'));
const assignedCarts = computed(() => store.carts.filter((c) => c.location !== 'Warehouse'));
const chips = computed(() => [
  { label: 'Carts in warehouse', value: warehouseCarts.value.length },
  { label: 'Tracked assets', value: store.trackedAssets.length },
  { label: 'Facility assets', value: store.facilityAssets.reduce((s, a) => s + (a.qty || 0), 0) },
  { label: 'User assets', value: store.userAssets.length },
]);

/* assign warehouse cart to a facility (mirror back to Inventory) */
const showAssign = ref(false); const aCart = ref(null); const aFac = ref('');
function openAssign(c) { aCart.value = c; aFac.value = store.facilities[0].id; showAssign.value = true; }
function saveAssign() { store.setCartLocation(aCart.value, 'Facility', aFac.value); toast.success('Cart assigned to facility — reflected in Inventory.'); showAssign.value = false; }
function returnToWarehouse(c) { store.setCartLocation(c, 'Warehouse', null); toast.info('Cart returned to warehouse — available in Inventory again.'); }

/* Cart Received (BOL + photos) */
const showRecv = ref(false);
const recv = reactive({ facility_id: '', received_on: TODAY, bol: '', photos: [] });
function openRecv(fid) { const ship = store.facilities.filter((f) => f.cart_shipment_date && f.status !== 'Received'); Object.assign(recv, { facility_id: fid || (ship[0] && ship[0].id) || store.facilities[0].id, received_on: TODAY, bol: '', photos: [] }); showRecv.value = true; }
function onBol(e) { const f = e.target.files && e.target.files[0]; if (f) recv.bol = f.name; }
function onPhotos(e) { recv.photos = Array.from(e.target.files || []).map((f) => f.name); }
function saveRecv() { if (!recv.bol) return toast.error('Upload the BOL to confirm receipt.'); store.confirmCartReceipt({ facility_id: recv.facility_id, received_on: recv.received_on, bol: recv.bol, photos: recv.photos }); const f = store.facilityById(recv.facility_id); toast.success('Cart receipt confirmed for ' + (f ? f.name : '') + '.'); showRecv.value = false; }
const receiptFor = (fid) => store.cartReceipts.find((r) => r.facility_id === fid);
</script>

<template>
  <div>
    <Hero title="Assets" subtitle="Warehouse carts, tracked assets, and facility/user assignments — mirrored with Inventory." :chips="chips" />

    <div class="mb-4 rounded-xl bg-indigo-50 ring-1 ring-indigo-100 px-4 py-3 text-sm text-indigo-900 flex items-start gap-2">
      <p><b>Assets &amp; Inventory mirror.</b> An assembled cart marked <b>available in the warehouse</b> shows here and as available stock in <b>Inventory ▸ Carts</b>. Assigning it to a facility moves it out of warehouse availability in both places.</p>
    </div>

    <Card :padded="false">
      <div class="flex items-center justify-between border-b border-slate-100 px-5">
        <div class="flex">
          <button class="px-4 py-3 text-sm font-semibold border-b-2 transition-colors" :class="tab==='warehouse'?'border-emerald-600 text-emerald-700':'border-transparent text-slate-500 hover:text-slate-700'" @click="tab='warehouse'">Warehouse Carts</button>
          <button class="px-4 py-3 text-sm font-semibold border-b-2 transition-colors" :class="tab==='tracked'?'border-violet-600 text-violet-700':'border-transparent text-slate-500 hover:text-slate-700'" @click="tab='tracked'">Tracked Assets</button>
          <button class="px-4 py-3 text-sm font-semibold border-b-2 transition-colors" :class="tab==='facility'?'border-amber-600 text-amber-700':'border-transparent text-slate-500 hover:text-slate-700'" @click="tab='facility'">Facility Assets</button>
          <button class="px-4 py-3 text-sm font-semibold border-b-2 transition-colors" :class="tab==='users'?'border-blue-600 text-blue-700':'border-transparent text-slate-500 hover:text-slate-700'" @click="tab='users'">User Assets</button>
          <button class="px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2" :class="tab==='received'?'border-amber-500 text-amber-700':'border-transparent text-slate-500 hover:text-slate-700'" @click="tab='received'">Cart Received </button>
        </div>
        <Btn v-if="tab==='received'" size="sm" @click="openRecv()">+ Confirm Receipt</Btn>
      </div>

      <!-- Warehouse carts (mirror of Inventory) -->
      <div v-show="tab==='warehouse'" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider"><tr><th class="px-5 py-2.5 text-left font-semibold">Cart</th><th class="px-5 py-2.5 text-left font-semibold">Type</th><th class="px-5 py-2.5 text-left font-semibold">Components</th><th class="px-5 py-2.5 text-right font-semibold">Cost</th><th class="px-5 py-2.5 text-left font-semibold">Status</th><th class="px-5 py-2.5"></th></tr></thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="c in warehouseCarts" :key="c.id" class="hover:bg-slate-50/60">
              <td class="px-5 py-3 font-mono text-xs text-slate-600">{{ c.code }}</td><td class="px-5 py-3">{{ c.cart_type }}</td>
              <td class="px-5 py-3 text-slate-600 text-xs">{{ c.components.length ? c.components.map(x=>x.qty+'× '+x.name).join(', ') : '—' }}</td>
              <td class="px-5 py-3 text-right tabular-nums">{{ money(c.cost) }}</td>
              <td class="px-5 py-3"><select :value="c.status" class="h-8 px-2 rounded border border-slate-300 text-xs" @change="setStatus('carts', c.id, $event)"><option v-for="o in CART_ST" :key="o">{{ o }}</option></select></td>
              <td class="px-5 py-3 text-right"><Btn variant="soft-primary" size="sm" @click="openAssign(c)">Assign to facility</Btn></td>
            </tr>
            <tr v-if="!warehouseCarts.length"><td colspan="6" class="px-5 py-8 text-center text-slate-400">No carts in the warehouse — assemble one in Inventory ▸ Carts.</td></tr>
          </tbody>
        </table>
        <div v-if="assignedCarts.length" class="px-5 py-3 border-t border-slate-100">
          <div class="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Assigned to facilities</div>
          <div class="flex flex-wrap gap-2">
            <span v-for="c in assignedCarts" :key="c.id" class="inline-flex items-center gap-2 rounded-lg ring-1 ring-slate-200 px-3 py-1.5 text-xs">
              <b>{{ c.code }}</b> → {{ (store.facilityById(c.facility_id)||{}).name }}
              <button class="text-indigo-600 hover:underline" @click="returnToWarehouse(c)">return</button>
            </span>
          </div>
        </div>
      </div>

      <!-- Tracked assets -->
      <div v-show="tab==='tracked'" class="overflow-x-auto">
        <div class="px-5 py-3 text-xs text-slate-500 border-b border-slate-100">Serialized assets created when a trackable item type (laptops and trivia equipment) is received on a PO, or when a returned laptop is checked back in.</div>
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider"><tr><th class="px-5 py-2.5 text-left font-semibold">Asset Tag</th><th class="px-5 py-2.5 text-left font-semibold">Item</th><th class="px-5 py-2.5 text-left font-semibold">Type</th><th class="px-5 py-2.5 text-left font-semibold">Serial</th><th class="px-5 py-2.5 text-left font-semibold">Received</th><th class="px-5 py-2.5 text-left font-semibold">PO</th><th class="px-5 py-2.5 text-left font-semibold">Status</th></tr></thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="a in store.trackedAssets" :key="a.id" class="hover:bg-slate-50/60">
              <td class="px-5 py-3 font-mono text-xs text-slate-700">{{ a.asset_tag }}</td><td class="px-5 py-3 text-slate-700">{{ a.item }}</td><td class="px-5 py-3"><Badge tone="violet">{{ a.item_type }}</Badge></td><td class="px-5 py-3 font-mono text-xs text-slate-500">{{ a.serial || '—' }}</td><td class="px-5 py-3 text-slate-500">{{ a.received_at }}</td><td class="px-5 py-3 font-mono text-xs text-slate-500">{{ a.po }}</td><td class="px-5 py-3"><select :value="a.status" class="h-8 px-2 rounded border border-slate-300 text-xs" @change="setStatus('trackedAssets', a.id, $event)"><option v-for="o in TRACKED_ST" :key="o">{{ o }}</option></select></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Facility assets -->
      <div v-show="tab==='facility'" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider"><tr><th class="px-5 py-2.5 text-left font-semibold">Facility</th><th class="px-5 py-2.5 text-left font-semibold">Item</th><th class="px-5 py-2.5 text-left font-semibold">Asset Tag</th><th class="px-5 py-2.5 text-right font-semibold">Qty</th><th class="px-5 py-2.5 text-left font-semibold">Status</th></tr></thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="a in store.facilityAssets" :key="a.id" class="hover:bg-slate-50/60"><td class="px-5 py-3 font-medium text-slate-800">{{ (store.facilityById(a.facility_id)||{}).name }}</td><td class="px-5 py-3 text-slate-700">{{ a.item }}</td><td class="px-5 py-3 font-mono text-xs text-slate-600">{{ a.asset_tag }}</td><td class="px-5 py-3 text-right tabular-nums">{{ a.qty }}</td><td class="px-5 py-3"><select :value="a.status" class="h-8 px-2 rounded border border-slate-300 text-xs" @change="setStatus('facilityAssets', a.id, $event)"><option v-for="o in FAC_ST" :key="o">{{ o }}</option></select></td></tr>
          </tbody>
        </table>
      </div>

      <!-- User assets -->
      <div v-show="tab==='users'" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider"><tr><th class="px-5 py-2.5 text-left font-semibold">User</th><th class="px-5 py-2.5 text-left font-semibold">Facility</th><th class="px-5 py-2.5 text-left font-semibold">Item</th><th class="px-5 py-2.5 text-left font-semibold">Asset Tag</th><th class="px-5 py-2.5 text-left font-semibold">Status</th></tr></thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="a in store.userAssets" :key="a.id" class="hover:bg-slate-50/60"><td class="px-5 py-3 font-medium text-slate-800">{{ a.user }}</td><td class="px-5 py-3 text-slate-600">{{ a.facility }}</td><td class="px-5 py-3 text-slate-700">{{ a.item }}</td><td class="px-5 py-3 font-mono text-xs text-slate-600">{{ a.asset_tag }}</td><td class="px-5 py-3"><select :value="a.status" class="h-8 px-2 rounded border border-slate-300 text-xs" @change="setStatus('userAssets', a.id, $event)"><option v-for="o in USER_ST" :key="o">{{ o }}</option></select></td></tr>
          </tbody>
        </table>
      </div>

      <!-- Cart Received -->
      <div v-show="tab==='received'" class="p-5 space-y-4">
        <div class="rounded-xl bg-amber-50 ring-1 ring-amber-200 px-4 py-3 text-sm text-amber-900 flex items-start gap-2"><p><b>Cart Received step.</b> Confirm Cart Received and upload the BOL + delivery photos to close the cart-fulfillment loop.</p></div>
        <div class="grid gap-4 lg:grid-cols-2">
          <div v-for="f in store.facilities" :key="f.id" class="rounded-xl border border-slate-200 p-4">
            <div class="flex items-start justify-between"><div><div class="font-semibold text-slate-800">{{ f.name }}</div><div class="text-xs text-slate-500">{{ f.city }}</div></div><Badge :tone="f.status==='Received'?'emerald':f.status==='Shipping'?'amber':'slate'">{{ f.status }}</Badge></div>
            <div class="mt-3 grid grid-cols-3 gap-2 text-sm"><div><div class="text-[10px] uppercase tracking-wide text-slate-400">Carts</div><div class="font-semibold tabular-nums">{{ f.carts_needed ?? '—' }}</div></div><div><div class="text-[10px] uppercase tracking-wide text-slate-400">Ship date</div><div class="font-semibold">{{ f.cart_shipment_date || '—' }}</div></div><div><div class="text-[10px] uppercase tracking-wide text-slate-400">Floor plan</div><div><Badge v-if="f.floor_plan" tone="indigo" class="cursor-pointer hover:ring-2 hover:ring-indigo-200" @click="viewDoc(f.floor_plan,'floorplan',f)">📎 file</Badge><span v-else class="text-slate-400">—</span></div></div></div>
            <div v-if="receiptFor(f.id)" class="mt-3 rounded-lg bg-emerald-50 ring-1 ring-emerald-100 px-3 py-2 text-xs text-emerald-800">Received {{ receiptFor(f.id).received_on }} · BOL <b>{{ receiptFor(f.id).bol_name }}</b><span v-if="receiptFor(f.id).photos.length"> · {{ receiptFor(f.id).photos.length }} photo(s)</span></div>
            <div v-else-if="f.cart_shipment_date" class="mt-3"><Btn variant="soft-success" size="sm" @click="openRecv(f.id)">Confirm Cart Received</Btn></div>
            <div v-else class="mt-3 text-xs text-slate-400">Cart shipment date not set — schedule it on the dashboard first.</div>
          </div>
        </div>
      </div>
    </Card>

    <!-- assign cart -->
    <Modal v-if="showAssign" title="Assign cart to facility" @close="showAssign=false">
      <label class="text-sm block"><span class="block text-slate-600 mb-1">Facility</span><select v-model="aFac" class="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm"><option v-for="f in store.facilities" :key="f.id" :value="f.id">{{ f.name }}</option></select></label>
      <template #footer><Btn variant="secondary" @click="showAssign=false">Cancel</Btn><Btn @click="saveAssign">Assign</Btn></template>
    </Modal>

    <!-- cart received -->
    <Modal v-if="showRecv" title="Confirm Cart Received" sub="Upload BOL and delivery photos" @close="showRecv=false">
      <div class="space-y-4">
        <label class="text-sm block"><span class="block text-slate-600 mb-1">Facility</span><select v-model="recv.facility_id" class="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm"><option v-for="f in store.facilities" :key="f.id" :value="f.id">{{ f.name }}</option></select></label>
        <label class="text-sm block"><span class="block text-slate-600 mb-1">Received on</span><input v-model="recv.received_on" type="date" class="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm" /></label>
        <div class="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/40 p-4 text-center"><div class="text-sm font-semibold text-slate-700 mb-1">Bill of Lading (BOL)</div><input type="file" class="text-xs" @change="onBol" /><div v-if="recv.bol" class="mt-2 text-xs text-emerald-700">✓ {{ recv.bol }}</div></div>
        <div class="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/40 p-4 text-center"><div class="text-sm font-semibold text-slate-700 mb-1">Delivery photos</div><input type="file" multiple class="text-xs" @change="onPhotos" /><div v-if="recv.photos.length" class="mt-2 flex flex-wrap gap-1 justify-center"><span v-for="p in recv.photos" :key="p" class="text-[11px] bg-white ring-1 ring-slate-200 rounded px-2 py-0.5">{{ p }}</span></div></div>
      </div>
      <template #footer><Btn variant="secondary" @click="showRecv=false">Cancel</Btn><Btn variant="success" @click="saveRecv">Confirm received</Btn></template>
    </Modal>
  </div>
</template>
