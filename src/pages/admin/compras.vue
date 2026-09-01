<template>
  <div class="i3d-page-shell">
    <div class="i3d-page-header">
      <div>
        <h1 class="i3d-page-title">Compras</h1>
        <p class="i3d-page-subtitle">Al confirmar, aumenta el stock y registra el gasto</p>
      </div>
      <q-btn color="primary" unelevated icon="add" label="Nueva compra" no-caps @click="openCreate" />
    </div>

    <div class="i3d-toolbar">
      <q-input v-model="fDesde" outlined dense type="date" label="Desde" stack-label clearable @update:model-value="onFilter" style="width:180px" />
      <q-input v-model="fHasta" outlined dense type="date" label="Hasta" stack-label clearable @update:model-value="onFilter" style="width:180px" />
    </div>

    <ResourceList
      :rows="items" :columns="columns" :loading="loading" :pagination="pagination"
      empty-label="No hay compras registradas." @view="openDetail" @update:page="goToPage"
    >
      <template #cell-fecha="{ value }">{{ date(value) }}</template>
      <template #cell-proveedor="{ row }">{{ row.proveedor?.nombre || '—' }}</template>
      <template #cell-items="{ row }">{{ row.items?.length || 0 }} ítem(s)</template>
      <template #cell-total="{ value }">{{ money(value) }}</template>
    </ResourceList>

    <!-- Vista de la compra -->
    <RecordDetailDialog
      v-model="detailDialog" :title="`Compra ${current.comprobante || '#' + (current._id || '').slice(-5)}`"
      :subtitle="current.proveedor?.nombre" :fields="detailFields"
    >
      <div class="text-subtitle2 q-mb-xs">Ítems</div>
      <q-markup-table flat bordered dense>
        <thead><tr><th class="text-left">Tipo</th><th class="text-left">Descripción</th><th class="text-right">Cant.</th><th class="text-right">Precio</th><th class="text-right">Subtotal</th></tr></thead>
        <tbody>
          <tr v-for="(it, i) in current.items || []" :key="i">
            <td>{{ it.articuloTipo }}</td><td>{{ it.descripcion }}</td>
            <td class="text-right mono">{{ it.cantidad }}</td><td class="text-right mono">{{ money(it.precioUnitario) }}</td>
            <td class="text-right mono">{{ money(it.subtotal) }}</td>
          </tr>
        </tbody>
      </q-markup-table>
      <div v-if="current.observaciones" class="q-mt-sm"><div class="i3d-lc-k">Observaciones</div>{{ current.observaciones }}</div>
    </RecordDetailDialog>

    <!-- Nueva compra -->
    <q-dialog v-model="dialog" persistent>
      <q-card class="i3d-order-card">
        <q-card-section class="row items-center">
          <div class="text-h6">Nueva compra</div>
          <q-space /><q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section class="i3d-order-body">
          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-md-6">
              <q-select v-model="form.proveedor" :options="provOptions" outlined dense clearable label="Proveedor" emit-value map-options />
            </div>
            <div class="col-6 col-md-3"><q-input v-model="form.fecha" outlined dense type="date" label="Fecha" stack-label /></div>
            <div class="col-6 col-md-3"><q-input v-model="form.comprobante" outlined dense label="Comprobante" /></div>
            <div class="col-12 col-md-6"><q-select v-model="form.formaPago" :options="formasPago" outlined dense label="Forma de pago" emit-value map-options /></div>
          </div>

          <div class="text-subtitle2 q-mb-sm">Ítems</div>
          <div class="row q-col-gutter-sm q-mb-sm items-end">
            <div class="col-6 col-md-3">
              <q-select v-model="draft.articuloTipo" :options="[{label:'Insumo',value:'Insumo'},{label:'Filamento',value:'Filamento'}]"
                        outlined dense label="Tipo" emit-value map-options @update:model-value="onTipoChange" />
            </div>
            <div class="col-6 col-md-4">
              <q-select v-model="draft.articuloId" :options="articuloOptions" outlined dense clearable use-input
                        label="Artículo existente (opcional)" emit-value map-options @filter="filterArticulos" @update:model-value="onArticuloPick" />
            </div>
            <div class="col-12 col-md-5"><q-input v-model="draft.descripcion" outlined dense label="Descripción" /></div>
            <div class="col-4 col-md-3"><q-input v-model.number="draft.cantidad" type="number" outlined dense label="Cantidad" /></div>
            <div class="col-4 col-md-3"><q-input v-model.number="draft.precioUnitario" type="number" outlined dense label="Precio unit." prefix="$" /></div>
            <div class="col-4 col-md-3"><q-btn color="primary" outline icon="add" label="Agregar" class="full-width" @click="addItem" /></div>
          </div>

          <q-markup-table flat bordered dense v-if="form.items.length">
            <thead><tr><th class="text-left">Tipo</th><th class="text-left">Descripción</th><th class="text-right">Cant.</th><th class="text-right">Precio</th><th class="text-right">Subtotal</th><th></th></tr></thead>
            <tbody>
              <tr v-for="(it, idx) in form.items" :key="idx">
                <td>{{ it.articuloTipo }}</td><td>{{ it.descripcion }}</td>
                <td class="text-right mono">{{ it.cantidad }}</td><td class="text-right mono">{{ money(it.precioUnitario) }}</td>
                <td class="text-right mono">{{ money(it.cantidad * it.precioUnitario) }}</td>
                <td class="text-center"><q-btn flat dense round icon="close" size="sm" color="negative" @click="form.items.splice(idx,1)" /></td>
              </tr>
            </tbody>
          </q-markup-table>
        </q-card-section>
        <q-separator />
        <q-card-actions align="right">
          <div class="i3d-order-total">Total: {{ money(comprasTotal) }}</div>
          <q-space />
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Registrar compra" :loading="saving" @click="onSubmit" />
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
import { useCrudResource } from '../../composables/useCrudResource.js';
import { fetchCompras, createCompra, fetchProveedores, fetchInsumos, fetchFilamentos } from '../../services/api.js';
import { formatMoney, formatDate } from '../../utils/format.js';
import '../../styles/dashboard-unified.css';

