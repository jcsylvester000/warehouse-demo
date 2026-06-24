<script setup>
import { computed } from 'vue';

const props = defineProps({ tone: { type: String, default: 'slate' } });

const tones = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  purple: 'bg-purple-50 text-purple-700 ring-purple-200',
  green: 'bg-green-50 text-green-700 ring-green-200',
};
const cls = computed(() => tones[props.tone] || tones.slate);
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-md font-medium ring-1 ring-inset px-2 py-0.5 text-xs whitespace-nowrap"
    :class="cls"
  >
    <slot />
  </span>
</template>
