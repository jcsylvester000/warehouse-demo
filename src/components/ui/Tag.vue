<script setup>
import { computed } from 'vue';
// Visual marker for features delivered in the current round. Reads as part of the app — not a suggestion.
const props = defineProps({ kind: { type: String, default: 'new' } });
const cls = computed(() => (props.kind === 'verify'
  ? 'bg-emerald-100 text-emerald-700 ring-emerald-200'
  : 'bg-emerald-100 text-emerald-700 ring-emerald-200'));
const label = computed(() => 'NEW');
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full text-[9px] font-bold tracking-wide px-2 py-0.5 uppercase ring-1 whitespace-nowrap"
    :class="cls"
  >
    <slot>{{ label }}</slot>
  </span>
</template>
