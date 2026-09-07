<template>
  <div class="i3d-page-shell">
    <div class="i3d-page-header">
      <div>
        <h1 class="i3d-page-title">Proveedores</h1>
        <p class="i3d-page-subtitle">Contactos de compra de insumos y filamentos</p>
      </div>
      <q-btn color="primary" unelevated no-caps @click="openCreate"><AppIcon name="add" :size="16" :bordered="false" class="q-mr-xs" />Nuevo proveedor</q-btn>
    </div>

    <div class="i3d-toolbar">
      <q-input v-model="search" class="i3d-grow" outlined dense debounce="350"
               label="Buscar por nombre, teléfono o email" @update:model-value="onSearch" clearable>
        <template #prepend><AppIcon name="search" :size="18" :bordered="false" /></template>
      </q-input>
    </div>

    <ResourceList
      :rows="items" :columns="columns" :loading="loading" :pagination="pagination"
      empty-label="No hay proveedores aún." @view="openDetail" @update:page="goToPage"
    >
      <template #actions="{ row }">
        <q-btn flat dense round size="sm" @click="openEdit(row)"><AppIcon name="edit" :size="16" color="tech" /></q-btn>
        <q-btn flat dense round color="negative" size="sm" @click="confirmDelete(row)"><AppIcon name="delete" :size="16" color="danger" /></q-btn>
      </template>
    </ResourceList>

    <ResourceDialog
      v-model="dialog" :title="editing ? 'Editar proveedor' : 'Nuevo proveedor'"
      :fields="fields" :initial="current" :saving="saving" @submit="onSubmit"
    />

    <RecordDetailDialog
      v-model="detailDialog" :title="current.nombre || 'Proveedor'" :fields="detailFields"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import ResourceList from '../../components/ResourceList.vue';
import ResourceDialog from '../../components/ResourceDialog.vue';
import RecordDetailDialog from '../../components/RecordDetailDialog.vue';
import AppIcon from '../../components/AppIcon.vue';
import { useCrudResource } from '../../composables/useCrudResource.js';
import { fetchProveedores, createProveedor, updateProveedor, deleteProveedor } from '../../services/api.js';
import '../../styles/dashboard-unified.css';

const $q = useQuasar();

const { items, pagination, loading, saving, reload, goToPage, create, update, remove } = useCrudResource({
  fetchFn: fetchProveedores, createFn: createProveedor, updateFn: updateProveedor, deleteFn: deleteProveedor, label: 'el proveedor'
});

const columns = [
  { name: 'nombre', label: 'Nombre', field: 'nombre', sortable: true },
  { name: 'telefono', label: 'Teléfono', field: 'telefono', mono: true, icon: 'phone' },
  { name: 'email', label: 'Email', field: 'email', icon: 'mail' }
];

const fields = [
  { name: 'nombre', label: 'Nombre', cols: 6, required: true },
  { name: 'telefono', label: 'Teléfono', cols: 6 },
  { name: 'email', label: 'Email', cols: 6 },
  { name: 'notas', label: 'Notas', type: 'textarea', cols: 12 }
];

const search = ref('');
const dialog = ref(false);
const editing = ref(false);
const current = ref({});
const detailDialog = ref(false);
const detailFields = computed(() => [
  { label: 'Teléfono', value: current.value.telefono, mono: true, cols: 6 },
  { label: 'Email', value: current.value.email, cols: 6 },
  { label: 'Notas', value: current.value.notas, cols: 12 }
]);

function onSearch() { reload({ q: search.value || '' }); }
function openCreate() { editing.value = false; current.value = {}; dialog.value = true; }
function openEdit(row) { editing.value = true; current.value = { ...row }; dialog.value = true; }
function openDetail(row) { current.value = { ...row }; detailDialog.value = true; }

async function onSubmit(payload) {
  const okDone = editing.value ? await update(current.value._id, payload) : await create(payload);
  if (okDone) dialog.value = false;
}
function confirmDelete(row) {
  $q.dialog({ title: 'Eliminar', message: `¿Eliminar a ${row.nombre}?`, cancel: true, persistent: true })
    .onOk(() => remove(row._id));
}

onMounted(() => reload());
</script>
