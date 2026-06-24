<script setup>
import { ref, computed } from 'vue';
import { useWarehouseStore } from '@/stores/warehouse';
import { useToast } from '@/composables/useToast';
import Hero from '@/components/ui/Hero.vue';
import Card from '@/components/ui/Card.vue';
import Btn from '@/components/ui/BaseButton.vue';
import Tag from '@/components/ui/Tag.vue';

const store = useWarehouseStore();
const toast = useToast();

const selectedRoleId = ref('warehouse-manager');
const isEmployee = computed(() => selectedRoleId.value === 'warehouse-employee');
const selectedRole = computed(() => store.roles.find((r) => r.id === selectedRoleId.value));

const chips = computed(() => [
  { label: 'Roles defined', value: store.roles.length },
  { label: 'Granted (YES)', value: store.capabilities.filter((c) => c.grant === 'yes').length },
  { label: 'Partial / scoped', value: store.capabilities.filter((c) => c.grant === 'partial').length },
  { label: 'To confirm', value: store.capabilities.filter((c) => c.grant === 'confirm').length },
]);

// group capabilities preserving order
const groups = computed(() => {
  const out = [];
  store.capabilities.forEach((c) => {
    let g = out.find((x) => x.name === c.group);
    if (!g) { g = { name: c.group, rows: [] }; out.push(g); }
    g.rows.push(c);
  });
  return out;
});

const grantMeta = (g) =>
  ({
    yes: { text: 'Yes', cls: 'bg-emerald-100 text-emerald-700' },
    no: { text: 'No', cls: 'bg-rose-50 text-rose-600' },
    partial: { text: 'Partial', cls: 'bg-amber-100 text-amber-700' },
    confirm: { text: 'Confirm', cls: 'bg-blue-100 text-blue-700' },
  })[g] || { text: g, cls: 'bg-slate-100 text-slate-600' };

function onGrantClick(cap) {
  if (isEmployee.value || (selectedRole.value && selectedRole.value.custom)) return; // edit grants on the manager role
  store.cycleGrant(cap.id);
}

const showAddRole = ref(false);
const newRoleName = ref('');
function addRole() {
  if (!newRoleName.value.trim()) return toast.error('Role name required.');
  const id = store.addManagerRole(newRoleName.value.trim());
  selectedRoleId.value = id;
  newRoleName.value = '';
  showAddRole.value = false;
  toast.success('Manager role added (starts as a copy of Warehouse Manager).');
}
function derive() {
  store.deriveEmployeeRole();
  selectedRoleId.value = 'warehouse-employee';
  toast.success('Warehouse Employee derived — un-tick permissions to trim it.');
}
</script>

