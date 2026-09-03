<template>
  <div class="i3d-page-shell">
    <div class="i3d-page-header">
      <div>
        <h1 class="i3d-page-title">Ventas</h1>
        <p class="i3d-page-subtitle">Registro histórico con costo y ganancia automáticos</p>
      </div>
      <q-btn color="primary" unelevated no-caps @click="openCreate"><AppIcon name="add" :size="16" :bordered="false" class="q-mr-xs" />Nueva venta</q-btn>
    </div>

    <div class="i3d-toolbar">
      <q-select v-model="fEstado" :options="estadosVenta" outlined dense clearable emit-value map-options
                label="Filtrar por estado" style="width:200px" @update:model-value="onFilter" />
    </div>

    <ResourceList
      :rows="items" :columns="columns" :loading="loading" :pagination="pagination"
      empty-label="No hay ventas registradas." @view="openDetail" @update:page="goToPage"
    >
      <template #cell-cliente="{ row }">{{ row.cliente?.nombre || row.clienteNombre || '—' }}</template>
      <template #cell-total="{ value }">{{ money(value) }}</template>
      <template #cell-ganancia="{ row }">
        <span class="text-positive mono">{{ money(row.ganancia) }}</span>
      </template>
      <template #cell-estado="{ value }"><StatusBadge :label="value" :status="value" /></template>
      <template #actions="{ row }">
        <q-btn v-if="row.estado !== 'anulada'" flat dense round color="negative" size="sm" @click="anular(row)"><AppIcon name="block" :size="16" /><q-tooltip>Anular</q-tooltip></q-btn>
      </template>
    </ResourceList>

    <!-- Vista de la venta -->
    <RecordDetailDialog
      v-model="detailDialog" :title="`Venta #${current.numero}`" :subtitle="current.cliente?.nombre || current.clienteNombre"
      :fields="detailFields"
    >
      <template #header-side><StatusBadge :label="current.estado" :status="current.estado" /></template>
      <div class="text-subtitle2 q-mb-xs">Ítems</div>
      <ItemsTable class="q-mb-md" :rows="current.items || []" :columns="itemColumns" />
      <div v-if="auth.puedeVerCostos" class="i3d-venta-cost">
        <div>Costo real <b class="mono">{{ money(current.costoReal) }}</b></div>
        <div>Ganancia <b class="mono text-positive">{{ money(current.ganancia) }}</b></div>
        <div>Margen <b class="mono text-positive">{{ current.margen }}%</b></div>
        <span class="i3d-auto-tag"><AppIcon name="auto_awesome" :size="12" :bordered="false" /> calculado por el sistema</span>
      </div>
    </RecordDetailDialog>

    <!-- Nueva venta -->
    <q-dialog v-model="dialog" persistent>
      <q-card class="i3d-order-card">
        <q-card-section class="row items-center">
          <div class="text-h6">Nueva venta</div>
          <q-space /><q-btn flat round dense v-close-popup><AppIcon name="close" :size="18" /></q-btn>
        </q-card-section>
        <q-separator />
        <q-card-section class="i3d-order-body">
          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-md-6">
              <q-select v-model="form.cliente" :options="clienteOptions" outlined dense clearable
                        label="Cliente" emit-value map-options use-input @filter="filterClientes" />
            </div>
            <div class="col-12 col-md-6">
              <q-select v-model="form.formaPago" :options="formasPago" outlined dense label="Forma de pago" emit-value map-options />
            </div>
            <div class="col-12"><q-toggle v-model="form.descontarStock" label="Descontar stock al registrar" /></div>
          </div>
          <ItemEditor v-model="form.items" :productos="productos" :show-costo="auth.puedeVerCostos" />
          <div class="q-mt-sm text-caption text-grey">
            El precio y el costo de los productos del catálogo se toman del servidor.
            <template v-if="auth.puedeVerCostos"> Para ítems manuales, cargá su costo real para que la ganancia se calcule bien.</template>
          </div>
        </q-card-section>
        <q-separator />
        <q-card-actions align="right">
          <div class="i3d-order-total">Total: {{ money(itemsTotal) }}</div>
          <q-space />
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Registrar venta" :loading="saving" @click="onSubmit" />
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
import { useAuthStore } from '../../stores/auth.js';
import { useCrudResource } from '../../composables/useCrudResource.js';
import { fetchVentas, createVenta, anularVenta, fetchProductos, fetchClientes } from '../../services/api.js';
import { formatMoney, formatDateTime } from '../../utils/format.js';
import '../../styles/dashboard-unified.css';

