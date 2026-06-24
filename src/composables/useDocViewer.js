import { reactive } from 'vue';
// App-wide PDF/document viewer (rendered once by DocumentViewer.vue in AppLayout).
const state = reactive({ open: false, name: '', kind: '', facility: null, order: null });
export function useDocViewer() {
  return {
    state,
    open(payload) { Object.assign(state, { open: true, name: '', kind: '', facility: null, order: null }, payload || {}); },
    close() { state.open = false; },
  };
}
