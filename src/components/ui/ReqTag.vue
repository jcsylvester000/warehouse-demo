<script setup>
// Visible marker tying a UI area to a supervisor requirement.
// ver: 'V3' (amber) or 'V4' (violet, current round). Hover shows the full requirement.
defineProps({
  code: { type: String, default: '' },   // e.g. 'PO-1'
  text: { type: String, default: '' },   // full requirement description (tooltip)
  ver: { type: String, default: 'V3' },  // 'V3' or 'V4'
});
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full ring-1 text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 whitespace-nowrap align-middle cursor-help"
    :class="ver === 'V4' ? 'bg-violet-100 text-violet-900 ring-violet-300' : 'bg-amber-100 text-amber-900 ring-amber-300'"
    :title="text"
  >
    <svg class="w-2.5 h-2.5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 5.2 5.6.5-4.2 3.7 1.3 5.5L12 19.8 6.9 22.6l1.3-5.5L4 13.4l5.6-.5z" /></svg>
    <span>{{ ver }}<template v-if="code"> · {{ code }}</template></span>
  </span>
</template>
