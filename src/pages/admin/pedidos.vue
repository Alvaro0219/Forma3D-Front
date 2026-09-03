<template>
  <div class="i3d-page-shell">
    <div class="i3d-page-header">
      <div>
        <h1 class="i3d-page-title">Pedidos</h1>
        <p class="i3d-page-subtitle">Centro del flujo comercial y productivo</p>
      </div>
      <q-btn color="primary" unelevated no-caps @click="openCreate"><AppIcon name="add" :size="16" :bordered="false" class="q-mr-xs" />Nuevo pedido</q-btn>
    </div>

    <div class="i3d-toolbar">
      <q-select v-model="fEstado" :options="estados" outlined dense clearable label="Filtrar por estado"
                emit-value map-options style="width:220px" @update:model-value="onFilter" />
    </div>

    <ResourceList
      :rows="items" :columns="columns" :loading="loading" :pagination="pagination"
      empty-label="No hay pedidos aún." @view="openDetail" @update:page="goToPage"
    >
      <template #cell-cliente="{ row }">{{ row.cliente?.nombre || row.clienteNombre || '—' }}</template>
      <template #cell-total="{ value }">{{ money(value) }}</template>
      <template #cell-estado="{ row }">
        <q-select :model-value="row.estado" :options="estados" dense borderless emit-value map-options
                  @update:model-value="v => changeEstado(row, v)" style="min-width:130px" @click.stop />
      </template>
      <template #actions="{ row }">
        <q-btn flat dense round color="positive" size="sm" :disable="!!row.venta" @click="convertir(row)">
          <AppIcon name="point_of_sale" :size="16" />
          <q-tooltip>{{ row.venta ? 'Ya facturado' : 'Registrar venta' }}</q-tooltip>
        </q-btn>
        <q-btn flat dense round size="sm" @click="openEdit(row)"><AppIcon name="edit" :size="16" /></q-btn>
        <q-btn flat dense round color="negative" size="sm" @click="confirmDelete(row)"><AppIcon name="delete" :size="16" /></q-btn>
      </template>
    </ResourceList>

    <!-- Vista del pedido -->
    <RecordDetailDialog
      v-model="detailDialog" :title="`Pedido #${current.numero}`" :subtitle="current.cliente?.nombre || current.clienteNombre"
      :fields="detailFields"
    >
      <template #header-side><StatusBadge :label="current.estado" :status="current.estado" /></template>
      <div class="text-subtitle2 q-mb-xs">Ítems</div>
      <ItemsTable class="q-mb-md" :rows="current.items || []" :columns="itemColumns" />
      <div v-if="current.venta" class="text-positive"><AppIcon name="check_circle" :size="16" color="success" /> Venta registrada</div>
      <div v-if="current.notas" class="q-mt-sm"><div class="i3d-lc-k">Notas</div>{{ current.notas }}</div>
    </RecordDetailDialog>

    <!-- Crear / editar pedido -->
    <q-dialog v-model="dialog" persistent>
      <q-card class="i3d-order-card">
        <q-card-section class="row items-center">
          <div class="text-h6">{{ editing ? 'Editar pedido' : 'Nuevo pedido' }}</div>
          <q-space /><q-btn flat round dense v-close-popup><AppIcon name="close" :size="18" /></q-btn>
        </q-card-section>
        <q-separator />
        <q-card-section class="i3d-order-body">
          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-md-6">
              <q-select v-model="form.cliente" :options="clienteOptions" outlined dense clearable
                        label="Cliente" emit-value map-options use-input @filter="filterClientes" />
            </div>
            <div class="col-12 col-md-6"><q-input v-model="form.clienteNombre" outlined dense label="Nombre (si no está registrado)" /></div>
            <div class="col-12 col-md-6"><q-input v-model="form.fechaEntrega" outlined dense type="date" label="Fecha de entrega" stack-label /></div>
            <div class="col-12"><q-input v-model="form.notas" outlined dense type="textarea" autogrow label="Notas" /></div>
          </div>
          <ItemEditor v-model="form.items" :productos="productos" />
        </q-card-section>
        <q-separator />
        <q-card-actions align="right">
          <div class="i3d-order-total">Total: {{ money(itemsTotal) }}</div>
          <q-space />
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Guardar" :loading="saving" @click="onSubmit" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import ResourceList from '../../components/ResourceList.vue';
import RecordDetailDialog from '../../components/RecordDetailDialog.vue';
import StatusBadge from '../../components/StatusBadge.vue';
import ItemEditor from '../../components/ItemEditor.vue';
import ItemsTable from '../../components/ItemsTable.vue';
import AppIcon from '../../components/AppIcon.vue';
import { useCrudResource } from '../../composables/useCrudResource.js';
import {
  fetchPedidos, createPedido, updatePedido, deletePedido, cambiarEstadoPedido,
  fetchProductos, fetchClientes, crearVentaDesdePedido
} from '../../services/api.js';
import { formatMoney, formatDate } from '../../utils/format.js';
import '../../styles/dashboard-unified.css';

const $q = useQuasar();
const money = (n) => formatMoney(n);

const itemColumns = [
  { name: 'nombre', label: 'Producto' },
  { name: 'cantidad', label: 'Cant.', align: 'right', mono: true },
  { name: 'precioUnitario', label: 'Precio', align: 'right', mono: true, format: money },
  { name: 'subtotal', label: 'Subtotal', align: 'right', mono: true, format: money }
];
const estados = ['Pendiente', 'Diseno', 'Preparando', 'Imprimiendo', 'Listo', 'Entregado', 'Cancelado'].map((e) => ({ label: e.toUpperCase(), value: e }));

