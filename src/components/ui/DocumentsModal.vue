<script setup>
import { ref, computed } from 'vue';
import { useWarehouseStore, TODAY } from '@/stores/warehouse';
import { money, fmtDateTime, COMPANY } from '@/utils/format';
import Modal from '@/components/ui/BaseModal.vue';
import Btn from '@/components/ui/BaseButton.vue';
import Badge from '@/components/ui/Badge.vue';

const props = defineProps({ kind: { type: String, required: true }, order: { type: Object, required: true } });
defineEmits(['close']);
const store = useWarehouseStore();

const TYPES = props.kind === 'po'
  ? ['Purchase Order', 'Goods Received Note', 'Remittance Advice']
  : ['Order Confirmation', 'Packing Slip', 'Bill of Lading', 'Pick List'];
const doc = ref(TYPES[0]);
const num = computed(() => props.order.po_number || props.order.so_number);

/* ---- PO helpers ---- */
const vendor = computed(() => store.vendors.find((x) => x.id === props.order.vendor_id) || {});
const depositPct = computed(() => Number(vendor.value.deposit_percent) || 0);

/* ---- SO helpers ---- */
function soRecipient(o) {
  if (o.recipient_type === 'facility') return (store.facilityById(o.recipient_id) || store.facilityById(o.facility_id) || {}).name || '—';
  if (o.recipient_type === 'regional') return 'Regional · ' + ((store.regionalById(o.recipient_id) || {}).name || '');
  const u = store.userById(o.recipient_id); return u ? ((o.recipient_type === 'provider' ? 'Provider · ' : 'Employee · ') + u.name) : ((store.facilityById(o.facility_id) || {}).name || '—');
}
const recipient = computed(() => soRecipient(props.order));
// explode group lines into pickable items (name, qty, bin, facility)
const exploded = computed(() => {
  const out = [];
  (props.order.items || []).forEach((l) => {
    const rem = Math.max(0, (Number(l.qty) || 0) - (Number(l.qty_shipped) || 0)); // packing/pick = what's left to ship
    if (l.kind === 'group') (l.members || []).forEach((m) => { const it = store.itemById(m.vendor_item_id) || {}; out.push({ name: m.name || it.name, qty: (Number(m.per_group) || 0) * rem, bin: it.bin_location || '—', facility_id: l.facility_id, from: l.name }); });
    else { const it = store.itemById(l.vendor_item_id) || {}; out.push({ name: l.name, qty: rem, bin: it.bin_location || '—', facility_id: l.facility_id }); }
  });
  return out.filter((x) => x.qty > 0);
});
const lineUnit = (l) => store.soLineUnitCost(l);

const goods = computed(() => props.kind === 'po' ? store.poGoodsTotal(props.order) : store.soGoodsTotal(props.order));
const outbound = computed(() => store.soOutboundTotal(props.order));
function print() { setTimeout(() => window.print(), 60); }
</script>

