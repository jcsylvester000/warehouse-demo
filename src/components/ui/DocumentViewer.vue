<script setup>
import { computed } from 'vue';
import { useWarehouseStore } from '@/stores/warehouse';
import { useDocViewer } from '@/composables/useDocViewer';
import { COMPANY, fmtDateTime } from '@/utils/format';
import { courierFor, qrDataUrl } from '@/utils/labels';
import Modal from '@/components/ui/BaseModal.vue';
import Btn from '@/components/ui/BaseButton.vue';
import Badge from '@/components/ui/Badge.vue';

const store = useWarehouseStore();
const dv = useDocViewer();
const st = dv.state;

const docType = computed(() => {
  const k = (st.kind || '').toLowerCase();
  const n = (st.name || '').toLowerCase();
  if (k.includes('floor') || n.includes('floorplan') || n.includes('floor_plan') || n.includes('floor plan')) return 'floor';
  if (k === 'bol' || k.includes('lading') || n.includes('bol')) return 'bol';
  if (k.includes('proof') || k === 'pod' || n.includes('pod') || n.includes('proof')) return 'pod';
  if (/\.(jpe?g|png|gif|heic)$/.test(n)) return 'photo';
  return 'generic';
});
const titleMap = { floor: 'Floor Plan', bol: 'Bill of Lading', pod: 'Proof of Delivery', photo: 'Delivery Photo', generic: 'Document' };
const order = computed(() => st.order || null);
const facility = computed(() => st.facility || (order.value ? store.facilityById(order.value.facility_id) : null));
const courier = computed(() => (order.value ? courierFor(order.value) : null));
const qr = computed(() => (courier.value ? qrDataUrl(courier.value.trackUrl || courier.value.tracking) : ''));
const lines = computed(() => (order.value && order.value.items ? order.value.items : []));
const docNo = computed(() => 'DOC-' + (st.name || 'file').replace(/[^A-Za-z0-9]/g, '').slice(0, 10).toUpperCase());

function print() { setTimeout(() => window.print(), 60); }
function close() { dv.close(); }
</script>