const $q = useQuasar();
const money = (n) => formatMoney(n);
const date = (d) => formatDate(d);

const formasPago = [
  { label: 'Efectivo', value: 'efectivo' }, { label: 'Transferencia', value: 'transferencia' },
  { label: 'Débito', value: 'debito' }, { label: 'Crédito', value: 'credito' },
  { label: 'MercadoPago', value: 'mercadopago' }, { label: 'Otro', value: 'otro' }
];

const { items, pagination, loading, saving, reload, goToPage, create } = useCrudResource({
  fetchFn: fetchCompras, createFn: createCompra, updateFn: () => {}, deleteFn: () => {}, label: 'la compra'
});

const columns = [
  { name: 'fecha', label: 'Fecha', field: 'fecha', mono: true },
  { name: 'proveedor', label: 'Proveedor', field: 'proveedor' },
  { name: 'comprobante', label: 'Comprobante', field: 'comprobante' },
  { name: 'items', label: 'Ítems', field: 'items' },
  { name: 'total', label: 'Total', field: 'total', align: 'right', mono: true }
];

const fDesde = ref('');
const fHasta = ref('');
const dialog = ref(false);
const form = ref({ proveedor: null, fecha: '', comprobante: '', formaPago: 'efectivo', items: [] });
const draft = ref({ articuloTipo: 'Insumo', articuloId: null, descripcion: '', cantidad: 1, precioUnitario: 0 });
const provOptions = ref([]);
const insumos = ref([]);
const filamentos = ref([]);
const articuloOptions = ref([]);

