import { ref } from 'vue';

// Global "demo mode" flag: when ON, the app shows the NEW labels + change notes
// (the violet/amber/emerald badges). When OFF, the app looks like the real product.
const KEY = 'wms_show_annotations';
function load() {
  try { const v = sessionStorage.getItem(KEY); return v === null ? true : v === '1'; } catch (e) { return true; }
}

const showAnnotations = ref(load());

export function useAnnotations() {
  function toggle() {
    showAnnotations.value = !showAnnotations.value;
    try { sessionStorage.setItem(KEY, showAnnotations.value ? '1' : '0'); } catch (e) { /* ignore */ }
  }
  function set(v) {
    showAnnotations.value = !!v;
    try { sessionStorage.setItem(KEY, showAnnotations.value ? '1' : '0'); } catch (e) { /* ignore */ }
  }
  return { showAnnotations, toggle, set };
}