<template>
  <Modal :title="(kind === 'po' ? 'Purchase Order' : 'Sales Order') + ' documents'" :sub="num" wide @close="$emit('close')">
    <div class="flex flex-wrap gap-2 mb-3">
      <button v-for="t in TYPES" :key="t" class="px-3 h-8 rounded-lg text-xs font-semibold border transition-colors" :class="doc === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'" @click="doc = t">{{ t }}</button>
    </div>

    <div id="print-doc" class="rounded-xl border border-slate-200 bg-white p-6 text-slate-800">
      <!-- Letterhead -->
      <div class="flex items-start justify-between border-b-2 border-slate-800 pb-3 mb-5">
        <div class="flex items-center gap-3">
          <span class="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-lg font-bold">C</span>
          <div>
            <div class="text-xl font-extrabold tracking-tight text-slate-900">{{ COMPANY.name }}</div>
            <div class="text-xs text-slate-500">{{ COMPANY.address }}</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-lg font-bold uppercase tracking-wide text-indigo-700">{{ doc }}</div>
          <div class="text-xs text-slate-500">{{ num }} · {{ TODAY }}</div>
        </div>
      </div>

      <!-- ============ PURCHASE ORDER DOCS ============ -->
      <template v-if="kind === 'po'">
        <div class="grid grid-cols-2 gap-5 text-sm mb-4">
          <div><div class="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">From</div><div class="font-semibold">{{ COMPANY.name }}</div><div class="text-slate-600">{{ COMPANY.address }}</div></div>
          <div><div class="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Vendor</div><div class="font-semibold">{{ order.multi_vendor ? '(multiple vendors)' : vendor.name }}</div><div class="text-slate-600">{{ vendor.email }}<span v-if="vendor.pay_terms"> · Terms: {{ vendor.pay_terms }}</span></div></div>
          <div><div class="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Order date</div><div>{{ order.order_date }}</div></div>
          <div><div class="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Expected</div><div>{{ order.expected_date || '—' }}</div></div>
        </div>

        <!-- 1. Purchase Order (vendor-facing, goods only) -->
        <table v-if="doc === 'Purchase Order'" class="w-full text-sm">
          <thead><tr class="border-b border-slate-300 text-[11px] uppercase tracking-wide text-slate-500"><th class="text-left py-2">Item</th><th v-if="order.multi_vendor" class="text-left py-2">Vendor</th><th class="text-right py-2">Qty</th><th class="text-right py-2">Unit</th><th class="text-right py-2">Line</th></tr></thead>
          <tbody><tr v-for="l in order.items" :key="l.id" class="border-b border-slate-100"><td class="py-1.5">{{ l.name }}</td><td v-if="order.multi_vendor" class="py-1.5 text-slate-600">{{ store.vendorName(l.vendor_id) }}</td><td class="py-1.5 text-right tabular-nums">{{ l.qty }}</td><td class="py-1.5 text-right tabular-nums">{{ money(l.unit_cost) }}</td><td class="py-1.5 text-right tabular-nums">{{ money((l.qty||0)*(l.unit_cost||0)) }}</td></tr></tbody>
          <tfoot>
            <tr><td :colspan="order.multi_vendor?4:3" class="py-2 text-right text-xs uppercase text-slate-400">Goods total</td><td class="py-2 text-right font-bold tabular-nums">{{ money(goods) }}</td></tr>
            <tr v-if="order.deposit"><td :colspan="order.multi_vendor?4:3" class="py-1 text-right text-xs uppercase text-slate-400">Deposit due ({{ depositPct }}%)</td><td class="py-1 text-right tabular-nums">{{ money(order.deposit) }}</td></tr>
          </tfoot>
        </table>
        <p v-if="doc === 'Purchase Order'" class="mt-3 text-[11px] text-slate-400">Pricing reflects goods only. Internal landed costs (freight/duty) are not part of this vendor purchase order.</p>

        <!-- 2. Goods Received Note -->
        <table v-else-if="doc === 'Goods Received Note'" class="w-full text-sm">
          <thead><tr class="border-b border-slate-300 text-[11px] uppercase tracking-wide text-slate-500"><th class="text-left py-2">Item</th><th class="text-right py-2">Ordered</th><th class="text-right py-2">Received</th><th class="text-right py-2">Outstanding</th></tr></thead>
          <tbody><tr v-for="l in order.items" :key="l.id" class="border-b border-slate-100"><td class="py-1.5">{{ l.name }}</td><td class="py-1.5 text-right tabular-nums">{{ l.qty }}</td><td class="py-1.5 text-right tabular-nums">{{ l.qty_received || 0 }}</td><td class="py-1.5 text-right tabular-nums">{{ (l.qty||0)-(l.qty_received||0) }}</td></tr></tbody>
        </table>
        <p v-if="doc === 'Goods Received Note'" class="mt-3 text-[11px] text-slate-400">Receiving status: {{ order.status }}. Received by: ________________   Date: {{ TODAY }}</p>

        <!-- 3. Remittance Advice -->
        <template v-else-if="doc === 'Remittance Advice'">
          <table class="w-full text-sm">
            <thead><tr class="border-b border-slate-300 text-[11px] uppercase tracking-wide text-slate-500"><th class="text-left py-2">Date</th><th class="text-left py-2">Note</th><th class="text-right py-2">Amount</th></tr></thead>
            <tbody><tr v-for="p in (order.payments||[])" :key="p.id" class="border-b border-slate-100"><td class="py-1.5">{{ fmtDateTime(p.at) }}</td><td class="py-1.5">{{ p.note || '—' }}<Badge v-if="p.edited" tone="amber" class="ml-1">changed</Badge></td><td class="py-1.5 text-right tabular-nums">{{ money(p.amount) }}</td></tr>
            <tr v-if="!(order.payments||[]).length"><td colspan="3" class="py-3 text-center text-slate-400">No payments recorded.</td></tr></tbody>
            <tfoot>
              <tr><td colspan="2" class="py-2 text-right text-xs uppercase text-slate-400">Total paid</td><td class="py-2 text-right font-bold tabular-nums">{{ money(store.poPaymentsTotal(order)) }}</td></tr>
              <tr><td colspan="2" class="py-1 text-right text-xs uppercase text-slate-400">Remaining owed</td><td class="py-1 text-right tabular-nums" :class="store.poRemaining(order)>0?'text-rose-600':'text-emerald-700'">{{ money(store.poRemaining(order)) }}</td></tr>
            </tfoot>
          </table>
        </template>
      </template>

      <!-- ============ SALES ORDER DOCS ============ -->
      <template v-else>
        <div class="grid grid-cols-2 gap-5 text-sm mb-4">
          <div><div class="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">{{ doc === 'Bill of Lading' ? 'Shipper' : 'From' }}</div><div class="font-semibold">{{ COMPANY.name }}</div><div class="text-slate-600">{{ COMPANY.address }}</div></div>
          <div><div class="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">{{ doc === 'Bill of Lading' ? 'Consignee' : (doc === 'Pick List' ? 'For warehouse' : 'Customer') }}</div><div class="font-semibold">{{ recipient }}</div><div class="text-slate-600">{{ order.shipping_address }}</div></div>
          <div><div class="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Order date</div><div>{{ order.order_date }}</div></div>
          <div><div class="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">{{ doc === 'Bill of Lading' ? 'Carrier' : 'Expected' }}</div><div>{{ doc === 'Bill of Lading' ? order.delivery_method : (order.expected_date || '—') }}</div></div>
        </div>

        <!-- 1. Order Confirmation (group as one line + members, with pricing) -->
        <table v-if="doc === 'Order Confirmation'" class="w-full text-sm">
          <thead><tr class="border-b border-slate-300 text-[11px] uppercase tracking-wide text-slate-500"><th class="text-left py-2">Item / Group</th><th class="text-right py-2">Qty</th><th class="text-right py-2">Unit</th><th class="text-right py-2">Line</th></tr></thead>
          <tbody>
            <template v-for="(l,i) in order.items" :key="i">
              <tr class="border-b border-slate-100"><td class="py-1.5">{{ l.name }}<span v-if="l.kind==='group'" class="text-xs text-slate-400"> (group)</span></td><td class="py-1.5 text-right tabular-nums">{{ l.qty }}</td><td class="py-1.5 text-right tabular-nums">{{ money(lineUnit(l)) }}</td><td class="py-1.5 text-right tabular-nums">{{ money((l.qty||0)*lineUnit(l)) }}</td></tr>
              <tr v-for="(m,mi) in (l.kind==='group'?l.members:[])" :key="i+'m'+mi" class="text-slate-500"><td class="py-0.5 pl-5 text-xs">↳ {{ m.name }}</td><td class="py-0.5 text-right text-xs">{{ (m.per_group||0)*(l.qty||0) }}</td><td colspan="2"></td></tr>
            </template>
          </tbody>
          <tfoot>
            <tr><td colspan="3" class="py-1 text-right text-xs text-slate-400">Goods</td><td class="py-1 text-right tabular-nums">{{ money(goods) }}</td></tr>
            <tr><td colspan="3" class="py-1 text-right text-xs text-slate-400">Outbound shipping</td><td class="py-1 text-right tabular-nums">{{ money(outbound) }}</td></tr>
            <tr class="border-t border-slate-300"><td colspan="3" class="py-2 text-right text-xs uppercase text-slate-400">Total</td><td class="py-2 text-right font-bold tabular-nums">{{ money(goods + outbound) }}</td></tr>
          </tfoot>
        </table>

        <!-- 2. Packing Slip (exploded, no prices) -->
        <table v-else-if="doc === 'Packing Slip'" class="w-full text-sm">
          <thead><tr class="border-b border-slate-300 text-[11px] uppercase tracking-wide text-slate-500"><th class="text-left py-2">Item</th><th class="text-left py-2">Facility</th><th class="text-right py-2">Qty</th></tr></thead>
          <tbody><tr v-for="(x,i) in exploded" :key="i" class="border-b border-slate-100"><td class="py-1.5">{{ x.name }}<span v-if="x.from" class="text-xs text-slate-400"> · {{ x.from }}</span></td><td class="py-1.5 text-slate-500">{{ (store.facilityById(x.facility_id)||{}).name }}</td><td class="py-1.5 text-right tabular-nums">{{ x.qty }}</td></tr></tbody>
        </table>
        <p v-if="doc === 'Packing Slip'" class="mt-3 text-[11px] text-slate-400">Packed by: ________________   Checked by: ________________   Date: {{ TODAY }}</p>

        <!-- 3. Bill of Lading -->
        <template v-else-if="doc === 'Bill of Lading'">
          <table class="w-full text-sm">
            <thead><tr class="border-b border-slate-300 text-[11px] uppercase tracking-wide text-slate-500"><th class="text-left py-2">Description</th><th class="text-right py-2">Qty</th></tr></thead>
            <tbody><tr v-for="(x,i) in exploded" :key="i" class="border-b border-slate-100"><td class="py-1.5">{{ x.name }}</td><td class="py-1.5 text-right tabular-nums">{{ x.qty }}</td></tr></tbody>
          </table>
          <div class="mt-3 grid grid-cols-2 gap-4 text-sm"><div>Delivery method: <b>{{ order.delivery_method }}</b></div><div>Outbound freight: <b>{{ money(outbound) }}</b></div></div>
          <div class="mt-6 grid grid-cols-2 gap-8 text-xs text-slate-500"><div class="border-t border-slate-300 pt-1">Shipper signature</div><div class="border-t border-slate-300 pt-1">Carrier / received signature</div></div>
        </template>

        <!-- 4. Pick List (exploded, with bin) -->
        <table v-else-if="doc === 'Pick List'" class="w-full text-sm">
          <thead><tr class="border-b border-slate-300 text-[11px] uppercase tracking-wide text-slate-500"><th class="text-left py-2">✓</th><th class="text-left py-2">Bin</th><th class="text-left py-2">Item</th><th class="text-left py-2">Facility</th><th class="text-right py-2">Qty</th></tr></thead>
          <tbody><tr v-for="(x,i) in exploded" :key="i" class="border-b border-slate-100"><td class="py-1.5">☐</td><td class="py-1.5 font-mono text-xs">{{ x.bin }}</td><td class="py-1.5">{{ x.name }}</td><td class="py-1.5 text-slate-500">{{ (store.facilityById(x.facility_id)||{}).name }}</td><td class="py-1.5 text-right tabular-nums">{{ x.qty }}</td></tr></tbody>
        </table>
        <p v-if="doc === 'Pick List'" class="mt-3 text-[11px] text-slate-400">Picked by: ________________   Date: {{ TODAY }}. Group lines are expanded into individual items above.</p>
      </template>

      <div class="mt-6 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-400">{{ COMPANY.name }} · {{ COMPANY.address }} · {{ COMPANY.tag }}</div>
    </div>

    <template #footer><Btn variant="secondary" @click="$emit('close')">Close</Btn><Btn @click="print">Print {{ doc }}</Btn></template>
  </Modal>
</template>

<style>
@media print {
  body * { visibility: hidden !important; }
  #print-doc, #print-doc * { visibility: visible !important; }
  #print-doc { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; border: none; }
}
</style>
