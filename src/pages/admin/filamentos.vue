<template>
  <div class="i3d-page-shell">
    <div class="i3d-page-header">
      <div>
        <h1 class="i3d-page-title">Filamentos</h1>
        <p class="i3d-page-subtitle">Control por bobina con costo por gramo automático</p>
      </div>
      <q-btn color="primary" unelevated icon="add" label="Nueva bobina" no-caps @click="openCreate" />
    </div>

    <div class="i3d-toolbar">
      <q-input v-model="search" class="i3d-grow" outlined dense debounce="350"
               label="Buscar por marca, color o ID de bobina" @update:model-value="onFilter" clearable>
        <template #prepend><q-icon name="search" /></template>
      </q-input>
      <q-select v-model="fTipo" :options="tipos" outlined dense clearable label="Tipo de filamento"
                emit-value map-options style="width:180px" @update:model-value="onFilter" />
    </div>

    <ResourceList
      :rows="items" :columns="columns" :loading="loading" :pagination="pagination"
      empty-label="No hay bobinas cargadas." @view="openDetail" @update:page="goToPage"
    >
      <template #cell-disponible="{ row }">
        <div class="mono">{{ row.pesoDisponible }} / {{ row.pesoOriginal }} g</div>
        <q-linear-progress :value="row.pesoDisponible / row.pesoOriginal" :color="barColor(row)" size="6px" class="q-mt-xs rounded-borders" style="max-width:140px" />
      </template>
      <template #cell-costoPorGramo="{ value }">{{ money(value) }}</template>
      <template #cell-estado="{ value }"><StatusBadge :label="value" :status="value" /></template>
      <template #actions="{ row }">
        <q-btn flat dense round icon="remove_circle_outline" color="orange" size="sm" @click="openConsumo(row)"><q-tooltip>Registrar consumo</q-tooltip></q-btn>
        <q-btn flat dense round icon="edit" size="sm" @click="openEdit(row)" />
        <q-btn flat dense round icon="delete" color="negative" size="sm" @click="confirmDelete(row)" />
      </template>
    </ResourceList>

    <ResourceDialog
      v-model="dialog" :title="editing ? 'Editar bobina' : 'Nueva bobina'"
      :fields="fields" :initial="current" :saving="saving" @submit="onSubmit"
    />

    <!-- Vista de la bobina -->
    <RecordDetailDialog
      v-model="detailDialog" :title="detailTitle" :subtitle="current.identificadorBobina" :fields="detailFields"
    >
      <template #header-side><StatusBadge :label="current.estado" :status="current.estado" /></template>
      <div class="text-subtitle2 q-mb-xs">Historial de movimientos</div>
      <LoadingState :loading="movLoading" :empty="!movLoading && movimientos.length === 0" empty-label="Sin movimientos.">
        <q-list dense bordered class="rounded-borders">
          <q-item v-for="m in movimientos" :key="m._id">
            <q-item-section>
              <q-item-label>{{ m.tipo }} <span class="text-grey">· {{ m.referencia }}</span></q-item-label>
              <q-item-label caption class="mono">{{ dateTime(m.createdAt) }}</q-item-label>
            </q-item-section>
            <q-item-section side><span class="mono" :class="m.cantidad < 0 ? 'text-negative' : 'text-positive'">{{ m.cantidad > 0 ? '+' : '' }}{{ m.cantidad }} g</span></q-item-section>
          </q-item>
        </q-list>
      </LoadingState>
    </RecordDetailDialog>

    <!-- Consumo -->
    <q-dialog v-model="consumoDialog">
      <q-card style="width:400px;max-width:92vw">
        <q-card-section><div class="text-h6">Registrar consumo</div></q-card-section>
        <q-separator />
        <q-card-section>
          <div class="q-mb-sm text-caption text-grey">{{ consumoTarget?.marca }} {{ consumoTarget?.tipo }} {{ consumoTarget?.color }} — disponible {{ consumoTarget?.pesoDisponible }} g</div>
          <q-input v-model.number="consumoGramos" type="number" label="Gramos consumidos" outlined dense />
          <q-input v-model="consumoRef" label="Referencia (opcional)" outlined dense class="q-mt-sm" />
        </q-card-section>
        <q-separator />
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Descontar" :loading="saving" @click="doConsumo" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import ResourceList from '../../components/ResourceList.vue';
import ResourceDialog from '../../components/ResourceDialog.vue';
import RecordDetailDialog from '../../components/RecordDetailDialog.vue';
import StatusBadge from '../../components/StatusBadge.vue';
import LoadingState from '../../components/LoadingState.vue';
import { useCrudResource } from '../../composables/useCrudResource.js';
import {
  fetchFilamentos, createFilamento, updateFilamento, deleteFilamento, consumirFilamento, fetchFilamentoMovimientos
} from '../../services/api.js';
import { formatMoney, formatDateTime } from '../../utils/format.js';
import '../../styles/dashboard-unified.css';

const $q = useQuasar();
const money = (n) => formatMoney(n);
const dateTime = (d) => formatDateTime(d);