const { items, pagination, loading, saving, reload, goToPage, create, update, remove } = useCrudResource({
  fetchFn: fetchPedidos, createFn: createPedido, updateFn: updatePedido, deleteFn: deletePedido, label: 'el pedido'
});

const columns = [
  { name: 'numero', label: 'N°', field: 'numero', mono: true, format: (v) => `#${v}` },
  { name: 'cliente', label: 'Cliente', field: 'cliente' },
  { name: 'total', label: 'Total', field: 'total', align: 'right', mono: true },
  { name: 'estado', label: 'Estado', field: 'estado' }
];

const fEstado = ref(null);
const dialog = ref(false);
const editing = ref(false);
const editId = ref(null);
const form = ref({ cliente: null, clienteNombre: '', fechaEntrega: '', notas: '', items: [] });
const productos = ref([]);
const allClientes = ref([]);
const clienteOptions = ref([]);

const detailDialog = ref(false);
const current = ref({});
const detailFields = computed(() => {
  const p = current.value;
  return [
    { label: 'Cliente', value: p.cliente?.nombre || p.clienteNombre, cols: 6 },
    { label: 'Teléfono', value: p.cliente?.telefono, mono: true, cols: 6 },
    { label: 'Fecha creación', value: formatDate(p.createdAt), mono: true, cols: 6 },
    { label: 'Fecha entrega', value: formatDate(p.fechaEntrega), mono: true, cols: 6 },
    { label: 'Total', value: money(p.total), mono: true, cols: 6 }
  ];
});

const itemsTotal = computed(() => form.value.items.reduce((a, i) => a + (i.precioUnitario * i.cantidad), 0));

function onFilter() { reload({ filter_estado: fEstado.value }); }
function resetForm() { form.value = { cliente: null, clienteNombre: '', fechaEntrega: '', notas: '', items: [] }; }
function openCreate() { editing.value = false; editId.value = null; resetForm(); dialog.value = true; }
function openEdit(row) {
  editing.value = true; editId.value = row._id;
  form.value = {
    cliente: row.cliente?._id || row.cliente || null,
    clienteNombre: row.clienteNombre || '',
    fechaEntrega: row.fechaEntrega ? row.fechaEntrega.slice(0, 10) : '',
    notas: row.notas || '',
    items: (row.items || []).map((i) => ({ producto: i.producto, nombre: i.nombre, cantidad: i.cantidad, precioUnitario: i.precioUnitario }))
  };
  dialog.value = true;
}
function openDetail(row) { current.value = { ...row }; detailDialog.value = true; }

async function onSubmit() {
  if (!form.value.items.length) { $q.notify({ type: 'warning', message: 'Agregá al menos un producto' }); return; }
  const payload = {
    cliente: form.value.cliente || undefined,
    clienteNombre: form.value.clienteNombre || undefined,
    fechaEntrega: form.value.fechaEntrega || undefined,
    notas: form.value.notas || undefined,
    items: form.value.items.map((i) => ({ producto: i.producto || undefined, nombre: i.nombre, cantidad: i.cantidad, precioUnitario: i.precioUnitario }))
  };
  const okDone = editing.value ? await update(editId.value, payload) : await create(payload);
  if (okDone) dialog.value = false;
}

async function changeEstado(row, estado) {
  try { await cambiarEstadoPedido(row._id, estado); row.estado = estado; $q.notify({ type: 'positive', message: `Pedido #${row.numero}: ${estado}` }); }
  catch (e) { $q.notify({ type: 'negative', message: e.message || 'No se pudo cambiar el estado' }); }
}

function convertir(row) {
  $q.dialog({ title: 'Registrar venta', message: `¿Generar la venta del pedido #${row.numero}? Se descontará stock.`, cancel: true, persistent: true })
    .onOk(async () => {
      try { await crearVentaDesdePedido({ pedido: row._id, descontarStock: true }); $q.notify({ type: 'positive', message: 'Venta registrada' }); await reload(); }
      catch (e) { $q.notify({ type: 'negative', message: e.message || 'No se pudo registrar la venta' }); }
    });
}
function confirmDelete(row) {
  $q.dialog({ title: 'Eliminar pedido', message: `¿Eliminar el pedido #${row.numero}?`, cancel: true, persistent: true })
    .onOk(() => remove(row._id));
}

function filterClientes(val, update) {
  update(() => {
    const needle = (val || '').toLowerCase();
    clienteOptions.value = allClientes.value.filter((c) => c.nombre.toLowerCase().includes(needle)).map((c) => ({ label: c.nombre, value: c._id }));
  });
}

onMounted(async () => {
  await reload();
  const [prods, clientes] = await Promise.all([fetchProductos({ limit: 100 }), fetchClientes({ limit: 200 })]);
  productos.value = prods.items || [];
  allClientes.value = clientes.items || [];
  clienteOptions.value = allClientes.value.map((c) => ({ label: c.nombre, value: c._id }));
});
</script>

<style scoped>
.i3d-order-card { width: 760px; max-width: 94vw; }
.i3d-order-body { max-height: 70vh; overflow-y: auto; }
.i3d-order-total { font-weight: 700; font-size: 16px; color: var(--text-primary); }
</style>
