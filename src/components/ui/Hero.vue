<script setup>
import { useSlots } from 'vue';
defineProps({
  title: String,
  subtitle: String,
  chips: { type: Array, default: () => [] },
});
const emit = defineEmits(['chip']);
const slots = useSlots();
</script>

<template>
  <div
    class="relative z-10 rounded-3xl mb-5 p-6 sm:p-7 text-white bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-900 shadow-xl shadow-indigo-950/30"
  >
    <div class="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
      <div class="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-blue-500/20 blur-3xl"></div>
      <div class="absolute -bottom-24 left-1/3 w-72 h-72 rounded-full bg-violet-500/20 blur-3xl"></div>
      <div
        class="absolute inset-0 opacity-[0.07]"
        style="background-image: radial-gradient(circle at 1px 1px, white 1px, transparent 0); background-size: 22px 22px"
      ></div>
    </div>
    <div class="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div class="min-w-0">
        <p class="text-xs font-semibold uppercase tracking-[0.25em] text-white/50">Warehouse</p>
        <h1 class="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight">{{ title }}</h1>
        <p class="mt-1.5 text-sm text-white/60">{{ subtitle }}</p>
      </div>
      <div v-if="chips.length || slots.actions" class="flex flex-col items-stretch gap-2.5 shrink-0 sm:items-end">
        <div v-if="slots.actions" class="flex flex-wrap items-center gap-2 sm:justify-end"><slot name="actions" /></div>
        <div v-if="chips.length" class="flex flex-wrap gap-2 sm:justify-end">
          <div
            v-for="c in chips"
            :key="c.label"
            class="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white/10 ring-1 ring-white/15 backdrop-blur text-white text-sm font-semibold"
            :class="c.clickable ? 'cursor-pointer hover:bg-white/20 hover:ring-white/40 transition-colors' : ''"
            @click="c.clickable && emit('chip', c)"
          >
            <span class="text-[10px] font-bold uppercase tracking-wider text-white/60">{{ c.label }}</span>
            <span class="text-base tabular-nums" :class="c.danger ? 'text-rose-300' : 'text-white'">{{ c.value }}</span>
            <svg v-if="c.clickable" class="w-3 h-3 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
