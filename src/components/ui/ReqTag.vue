<script setup>
// Visible marker tying a UI area to a supervisor requirement / change.
// ver: 'V3' (amber), 'V4' (violet), 'V5' (emerald — newest asset-model + asset-registry work).
// Hidden globally when the "Change notes" toggle in the header is switched off.
import { useAnnotations } from '@/composables/useAnnotations';
defineProps({
  code: { type: String, default: '' },
  text: { type: String, default: '' },
  ver: { type: String, default: 'V3' },
});
const { showAnnotations } = useAnnotations();
const TONE = {
  V5: 'bg-emerald-100 text-emerald-900 ring-emerald-300',
  V4: 'bg-violet-100 text-violet-900 ring-violet-300',
  V3: 'bg-amber-100 text-amber-900 ring-amber-300',
};
</script>

<template>
  <span
    v-if="showAnnotations"
    class="inline-flex items-center gap-1 rounded-full ring-1 text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 whitespace-nowrap align-middle cursor-help"
    :class="TONE[ver] || TONE.V3"
    :title="text"
  >
    <svg class="w-2.5 h-2.5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 5.2 5.6.5-4.2 3.7 1.3 5.5L12 19.8 6.9 22.6l1.3-5.5L4 13.4l5.6-.5z" /></svg>
    <span><template v-if="ver === 'V5'">NEW · </template>{{ ver }}<template v-if="code"> · {{ code }}</template></span>
  </span>
</template>