const detailDialog = ref(false);
const current = ref({});
const detailFields = computed(() => {
  const c = current.value;
  return [
    { label: 'Proveedor', value: c.proveedor?.nombre, cols: 6 },
    { label: 'Fecha', value: date(c.fecha), mono: true, cols: 6 },
    { label: 'Comprobante', value: c.comprobante, cols: 6 },
    { label: 'Forma de pago', value: c.formaPago, cols: 6 },
    { label: 'Total', value: money(c.total), mono: true, cols: 6 }
  ];
});

const comprasTotal = computed(() => form.value.items.reduce((a, i) => a + i.cantidad * i.precioUnitario, 0));

function onFilter() { reload({ desde: fDesde.value, hasta: fHasta.value }); }
function openDetail(row) { current.value = { ...row }; detailDialog.value = true; }

function openCreate() {
  form.value = { proveedor: null, fecha: new Date().toISOString().slice(0, 10), comprobante: '', formaPago: 'efectivo', items: [] };
  draft.value = { articuloTipo: 'Insumo', articuloId: null, descripcion: '', cantidad: 1, precioUnitario: 0 };
  refreshArticuloOptions();
  dialog.value = true;
}

function currentList() { return draft.value.articuloTipo === 'Filamento' ? filamentos.value : insumos.value; }
function optLabel(a) { return draft.value.articuloTipo === 'Filamento' ? `${a.identificadorBobina} — ${a.marca || ''} ${a.tipo}` : `${a.nombre}`; }
function refreshArticuloOptions() { articuloOptions.value = currentList().map((a) => ({ label: optLabel(a), value: a._id })); }
function onTipoChange() { draft.value.articuloId = null; refreshArticuloOptions(); }
function filterArticulos(val, update) {
  update(() => {
    const n = (val || '').toLowerCase();
    articuloOptions.value = currentList().filter((a) => optLabel(a).toLowerCase().includes(n)).map((a) => ({ label: optLabel(a), value: a._id }));
  });
}
function onArticuloPick(id) { if (!id) return; const a = currentList().find((x) => x._id === id); if (a) draft.value.descripcion = optLabel(a); }

function addItem() {
  if (!draft.value.descripcion) { $q.notify({ type: 'warning', message: 'Ingresá una descripción' }); return; }
  if (!draft.value.cantidad || draft.value.cantidad <= 0) { $q.notify({ type: 'warning', message: 'Cantidad inválida' }); return; }
  form.value.items.push({ ...draft.value });
  draft.value = { articuloTipo: draft.value.articuloTipo, articuloId: null, descripcion: '', cantidad: 1, precioUnitario: 0 };
}

async function onSubmit() {
  if (!form.value.items.length) { $q.notify({ type: 'warning', message: 'Agregá al menos un ítem' }); return; }
  const payload = {
    proveedor: form.value.proveedor || undefined,
    fecha: form.value.fecha || undefined,
    comprobante: form.value.comprobante || undefined,
    formaPago: form.value.formaPago,
    items: form.value.items.map((i) => ({ articuloTipo: i.articuloTipo, articuloId: i.articuloId || undefined, descripcion: i.descripcion, cantidad: i.cantidad, precioUnitario: i.precioUnitario }))
  };
  const okDone = await create(payload);
  if (okDone) dialog.value = false;
}

onMounted(async () => {
  await reload();
  const [provs, ins, fil] = await Promise.all([fetchProveedores({ limit: 200 }), fetchInsumos({ limit: 200 }), fetchFilamentos({ limit: 200 })]);
  provOptions.value = (provs.items || []).map((p) => ({ label: p.nombre, value: p._id }));
  insumos.value = ins.items || [];
  filamentos.value = fil.items || [];
});
</script>

<style scoped>
.i3d-order-card { width: 820px; max-width: 95vw; }
.i3d-order-body { max-height: 72vh; overflow-y: auto; }
.i3d-order-total { font-weight: 700; font-size: 16px; color: var(--text-primary); }
</style>
