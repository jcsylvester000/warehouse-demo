<script setup>
import { useSlots } from 'vue';
defineProps({ title: String, sub: String, wide: Boolean });
defineEmits(['close']);
const slots = useSlots();
</script>

<template>
  <transition name="fade">
    <div class="fixed inset-0 z-[120] flex items-start justify-center p-4 sm:p-8 overflow-y-auto">
      <div class="fixed inset-0 bg-slate-900/50" @click="$emit('close')"></div>
      <div class="relative bg-white rounded-2xl shadow-2xl w-full z-10 my-4" :class="wide ? 'max-w-4xl' : 'max-w-xl'">
        <div class="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-100">
          <div>
            <h3 class="text-base font-semibold text-slate-900">{{ title }}</h3>
            <p v-if="sub" class="text-xs text-slate-500 mt-0.5">{{ sub }}</p>
          </div>
          <button class="text-slate-400 hover:text-slate-600 text-xl leading-none" @click="$emit('close')">&times;</button>
        </div>
        <div class="px-6 py-5"><slot /></div>
        <div
          v-if="slots.footer"
          class="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl"
        >
          <slot name="footer" />
        </div>
      </div>
    </div>
  </transition>
</template>