const { items, pagination, loading, saving, reload, goToPage, create, update, remove } = useCrudResource({
  fetchFn: fetchFilamentos, createFn: createFilamento, updateFn: updateFilamento, deleteFn: deleteFilamento, label: 'la bobina'
});

const tipos = ['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'NYLON', 'OTRO'];

const columns = [
  { name: 'identificadorBobina', label: 'ID Bobina', field: 'identificadorBobina', mono: true },
  { name: 'marca', label: 'Marca', field: 'marca' },
  { name: 'tipo', label: 'Tipo', field: 'tipo' },
  { name: 'color', label: 'Color', field: 'color' },
  { name: 'disponible', label: 'Disponible', field: 'pesoDisponible' },
  { name: 'costoPorGramo', label: 'Costo/g', field: 'costoPorGramo', align: 'right', mono: true },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'center' }
];

const fields = [
  { name: 'identificadorBobina', label: 'ID Bobina', cols: 6, required: true },
  { name: 'marca', label: 'Marca', cols: 6 },
  { name: 'tipo', label: 'Tipo', type: 'select', cols: 6, default: 'PLA', options: tipos.map((t) => ({ label: t, value: t })) },
  { name: 'color', label: 'Color', cols: 6 },
  { name: 'pesoOriginal', label: 'Peso original (g)', type: 'number', cols: 6, default: 1000, required: true },
  { name: 'pesoDisponible', label: 'Peso disponible (g)', type: 'number', cols: 6, hint: 'Vacío = lleno' },
  { name: 'precioCompra', label: 'Precio de compra', type: 'number', cols: 6, prefix: '$', required: true },
  { name: 'notas', label: 'Notas', type: 'textarea', cols: 12 }
];

const search = ref('');
const fTipo = ref(null);
const dialog = ref(false);
const editing = ref(false);
const current = ref({});

const detailDialog = ref(false);
const movimientos = ref([]);
const movLoading = ref(false);
const detailTitle = computed(() => `${current.value.marca || ''} ${current.value.tipo || ''} ${current.value.color || ''}`.trim() || 'Bobina');
const detailFields = computed(() => {
  const f = current.value;
  return [
    { label: 'Marca', value: f.marca, cols: 4 },
    { label: 'Tipo', value: f.tipo, cols: 4 },
    { label: 'Color', value: f.color, cols: 4 },
    { label: 'Peso original', value: `${f.pesoOriginal ?? 0} g`, mono: true, cols: 4 },
    { label: 'Disponible', value: `${f.pesoDisponible ?? 0} g`, mono: true, cols: 4 },
    { label: 'Costo por gramo', value: money(f.costoPorGramo), mono: true, cols: 4 },
    { label: 'Precio de compra', value: money(f.precioCompra), mono: true, cols: 4 },
    { label: 'Proveedor', value: f.proveedor?.nombre, cols: 4 },
    { label: 'Fecha de compra', value: f.fechaCompra ? new Date(f.fechaCompra).toLocaleDateString('es-AR') : '—', mono: true, cols: 4 }
  ];
});

const barColor = (r) => {
  const pct = r.pesoDisponible / r.pesoOriginal;
  if (pct <= 0.15) return 'negative';
  if (pct <= 0.4) return 'orange';
  return 'secondary';
};

function onFilter() { reload({ q: search.value, filter_tipo: fTipo.value }); }
function openCreate() { editing.value = false; current.value = {}; dialog.value = true; }
function openEdit(row) { editing.value = true; current.value = { ...row }; dialog.value = true; }

async function openDetail(row) {
  current.value = { ...row };
  detailDialog.value = true;
  movLoading.value = true;
  movimientos.value = [];
  try { movimientos.value = await fetchFilamentoMovimientos(row._id); }
  finally { movLoading.value = false; }
}

async function onSubmit(payload) {
  const okDone = editing.value ? await update(current.value._id, payload) : await create(payload);
  if (okDone) dialog.value = false;
}
function confirmDelete(row) {
  $q.dialog({ title: 'Eliminar bobina', message: `¿Eliminar ${row.identificadorBobina}?`, cancel: true, persistent: true })
    .onOk(() => remove(row._id));
}

const consumoDialog = ref(false);
const consumoTarget = ref(null);
const consumoGramos = ref(0);
const consumoRef = ref('');
function openConsumo(row) { consumoTarget.value = row; consumoGramos.value = 0; consumoRef.value = ''; consumoDialog.value = true; }
async function doConsumo() {
  if (!consumoGramos.value || consumoGramos.value <= 0) { $q.notify({ type: 'warning', message: 'Ingresá los gramos a consumir' }); return; }
  saving.value = true;
  try {
    const res = await consumirFilamento(consumoTarget.value._id, { gramos: consumoGramos.value, referencia: consumoRef.value });
    $q.notify({ type: 'positive', message: `Consumo registrado. Costo material: ${money(res.costoConsumido)}` });
    consumoDialog.value = false;
    await reload();
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message || 'No se pudo registrar el consumo' });
  } finally {
    saving.value = false;
  }
}

onMounted(() => reload());
</script>
