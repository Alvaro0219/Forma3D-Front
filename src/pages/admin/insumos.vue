<template>
  <div class="i3d-page-shell">
    <div class="i3d-page-header">
      <div>
        <h1 class="i3d-page-title">Insumos</h1>
        <p class="i3d-page-subtitle">Stock de imanes, aros, vasos y otros insumos</p>
      </div>
      <q-btn color="primary" unelevated no-caps @click="openCreate"><AppIcon name="add" :size="16" :bordered="false" class="q-mr-xs" />Nuevo insumo</q-btn>
    </div>

    <div class="i3d-toolbar">
      <q-input v-model="search" class="i3d-grow" outlined dense debounce="350"
               label="Buscar por nombre o categoría" @update:model-value="onSearch" clearable>
        <template #prepend><AppIcon name="search" :size="18" /></template>
      </q-input>
    </div>

    <ResourceList
      :rows="items" :columns="columns" :loading="loading" :pagination="pagination"
      empty-label="No hay insumos cargados." @view="openDetail" @update:page="goToPage"
    >
      <template #cell-stock="{ row }">
        <span :class="{ 'text-negative text-weight-bold': row.stockMinimo > 0 && row.stock <= row.stockMinimo }" class="mono">
          {{ row.stock }} {{ row.unidad }}
        </span>
      </template>
      <template #cell-costo="{ value }">{{ money(value) }}</template>
      <template #actions="{ row }">
        <q-btn flat dense round color="orange" size="sm" @click="openAjuste(row)"><AppIcon name="tune" :size="16" /><q-tooltip>Ajustar stock</q-tooltip></q-btn>
        <q-btn flat dense round size="sm" @click="openEdit(row)"><AppIcon name="edit" :size="16" /></q-btn>
        <q-btn flat dense round color="negative" size="sm" @click="confirmDelete(row)"><AppIcon name="delete" :size="16" /></q-btn>
      </template>
    </ResourceList>

    <ResourceDialog
      v-model="dialog" :title="editing ? 'Editar insumo' : 'Nuevo insumo'"
      :fields="fields" :initial="current" :saving="saving" @submit="onSubmit"
    />

    <RecordDetailDialog
      v-model="detailDialog" :title="current.nombre || 'Insumo'" :fields="detailFields"
    >
      <div class="text-subtitle2 q-mb-xs">Historial de movimientos</div>
      <LoadingState :loading="movLoading" :empty="!movLoading && movimientos.length === 0" empty-label="Sin movimientos.">
        <q-list dense bordered class="rounded-borders">
          <q-item v-for="m in movimientos" :key="m._id">
            <q-item-section>
              <q-item-label>{{ m.tipo }} <span class="text-grey">· {{ m.referencia }}</span></q-item-label>
              <q-item-label caption class="mono">{{ dateTime(m.createdAt) }}</q-item-label>
            </q-item-section>
            <q-item-section side><span class="mono" :class="m.cantidad < 0 ? 'text-negative' : 'text-positive'">{{ m.cantidad > 0 ? '+' : '' }}{{ m.cantidad }} {{ m.unidad }}</span></q-item-section>
          </q-item>
        </q-list>
      </LoadingState>
    </RecordDetailDialog>

    <q-dialog v-model="ajusteDialog">
      <q-card style="width:380px;max-width:92vw">
        <q-card-section><div class="text-h6">Ajustar stock</div></q-card-section>
        <q-separator />
        <q-card-section>
          <div class="q-mb-sm text-caption text-grey">{{ ajusteTarget?.nombre }} — actual {{ ajusteTarget?.stock }} {{ ajusteTarget?.unidad }}</div>
          <q-input v-model.number="ajusteCantidad" type="number" label="Cantidad (+/-)" outlined dense hint="Positivo suma, negativo resta" />
          <q-input v-model="ajusteMotivo" label="Motivo" outlined dense class="q-mt-sm" />
        </q-card-section>
        <q-separator />
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Aplicar" :loading="saving" @click="doAjuste" />
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
import LoadingState from '../../components/LoadingState.vue';
import AppIcon from '../../components/AppIcon.vue';
import { useCrudResource } from '../../composables/useCrudResource.js';
import { fetchInsumos, createInsumo, updateInsumo, deleteInsumo, ajustarInsumo, fetchInsumoMovimientos } from '../../services/api.js';
import { formatMoney, formatDateTime } from '../../utils/format.js';
import '../../styles/dashboard-unified.css';

