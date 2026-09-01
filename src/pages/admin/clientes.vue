<template>
  <div class="i3d-page-shell">
    <div class="i3d-page-header">
      <div>
        <h1 class="i3d-page-title">Clientes</h1>
        <p class="i3d-page-subtitle">Base de clientes e historial</p>
      </div>
      <q-btn color="primary" unelevated icon="add" label="Nuevo cliente" no-caps @click="openCreate" />
    </div>

    <div class="i3d-toolbar">
      <q-input v-model="search" class="i3d-grow" outlined dense debounce="350"
               label="Buscar por nombre, teléfono o email" @update:model-value="onSearch" clearable>
        <template #prepend><q-icon name="search" /></template>
      </q-input>
    </div>

    <ResourceList
      :rows="items" :columns="columns" :loading="loading" :pagination="pagination"
      empty-label="No hay clientes aún." @view="openDetail" @update:page="goToPage"
    >
      <template #actions="{ row }">
        <q-btn flat dense round icon="edit" size="sm" @click="openEdit(row)" />
        <q-btn flat dense round icon="delete" color="negative" size="sm" @click="confirmDelete(row)" />
      </template>
    </ResourceList>

    <ResourceDialog
      v-model="dialog" :title="editing ? 'Editar cliente' : 'Nuevo cliente'"
      :fields="fields" :initial="current" :saving="saving" @submit="onSubmit"
    />

    <!-- Vista del cliente -->
    <RecordDetailDialog
      v-model="detailDialog" :title="detail.cliente?.nombre || 'Cliente'"
      :subtitle="detail.cliente?.telefono" :fields="detailFields" :loading="detailLoading"
    >
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-6 col-md-3"><div class="i3d-lc-k">Total comprado</div><div class="mono text-weight-bold">{{ money(detail.estadisticas?.totalComprado) }}</div></div>
        <div class="col-6 col-md-3"><div class="i3d-lc-k">Ventas</div><div class="mono text-weight-bold">{{ detail.estadisticas?.cantidadVentas || 0 }}</div></div>
        <div class="col-6 col-md-3"><div class="i3d-lc-k">Pedidos</div><div class="mono text-weight-bold">{{ detail.estadisticas?.cantidadPedidos || 0 }}</div></div>
        <div class="col-6 col-md-3"><div class="i3d-lc-k">Última compra</div><div class="mono text-weight-bold">{{ date(detail.estadisticas?.ultimaCompra) }}</div></div>
      </div>
      <div class="text-subtitle2 q-mb-xs">Últimos pedidos</div>
      <q-list dense bordered class="rounded-borders q-mb-md">
        <q-item v-for="p in detail.historial?.pedidos || []" :key="p._id">
          <q-item-section class="mono">#{{ p.numero }} — {{ money(p.total) }}</q-item-section>
          <q-item-section side><StatusBadge :label="p.estado" :status="p.estado" /></q-item-section>
        </q-item>
        <q-item v-if="!(detail.historial?.pedidos || []).length"><q-item-section class="text-grey">Sin pedidos</q-item-section></q-item>
      </q-list>
      <div class="text-subtitle2 q-mb-xs">Últimas ventas</div>
      <q-list dense bordered class="rounded-borders">
        <q-item v-for="v in detail.historial?.ventas || []" :key="v._id">
          <q-item-section class="mono">Venta #{{ v.numero }} — {{ date(v.fecha) }}</q-item-section>
          <q-item-section side class="mono">{{ money(v.total) }}</q-item-section>
        </q-item>
        <q-item v-if="!(detail.historial?.ventas || []).length"><q-item-section class="text-grey">Sin ventas</q-item-section></q-item>
      </q-list>
    </RecordDetailDialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import ResourceList from '../../components/ResourceList.vue';
import ResourceDialog from '../../components/ResourceDialog.vue';
import RecordDetailDialog from '../../components/RecordDetailDialog.vue';
import StatusBadge from '../../components/StatusBadge.vue';
import { useCrudResource } from '../../composables/useCrudResource.js';
import { fetchClientes, fetchCliente, createCliente, updateCliente, deleteCliente } from '../../services/api.js';
import { formatMoney, formatDate } from '../../utils/format.js';
import '../../styles/dashboard-unified.css';

const $q = useQuasar();
const money = (n) => formatMoney(n);
const date = (d) => formatDate(d);

const { items, pagination, loading, saving, reload, goToPage, create, update, remove } = useCrudResource({
  fetchFn: fetchClientes, createFn: createCliente, updateFn: updateCliente, deleteFn: deleteCliente, label: 'el cliente'
});

const columns = [
  { name: 'nombre', label: 'Nombre', field: 'nombre', sortable: true },
  { name: 'telefono', label: 'Teléfono', field: 'telefono', mono: true },
  { name: 'email', label: 'Email', field: 'email' }
];

const fields = [
  { name: 'nombre', label: 'Nombre', cols: 6, required: true },
  { name: 'telefono', label: 'Teléfono', cols: 6 },
  { name: 'email', label: 'Email', cols: 6 },
  { name: 'direccion', label: 'Dirección', cols: 6 },
  { name: 'notas', label: 'Notas', type: 'textarea', cols: 12 }
];

const search = ref('');
const dialog = ref(false);
const editing = ref(false);
const current = ref({});

const detailDialog = ref(false);
const detailLoading = ref(false);
const detail = ref({});
const detailFields = computed(() => detail.value.cliente ? [
  { label: 'Teléfono', value: detail.value.cliente.telefono, mono: true, cols: 4 },
  { label: 'Email', value: detail.value.cliente.email, cols: 4 },
  { label: 'Dirección', value: detail.value.cliente.direccion, cols: 4 },
  { label: 'Notas', value: detail.value.cliente.notas, cols: 12 }
] : []);

function onSearch() { reload({ q: search.value || '' }); }
function openCreate() { editing.value = false; current.value = {}; dialog.value = true; }
function openEdit(row) { editing.value = true; current.value = { ...row }; dialog.value = true; }

async function openDetail(row) {
  detail.value = { cliente: row };
  detailDialog.value = true;
  detailLoading.value = true;
  try { detail.value = await fetchCliente(row._id); }
  finally { detailLoading.value = false; }
}

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
