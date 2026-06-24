import { reactive } from 'vue';
import { uid } from '@/utils/format';

// Shared, app-wide toast list (rendered by ToastStack.vue).
const toasts = reactive([]);

function push(type, msg) {
  const id = uid('t');
  toasts.push({ id, type, msg });
  setTimeout(() => {
    const i = toasts.findIndex((t) => t.id === id);
    if (i > -1) toasts.splice(i, 1);
  }, 3200);
}

export function useToast() {
  return {
    toasts,
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  };
}