const $q = useQuasar();
const money = (n) => formatMoney(n);
const dateTime = (d) => formatDateTime(d);

const { items, pagination, loading, saving, reload, goToPage, create, update, remove } = useCrudResource({
  fetchFn: fetchInsumos, createFn: createInsumo, updateFn: updateInsumo, deleteFn: deleteInsumo, label: 'el insumo'
});

const columns = [
  { name: 'nombre', label: 'Nombre', field: 'nombre', sortable: true },
  { name: 'categoria', label: 'Categoría', field: 'categoria' },
  { name: 'stock', label: 'Stock', field: 'stock', align: 'right' },
  { name: 'costo', label: 'Costo unit.', field: 'costo', align: 'right', mono: true }
];

const fields = [
  { name: 'nombre', label: 'Nombre', cols: 6, required: true },
  { name: 'categoria', label: 'Categoría', cols: 6, default: 'general' },
  { name: 'unidad', label: 'Unidad', cols: 4, default: 'unidad' },
  { name: 'stock', label: 'Stock', type: 'number', cols: 4 },
  { name: 'stockMinimo', label: 'Stock mínimo', type: 'number', cols: 4 },
  { name: 'costo', label: 'Costo unitario', type: 'number', cols: 6, prefix: '$' },
  { name: 'notas', label: 'Notas', type: 'textarea', cols: 12 }
];

const search = ref('');
const dialog = ref(false);
const editing = ref(false);
const current = ref({});

const detailDialog = ref(false);
const movimientos = ref([]);
const movLoading = ref(false);
const detailFields = computed(() => {
  const i = current.value;
  return [
    { label: 'Categoría', value: i.categoria, cols: 4 },
    { label: 'Unidad', value: i.unidad, cols: 4 },
    { label: 'Stock actual', value: `${i.stock ?? 0} ${i.unidad || ''}`, mono: true, cols: 4 },
    { label: 'Stock mínimo', value: `${i.stockMinimo ?? 0}`, mono: true, cols: 4 },
    { label: 'Costo unitario', value: money(i.costo), mono: true, cols: 4 },
    { label: 'Proveedor', value: i.proveedor?.nombre, cols: 4 },
    { label: 'Notas', value: i.notas, cols: 12 }
  ];
});

function onSearch() { reload({ q: search.value || '' }); }
function openCreate() { editing.value = false; current.value = {}; dialog.value = true; }
function openEdit(row) { editing.value = true; current.value = { ...row }; dialog.value = true; }

async function openDetail(row) {
  current.value = { ...row };
  detailDialog.value = true;
  movLoading.value = true; movimientos.value = [];
  try { movimientos.value = await fetchInsumoMovimientos(row._id); }
  finally { movLoading.value = false; }
}

async function onSubmit(payload) {
  const okDone = editing.value ? await update(current.value._id, payload) : await create(payload);
  if (okDone) dialog.value = false;
}
function confirmDelete(row) {
  $q.dialog({ title: 'Eliminar insumo', message: `¿Eliminar "${row.nombre}"?`, cancel: true, persistent: true })
    .onOk(() => remove(row._id));
}

const ajusteDialog = ref(false);
const ajusteTarget = ref(null);
const ajusteCantidad = ref(0);
const ajusteMotivo = ref('');
function openAjuste(row) { ajusteTarget.value = row; ajusteCantidad.value = 0; ajusteMotivo.value = ''; ajusteDialog.value = true; }
async function doAjuste() {
  if (!ajusteCantidad.value) { $q.notify({ type: 'warning', message: 'Ingresá una cantidad' }); return; }
  saving.value = true;
  try {
    await ajustarInsumo(ajusteTarget.value._id, { cantidad: ajusteCantidad.value, motivo: ajusteMotivo.value });
    $q.notify({ type: 'positive', message: 'Stock ajustado' });
    ajusteDialog.value = false;
    await reload();
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message || 'No se pudo ajustar' });
  } finally {
    saving.value = false;
  }
}

onMounted(() => reload());
</script>