<template>
  <Modal v-if="st.open" :title="titleMap[docType] + ' · ' + (st.name || 'document.pdf')" sub="Mock document — Print / Save as PDF to export." wide @close="close">
    <div id="docview-print" class="rounded-xl border border-slate-200 bg-white p-6 text-slate-800">
      <!-- Letterhead -->
      <div class="flex items-start justify-between border-b-2 border-slate-800 pb-3 mb-4">
        <div class="flex items-center gap-3">
          <span class="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-lg font-bold">C</span>
          <div><div class="text-xl font-extrabold tracking-tight text-slate-900">{{ COMPANY.name }}</div><div class="text-xs text-slate-500">{{ COMPANY.address }}</div></div>
        </div>
        <div class="text-right"><div class="text-lg font-bold uppercase tracking-wide text-indigo-700">{{ titleMap[docType] }}</div><div class="text-xs text-slate-500">{{ st.name }}</div></div>
      </div>

      <!-- FLOOR PLAN -->
      <template v-if="docType === 'floor'">
        <div class="flex items-center justify-between mb-2 text-sm">
          <div><div class="text-[10px] uppercase tracking-wide text-slate-400">Facility</div><div class="font-semibold">{{ (facility || {}).name || 'Facility' }}</div></div>
          <div class="text-right"><div class="text-[10px] uppercase tracking-wide text-slate-400">Address</div><div>{{ (facility || {}).address || '—' }}</div></div>
        </div>
        <svg viewBox="0 0 760 470" class="w-full rounded-lg border border-slate-200 bg-slate-50">
          <rect x="14" y="14" width="732" height="442" fill="#ffffff" stroke="#334155" stroke-width="3" />
          <!-- corridor -->
          <rect x="14" y="210" width="732" height="60" fill="#eef2ff" />
          <text x="380" y="245" text-anchor="middle" font-size="13" fill="#6366f1" font-family="Arial">MAIN CORRIDOR</text>
          <!-- top rooms -->
          <g font-family="Arial" font-size="12" fill="#475569">
            <rect x="24" y="24" width="160" height="180" fill="#f8fafc" stroke="#94a3b8" /><text x="104" y="118" text-anchor="middle">Resident Wing A</text>
            <rect x="192" y="24" width="160" height="180" fill="#f8fafc" stroke="#94a3b8" /><text x="272" y="118" text-anchor="middle">Resident Wing B</text>
            <rect x="360" y="24" width="150" height="180" fill="#ecfeff" stroke="#94a3b8" /><text x="435" y="110" text-anchor="middle">Nurse Station</text><text x="435" y="128" text-anchor="middle" font-size="10" fill="#0891b2">vitals carts</text>
            <rect x="518" y="24" width="218" height="180" fill="#f8fafc" stroke="#94a3b8" /><text x="627" y="118" text-anchor="middle">Therapy / Activities</text>
          </g>
          <!-- bottom rooms -->
          <g font-family="Arial" font-size="12" fill="#475569">
            <rect x="24" y="276" width="200" height="170" fill="#fef9c3" stroke="#94a3b8" /><text x="124" y="356" text-anchor="middle">Cart Staging / Storage</text><text x="124" y="374" text-anchor="middle" font-size="10" fill="#a16207">cart bays 1-8</text>
            <rect x="232" y="276" width="150" height="170" fill="#f8fafc" stroke="#94a3b8" /><text x="307" y="361" text-anchor="middle">Dining</text>
            <rect x="390" y="276" width="150" height="170" fill="#f8fafc" stroke="#94a3b8" /><text x="465" y="361" text-anchor="middle">Resident Wing C</text>
            <rect x="548" y="276" width="188" height="170" fill="#dcfce7" stroke="#94a3b8" /><text x="642" y="356" text-anchor="middle">Receiving Dock</text><text x="642" y="374" text-anchor="middle" font-size="10" fill="#16a34a">cart delivery</text>
          </g>
          <!-- entrance -->
          <rect x="360" y="446" width="60" height="14" fill="#4f46e5" /><text x="390" y="457" text-anchor="middle" font-size="9" fill="#fff" font-family="Arial">ENTRANCE</text>
        </svg>
        <div class="mt-2 flex gap-4 text-[11px] text-slate-500">
          <span class="inline-flex items-center gap-1"><span class="w-3 h-3 rounded bg-amber-100 ring-1 ring-amber-300"></span>Cart staging</span>
          <span class="inline-flex items-center gap-1"><span class="w-3 h-3 rounded bg-emerald-100 ring-1 ring-emerald-300"></span>Receiving dock</span>
          <span class="inline-flex items-center gap-1"><span class="w-3 h-3 rounded bg-cyan-100 ring-1 ring-cyan-300"></span>Nurse station</span>
          <span class="ml-auto">Plan ref: {{ docNo }} · Not to scale</span>
        </div>
      </template>

      <!-- BILL OF LADING -->
      <template v-else-if="docType === 'bol'">
        <div class="grid grid-cols-3 gap-4 text-sm mb-3">
          <div><div class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Ship from</div><div class="font-semibold">{{ COMPANY.name }}</div><div class="text-slate-600">{{ COMPANY.address }}</div></div>
          <div><div class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Ship to</div><div class="font-semibold">{{ (facility || {}).name || (order ? order.shipping_address : '—') }}</div><div class="text-slate-600">{{ (facility || {}).address || (order ? order.shipping_address : '') }}</div></div>
          <div class="text-right">
            <div class="text-[10px] font-bold uppercase tracking-wide text-slate-400">BOL #</div><div class="font-mono">{{ docNo }}</div>
            <div v-if="courier" class="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Carrier</div><div v-if="courier" class="font-semibold">{{ courier.carrier }} · {{ courier.service }}</div>
            <div v-if="courier" class="font-mono text-xs">{{ courier.tracking }}</div>
          </div>
        </div>
        <div class="flex items-center gap-4 mb-3">
          <img v-if="qr" :src="qr" alt="tracking QR" class="w-24 h-24 border border-slate-200 rounded" />
          <div class="flex-1 text-xs text-slate-600">
            <div class="grid grid-cols-3 gap-2">
              <div><b>Order</b><br>{{ order ? order.so_number : '—' }}</div>
              <div><b>Packages</b><br>{{ courier ? courier.packages : 1 }}</div>
              <div><b>Weight</b><br>{{ courier ? courier.weight : '—' }} lb</div>
              <div><b>Freight terms</b><br>Prepaid</div>
              <div><b>Ship date</b><br>{{ (order && order.expected_date) || '—' }}</div>
              <div><b>Delivery method</b><br>{{ order ? order.delivery_method : '—' }}</div>
            </div>
          </div>
        </div>
        <table class="w-full text-sm">
          <thead><tr class="border-b border-slate-300 text-[11px] uppercase tracking-wide text-slate-500"><th class="text-left py-2">Description of articles</th><th class="text-right py-2">Qty</th><th class="text-left py-2 pl-3">Facility</th></tr></thead>
          <tbody>
            <tr v-for="(l, i) in lines" :key="i" class="border-b border-slate-100"><td class="py-1.5">{{ l.name }}</td><td class="py-1.5 text-right tabular-nums">{{ (l.qty || 0) - (l.qty_shipped || 0) || l.qty }}</td><td class="py-1.5 pl-3 text-slate-500">{{ (store.facilityById(l.facility_id) || {}).name || '' }}</td></tr>
            <tr v-if="!lines.length"><td colspan="3" class="py-3 text-slate-400 text-center">Cart shipment — see attached manifest.</td></tr>
          </tbody>
        </table>
        <div class="mt-6 grid grid-cols-2 gap-8 text-xs text-slate-500"><div class="border-t border-slate-300 pt-1">Shipper signature / date</div><div class="border-t border-slate-300 pt-1">Carrier signature / date</div></div>
      </template>

      <!-- PROOF OF DELIVERY -->
      <template v-else-if="docType === 'pod'">
        <div class="grid grid-cols-2 gap-4 text-sm mb-3">
          <div><div class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Delivered to</div><div class="font-semibold">{{ (facility || {}).name || (order ? order.shipping_address : '—') }}</div><div class="text-slate-600">{{ (facility || {}).address || '' }}</div></div>
          <div class="text-right"><div class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Status</div><Badge tone="emerald">Delivered</Badge><div class="text-xs text-slate-500 mt-1">{{ (order && order.expected_date) || '2026-06-16' }} · 10:42 AM</div></div>
        </div>
        <div class="flex items-center gap-4 mb-3">
          <img v-if="qr" :src="qr" alt="tracking QR" class="w-20 h-20 border border-slate-200 rounded" />
          <div class="text-xs text-slate-600"><div v-if="courier"><b>{{ courier.carrier }}</b> · {{ courier.service }}</div><div v-if="courier" class="font-mono">{{ courier.tracking }}</div><div>Order {{ order ? order.so_number : '—' }} · {{ courier ? courier.packages : 1 }} package(s)</div></div>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="rounded-lg border border-slate-200 h-28 flex items-center justify-center text-slate-400 text-xs">Delivery photo · {{ st.name }}</div>
          <div class="rounded-lg border border-slate-200 p-3"><div class="text-[10px] uppercase tracking-wide text-slate-400 mb-6">Received by (signature)</div><div class="border-t border-slate-300 pt-1 text-xs text-slate-500">Print name &amp; date</div></div>
        </div>
        <p class="text-[11px] text-slate-500">Condition on arrival: Good · No exceptions noted.</p>
      </template>

      <!-- PHOTO -->
      <template v-else-if="docType === 'photo'">
        <div class="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 h-80 flex flex-col items-center justify-center text-slate-400">
          <svg class="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 19.5h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" /></svg>
          <div class="text-sm font-medium text-slate-600">{{ st.name }}</div><div class="text-xs">Mock image preview</div>
        </div>
      </template>

      <!-- GENERIC -->
      <template v-else>
        <div class="text-sm text-slate-600 space-y-2">
          <p><b>{{ st.name }}</b></p>
          <p>This is a mock document generated for the prototype. In production this opens the uploaded file.</p>
          <p class="text-slate-400">Reference {{ docNo }} · {{ COMPANY.name }} — Warehouse Operations.</p>
        </div>
      </template>

      <div class="mt-6 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-400">{{ COMPANY.name }} · {{ COMPANY.address }} · Generated {{ fmtDateTime(new Date().toISOString()) }}</div>
    </div>
    <template #footer><Btn variant="secondary" @click="close">Close</Btn><Btn @click="print">Print / Save as PDF</Btn></template>
  </Modal>
</template>

<style>
@media print {
  body * { visibility: hidden !important; }
  #docview-print, #docview-print * { visibility: visible !important; }
  #docview-print { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; border: none; }
}
</style>