const $q = useQuasar();
const auth = useAuthStore();
const money = (n) => formatMoney(n);

const itemColumns = [
  { name: 'nombre', label: 'Producto' },
  { name: 'cantidad', label: 'Cant.', align: 'right', mono: true },
  { name: 'precioUnitario', label: 'Precio', align: 'right', mono: true, format: money },
  { name: 'subtotal', label: 'Subtotal', align: 'right', mono: true, format: money }
];

const estadosVenta = [{ label: 'COMPLETADA', value: 'completada' }, { label: 'ANULADA', value: 'anulada' }];

const formasPago = [
  { label: 'Efectivo', value: 'efectivo' }, { label: 'Transferencia', value: 'transferencia' },
  { label: 'Débito', value: 'debito' }, { label: 'Crédito', value: 'credito' },
  { label: 'MercadoPago', value: 'mercadopago' }, { label: 'Otro', value: 'otro' }
];

const { items, pagination, loading, saving, reload, goToPage, create } = useCrudResource({
  fetchFn: fetchVentas, createFn: createVenta, updateFn: () => {}, deleteFn: () => {}, label: 'la venta'
});

const columns = computed(() => {
  const base = [
    { name: 'numero', label: 'N°', field: 'numero', mono: true, format: (v) => `#${v}` },
    { name: 'cliente', label: 'Cliente', field: 'cliente' },
    { name: 'total', label: 'Total', field: 'total', align: 'right', mono: true }
  ];
  if (auth.puedeVerCostos) base.push({ name: 'ganancia', label: 'Ganancia', field: 'ganancia', align: 'right' });
  base.push({ name: 'estado', label: 'Estado', field: 'estado', align: 'center' });
  return base;
});

const fEstado = ref(null);
const dialog = ref(false);
const form = ref({ cliente: null, formaPago: 'efectivo', descontarStock: true, items: [] });
const productos = ref([]);
const allClientes = ref([]);
const clienteOptions = ref([]);

const detailDialog = ref(false);
const current = ref({});
const detailFields = computed(() => {
  const v = current.value;
  return [
    { label: 'Cliente', value: v.cliente?.nombre || v.clienteNombre, cols: 6 },
    { label: 'Forma de pago', value: v.formaPago, cols: 6 },
    { label: 'Fecha', value: formatDateTime(v.fecha), mono: true, cols: 6 },
    { label: 'Total', value: money(v.total), mono: true, cols: 6 }
  ];
});

const itemsTotal = computed(() => form.value.items.reduce((a, i) => a + (i.precioUnitario * i.cantidad), 0));

function onFilter() { reload({ filter_estado: fEstado.value }); }
function openCreate() { form.value = { cliente: null, formaPago: 'efectivo', descontarStock: true, items: [] }; dialog.value = true; }
function openDetail(row) { current.value = { ...row }; detailDialog.value = true; }

async function onSubmit() {
  if (!form.value.items.length) { $q.notify({ type: 'warning', message: 'Agregá al menos un producto' }); return; }
  const payload = {
    cliente: form.value.cliente || undefined,
    formaPago: form.value.formaPago,
    descontarStock: form.value.descontarStock,
    items: form.value.items.map((i) => ({
      producto: i.producto || undefined,
      nombre: i.nombre,
      cantidad: i.cantidad,
      precioUnitario: i.precioUnitario,
      ...(i.producto ? {} : { costoUnitario: Number(i.costoUnitario) || 0 })
    }))
  };
  const okDone = await create(payload);
  if (okDone) dialog.value = false;
}

async function anular(row) {
  $q.dialog({ title: 'Anular venta', message: `¿Anular la venta #${row.numero}?`, cancel: true, persistent: true })
    .onOk(async () => {
      try { await anularVenta(row._id); $q.notify({ type: 'positive', message: 'Venta anulada' }); await reload(); }
      catch (e) { $q.notify({ type: 'negative', message: e.message || 'No se pudo anular' }); }
    });
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
.i3d-venta-cost { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; padding: 12px; background: var(--bg-sunken); border-radius: var(--radius-sm); }
</style>
