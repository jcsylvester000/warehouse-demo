<script setup>
import { computed } from 'vue';

const props = defineProps({
  variant: { type: String, default: 'primary' },
  size: { type: String, default: 'md' },
  type: { type: String, default: 'button' },
  disabled: Boolean,
});

const variants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 active:bg-slate-100 shadow-sm',
  ghost: 'text-slate-600 hover:bg-slate-100 active:bg-slate-200',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
  'soft-danger': 'bg-rose-50 text-rose-700 hover:bg-rose-100',
  'soft-primary': 'bg-blue-50 text-blue-700 hover:bg-blue-100',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
  'soft-success': 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
};
const sizes = { sm: 'h-8 px-3 text-xs gap-1.5', md: 'h-9 px-3.5 text-sm gap-2', lg: 'h-10 px-4 text-sm gap-2' };

const cls = computed(() => (variants[props.variant] || variants.primary) + ' ' + (sizes[props.size] || sizes.md));
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
    :class="cls"
  >
    <slot />
  </button>
</template>
