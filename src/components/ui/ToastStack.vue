<script setup>
import { useToast } from '@/composables/useToast';
const { toasts } = useToast();
</script>

<template>
  <div class="fixed top-4 right-4 z-[200] flex flex-col gap-2 w-80">
    <transition-group name="fade">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="flex items-start gap-2.5 rounded-xl px-4 py-3 shadow-lg ring-1 text-sm bg-white"
        :class="{
          'ring-emerald-200': t.type === 'success',
          'ring-rose-200': t.type === 'error',
          'ring-slate-200': t.type === 'info',
        }"
      >
        <span
          class="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-white text-xs shrink-0"
          :class="{
            'bg-emerald-500': t.type === 'success',
            'bg-rose-500': t.type === 'error',
            'bg-slate-500': t.type === 'info',
          }"
        >
          <span v-if="t.type === 'success'">✓</span><span v-else-if="t.type === 'error'">!</span><span v-else>i</span>
        </span>
        <p class="text-slate-700 leading-snug">{{ t.msg }}</p>
      </div>
    </transition-group>
  </div>
</template>
