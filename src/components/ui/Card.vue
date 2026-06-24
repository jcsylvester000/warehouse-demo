<script setup>
import { useSlots } from 'vue';
defineProps({ padded: { type: Boolean, default: true } });
const slots = useSlots();
</script>

<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
    <div
      v-if="slots.header || slots.actions"
      class="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-100"
    >
      <div class="min-w-0"><slot name="header" /></div>
      <div v-if="slots.actions" class="flex items-center gap-2 shrink-0"><slot name="actions" /></div>
    </div>
    <div :class="padded ? 'p-5' : ''"><slot /></div>
  </div>
</template>