<template>
  <div>
    <Hero title="Roles & Permissions" subtitle="Purpose-built Warehouse Manager role and its line-by-line permission matrix." :chips="chips" />

    <div class="mb-5 rounded-xl bg-amber-50 ring-1 ring-amber-200 px-4 py-3 text-sm text-amber-900 flex items-start gap-2">
      <p>
        Dedicated <b>Warehouse Manager</b> role — purpose-built, <b>not</b> reused from the Regional Director profile. The generic
        <b>“Manager”</b> is renamed to <b>“Warehouse Manager”</b> here and on Employee Assignment (sheet 2). Model user: <b>Malky Locker</b>.
        Additional manager roles can be added later, and a <b>Warehouse Employee</b> role is derived as a trimmed copy.
      </p>
    </div>

    <!-- Role selector -->
    <Card :padded="false" class="mb-5">
      <div class="flex flex-wrap items-center gap-2 px-5 py-4">
        <button
          v-for="r in store.roles"
          :key="r.id"
          class="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-sm font-semibold border transition-colors"
          :class="selectedRoleId === r.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'"
          @click="selectedRoleId = r.id"
        >
          {{ r.name }}
          <span v-if="r.derived_from" class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full" :class="selectedRoleId === r.id ? 'bg-white/20' : 'bg-slate-100 text-slate-500'">derived</span>
          <span v-else-if="r.renamed_from" class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full" :class="selectedRoleId === r.id ? 'bg-white/20' : 'bg-emerald-100 text-emerald-700'">renamed</span>
        </button>

        <Btn v-if="!showAddRole" variant="secondary" size="sm" @click="showAddRole = true">+ Add manager role</Btn>
        <span v-else class="inline-flex items-center gap-2">
          <input v-model="newRoleName" placeholder="Role name…" class="h-9 px-3 rounded-lg border border-slate-300 text-sm" @keyup.enter="addRole" />
          <Btn size="sm" @click="addRole">Add</Btn>
          <Btn variant="ghost" size="sm" @click="showAddRole = false">Cancel</Btn>
        </span>

        <span class="ml-auto">
          <Btn v-if="!store.employeeRoleCreated" variant="soft-primary" size="sm" @click="derive">Derive Warehouse Employee</Btn>
          <span v-else class="text-xs text-slate-400">Warehouse Employee derived ✓</span>
        </span>
      </div>
      <div class="px-5 pb-4 -mt-1 text-xs text-slate-500">
        <template v-if="selectedRole && selectedRole.renamed_from">Renamed from “{{ selectedRole.renamed_from }}”. Model user: <b>{{ selectedRole.model_user }}</b>. Grants below are editable — click a grant chip to cycle Yes → Partial → Confirm → No.</template>
        <template v-else-if="isEmployee">Trimmed copy of Warehouse Manager. Un-tick a capability to remove it from the employee role.</template>
        <template v-else>New manager role — starts as a copy of the Warehouse Manager matrix (read-only preview).</template>
      </div>
    </Card>

    <!-- Matrix -->
    <Card :padded="false">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider">
            <tr>
              <th class="px-5 py-2.5 text-left font-semibold">Capability</th>
              <th class="px-5 py-2.5 text-left font-semibold">{{ isEmployee ? 'Manager grant' : 'Grant' }}</th>
              <th v-if="isEmployee" class="px-5 py-2.5 text-center font-semibold">Keep for employee</th>
              <th v-if="isEmployee" class="px-5 py-2.5 text-left font-semibold">Employee effective</th>
              <th class="px-5 py-2.5 text-left font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="g in groups" :key="g.name">
              <tr class="bg-slate-50/70"><td :colspan="isEmployee ? 5 : 3" class="px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">{{ g.name }}</td></tr>
              <tr v-for="cap in g.rows" :key="cap.id" class="border-b border-slate-100 hover:bg-slate-50/50">
                <td class="px-5 py-2.5 text-slate-700">
                  {{ cap.label }}
                  <Tag v-if="cap.grant === 'confirm'" kind="verify" class="ml-1">CONFIRM</Tag>
                </td>
                <td class="px-5 py-2.5">
                  <button
                    class="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold"
                    :class="[grantMeta(cap.grant).cls, isEmployee || (selectedRole && selectedRole.custom) ? 'cursor-default' : 'cursor-pointer hover:ring-2 hover:ring-indigo-200']"
                    @click="onGrantClick(cap)"
                  >
                    {{ grantMeta(cap.grant).text }}
                  </button>
                </td>
                <td v-if="isEmployee" class="px-5 py-2.5 text-center">
                  <input type="checkbox" :checked="cap.employee" :disabled="cap.grant === 'no'" @change="store.toggleEmployeeCap(cap.id)" />
                </td>
                <td v-if="isEmployee" class="px-5 py-2.5">
                  <span v-if="cap.grant === 'no'" class="inline-flex rounded-md px-2.5 py-1 text-xs font-bold bg-rose-50 text-rose-600">No</span>
                  <span v-else-if="cap.employee" class="inline-flex rounded-md px-2.5 py-1 text-xs font-bold" :class="grantMeta(cap.grant).cls">{{ grantMeta(cap.grant).text }}</span>
                  <span v-else class="inline-flex rounded-md px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-400">Removed</span>
                </td>
                <td class="px-5 py-2.5 text-xs text-slate-500">{{ cap.note }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </Card>
  </div>
</template>
