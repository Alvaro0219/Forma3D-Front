<template>
  <div class="i3d-page-shell">
    <div class="i3d-page-header">
      <div>
        <h1 class="i3d-page-title">Impresiones</h1>
        <p class="i3d-page-subtitle">Trabajos de impresión, consumo de bobinas y costo real</p>
      </div>
      <q-btn color="primary" unelevated no-caps @click="openCreate"><AppIcon name="add" :size="16" :bordered="false" class="q-mr-xs" />Nueva impresión</q-btn>
    </div>

    <div class="i3d-toolbar">
      <q-select v-model="fEstado" :options="estados" outlined dense clearable label="Filtrar por estado"
                emit-value map-options style="width:220px" @update:model-value="onFilter" />
    </div>

    <ResourceList
      :rows="items" :columns="columns" :loading="loading" :pagination="pagination"
      empty-label="No hay impresiones registradas." @view="openDetail" @update:page="goToPage"
    >
      <template #cell-producto="{ row }">{{ row.producto?.nombre || 'Sin producto' }}</template>
      <template #cell-impresora="{ row }">{{ row.impresora?.modelo || '—' }}</template>
      <template #cell-bobinas="{ row }">
        <span v-if="!(row.filamentos || []).length" class="text-grey">—</span>
        <span v-else-if="row.filamentos.length === 1" class="i3d-color-chip">
          <ColorDot :color="row.filamentos[0].filamento?.color" />
          <span>{{ bobinaId(row.filamentos[0].filamento) }}</span>
        </span>
        <span v-else class="i3d-color-chip">
          <span class="i3d-color-stack">
            <ColorDot
              v-for="(b, i) in row.filamentos" :key="i"
              :color="b.filamento?.color" class="i3d-color-stack-dot"
            />
          </span>
          <span>{{ row.filamentos.length }} bobinas</span>
        </span>
      </template>
      <template #cell-piezas="{ value }">{{ num(value) }}</template>
      <template #cell-peso="{ value }">{{ grams(value) }}</template>
      <template #cell-tiempo="{ value }">{{ fmtMin(value) }}</template>
      <template #cell-costo="{ row }">
        <span v-if="row.consumoRegistrado" class="i3d-highlight-value">{{ money(row.costoTotal) }}</span>
        <span v-else class="text-grey">—</span>
      </template>
      <template #cell-estado="{ value }"><StatusBadge :label="value" :status="value" /></template>
      <template #actions="{ row }">
        <q-btn
          v-if="row.estado === 'terminada' && !row.consumoRegistrado"
          flat dense round color="warning" size="sm" @click="finalizar(row)"
        >
          <AppIcon name="warning" :size="16" /><q-tooltip>Terminada sin descontar stock — descontar ahora</q-tooltip>
        </q-btn>
        <q-btn flat dense round size="sm">
          <AppIcon name="swap_horiz" :size="16" />
          <q-menu>
            <q-list dense>
              <q-item v-for="e in estados" :key="e.value" clickable v-close-popup @click="setEstado(row, e.value)">
                <q-item-section>{{ e.label }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
          <q-tooltip>Cambiar estado</q-tooltip>
        </q-btn>
        <q-btn flat dense round size="sm" @click="openEdit(row)"><AppIcon name="edit" :size="16" color="tech" /></q-btn>
        <q-btn flat dense round color="negative" size="sm" @click="confirmDelete(row)"><AppIcon name="delete" :size="16" color="danger" /></q-btn>
      </template>
    </ResourceList>

    <!-- Crear / editar impresion -->
    <q-dialog v-model="dialog" persistent>
      <q-card class="i3d-imp-dialog">
        <q-card-section class="row items-center">
          <div class="text-h6">{{ editing ? 'Editar impresión' : 'Nueva impresión' }}</div>
          <q-space /><q-btn flat round dense v-close-popup><AppIcon name="close" :size="18" /></q-btn>
        </q-card-section>
        <q-separator />
        <q-card-section class="i3d-imp-dialog-body">
          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-md-6">
              <q-select v-model="form.producto" :options="productoOptions" outlined dense use-input
                        label="Producto *" emit-value map-options @filter="filterProductos" />
            </div>
            <div class="col-12 col-md-6">
              <q-select v-model="form.impresora" :options="impresoraOptions" outlined dense
                        label="Impresora *" emit-value map-options />
            </div>
            <div class="col-6 col-md-4">
              <q-input v-model.number="form.cantidadPiezas" type="number" outlined dense label="Cantidad de piezas" min="1" />
            </div>
            <div class="col-6 col-md-4">
              <q-input v-model.number="form.tiempo" type="number" outlined dense label="Tiempo de impresión (min)" min="0" />
            </div>
            <div class="col-12 col-md-4">
              <q-select v-model="form.estado" :options="estados" outlined dense label="Estado" emit-value map-options />
            </div>
          </div>

          <!-- Bobinas usadas (multicolor) -->
          <div class="i3d-bob">
            <div class="i3d-bob-head">
              <span>Bobinas usadas</span>
              <span class="i3d-bob-hint">Al finalizar se descuentan estos gramos de cada bobina</span>
            </div>

            <div class="row q-col-gutter-sm items-end q-mb-sm">
              <div class="col-7">
                <q-select v-model="draftBobina.filamento" :options="filamentoOptions" outlined dense clearable use-input
                          label="Bobina" emit-value map-options @filter="filterFilamentos">
                  <template #option="scope">
                    <q-item v-bind="scope.itemProps">
                      <q-item-section>
                        <div class="i3d-color-chip">
                          <ColorDot :color="scope.opt.color" />
                          <span>{{ scope.opt.label }}</span>
                        </div>
                      </q-item-section>
                    </q-item>
                  </template>
                  <template #selected>
                    <div v-if="selectedBobinaOption" class="i3d-color-chip">
                      <ColorDot :color="selectedBobinaOption.color" />
                      <span>{{ selectedBobinaOption.label }}</span>
                    </div>
                  </template>
                </q-select>
              </div>
              <div class="col-3">
                <q-input v-model.number="draftBobina.gramos" type="number" outlined dense label="Gramos" min="0" />
              </div>
              <div class="col-2">
                <q-btn color="primary" outline dense class="i3d-add-btn i3d-add-btn-icon" @click="addBobina"><AppIcon name="add" :size="16" /></q-btn>
              </div>
            </div>

            <ItemsTable
              v-if="bobinas.length" :rows="bobinas" :columns="bobinaColumns" has-actions
              foot-label="Total" :foot-value="`${totalGramos} g`"
            >
              <template #cell-bobina="{ row }">
                <div class="i3d-color-chip"><ColorDot :color="row.color" /><span>{{ row.identificadorBobina }}</span></div>
              </template>
              <template #actions="{ index }">
                <q-btn flat dense round size="sm" color="negative" @click="bobinas.splice(index,1)"><AppIcon name="close" :size="14" /></q-btn>
              </template>
            </ItemsTable>
            <div v-else class="text-grey q-pa-sm">Sin bobinas cargadas.</div>
          </div>

          <q-input v-model="form.notas" type="textarea" autogrow outlined dense label="Notas" class="q-mt-md" />
        </q-card-section>
        <q-separator />
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Guardar" :loading="saving" @click="onSubmit" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Detalle -->
    <RecordDetailDialog
      v-model="detailDialog" :title="`Impresión #${detail.numero}`"
      :subtitle="detail.producto?.nombre" :fields="detailFields"
    >
      <template #header-side><StatusBadge :label="detail.estado" :status="detail.estado" /></template>

      <div class="text-subtitle2 q-mb-xs">Bobinas consumidas</div>
      <ItemsTable v-if="detail.filamentos?.length" class="q-mb-md" :rows="detail.filamentos" :columns="bobinaColumns">
        <template #cell-bobina="{ row }">
          <div class="i3d-color-chip"><ColorDot :color="row.filamento?.color" /><span>{{ bobinaId(row.filamento) }}</span></div>
        </template>
      </ItemsTable>
      <div v-else class="text-grey q-mb-md">Sin bobinas cargadas.</div>

      <template v-if="detail.consumoRegistrado">
        <div class="i3d-k q-mb-xs">Costo (calculado por el sistema)</div>
        <div class="row q-col-gutter-sm">
          <div class="col-6">Material <b class="mono float-right">{{ money(detail.costoMaterial) }}</b></div>
          <div class="col-6">Total <b class="mono float-right i3d-highlight-value">{{ money(detail.costoTotal) }}</b></div>
        </div>
      </template>
      <div v-if="detail.notas" class="q-mt-md"><div class="i3d-k">Notas</div>{{ detail.notas }}</div>
    </RecordDetailDialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import ResourceList from '../../components/ResourceList.vue';
import RecordDetailDialog from '../../components/RecordDetailDialog.vue';
import StatusBadge from '../../components/StatusBadge.vue';
import AppIcon from '../../components/AppIcon.vue';
import ColorDot from '../../components/ColorDot.vue';
import ItemsTable from '../../components/ItemsTable.vue';
import { useCrudResource } from '../../composables/useCrudResource.js';
import {
  fetchImpresiones, createImpresion, updateImpresion, deleteImpresion, registrarConsumoImpresion,
  fetchProductos, fetchFilamentos, fetchImpresoras
} from '../../services/api.js';
import { formatMoney, formatNumber, formatGrams } from '../../utils/format.js';
import '../../styles/dashboard-unified.css';

const $q = useQuasar();
const money = (n) => formatMoney(n);
const num = (n) => formatNumber(n);
const grams = (n) => formatGrams(n);
const estados = [
  { label: 'PENDIENTE', value: 'pendiente' },
  { label: 'IMPRIMIENDO', value: 'imprimiendo' },
  { label: 'TERMINADA', value: 'terminada' },
  { label: 'FALLIDA', value: 'fallida' },
  { label: 'CANCELADA', value: 'cancelada' }
];

const { items, pagination, loading, saving, reload, goToPage, create, update, remove } = useCrudResource({
  fetchFn: fetchImpresiones, createFn: createImpresion, updateFn: updateImpresion, deleteFn: deleteImpresion, label: 'la impresión'
});

const columns = [
  { name: 'numero', label: 'N°', field: 'numero', mono: true },
  { name: 'producto', label: 'Producto', field: 'producto', icon: 'category' },
  { name: 'impresora', label: 'Impresora', field: 'impresora', icon: 'print' },
  { name: 'bobinas', label: 'Bobinas', field: 'filamentos', icon: 'grain' },
  { name: 'piezas', label: 'Piezas', field: 'cantidadPiezas', align: 'right', mono: true, icon: 'layers' },
  { name: 'peso', label: 'Peso', field: 'pesoTotal', align: 'right', mono: true, icon: 'weight' },
  { name: 'tiempo', label: 'Tiempo', field: 'tiempo', align: 'right', mono: true, icon: 'schedule' },
  { name: 'costo', label: 'Costo', field: 'costoTotal', align: 'right', mono: true, icon: 'price' },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'center', titleSide: true }
];

const fEstado = ref(null);
const dialog = ref(false);
const editing = ref(false);
const editId = ref(null);
const detailDialog = ref(false);
const detail = ref({});

const form = ref(emptyForm());
const bobinas = ref([]);
const bobinaColumns = [
  { name: 'bobina', label: 'Bobina' },
  { name: 'gramos', label: 'Gramos', align: 'right', mono: true, format: (v) => formatGrams(v) }
];
const draftBobina = ref({ filamento: null, gramos: null });

const productos = ref([]);
const filamentos = ref([]);
const impresoras = ref([]);
const productoOptions = ref([]);
const filamentoOptions = ref([]);
const impresoraOptions = ref([]);

function emptyForm() {
  return { producto: null, impresora: null, cantidadPiezas: 1, tiempo: null, estado: 'pendiente', notas: '' };
}

const totalGramos = computed(() => bobinas.value.reduce((a, b) => a + (Number(b.gramos) || 0), 0));

// El tiempo de impresion se carga en minutos: se muestra siempre en minutos, sin convertir a horas.
const fmtMin = (m) => (m ? `${formatNumber(m)} min` : '—');

const bobinaLabel = (f) => (f ? `${f.identificadorBobina || ''} ${f.marca || ''} ${f.tipo || ''} ${f.color || ''}`.trim() : '—');
const bobinaId = (f) => f?.identificadorBobina || '—';
const selectedBobinaOption = computed(() => filamentoOptions.value.find((o) => o.value === draftBobina.value.filamento) || null);

const detailFields = computed(() => {
  const d = detail.value;
  return [
    { label: 'Producto', value: d.producto?.nombre, cols: 6 },
    { label: 'Impresora', value: d.impresora?.modelo, cols: 6 },
    { label: 'Piezas', value: `${d.cantidadPiezas ?? ''}`, mono: true, cols: 4 },
    { label: 'Peso total', value: `${d.pesoTotal ?? 0} g`, mono: true, cols: 4 },
    { label: 'Tiempo', value: fmtMin(d.tiempo), mono: true, cols: 4 }
  ];
});

function onFilter() { reload({ filter_estado: fEstado.value }); }

function resetDraft() { draftBobina.value = { filamento: null, gramos: null }; }

function openCreate() {
  editing.value = false; editId.value = null;
  form.value = emptyForm(); bobinas.value = []; resetDraft();
  dialog.value = true;
}
function openEdit(imp) {
  editing.value = true; editId.value = imp._id;
  form.value = {
    producto: imp.producto?._id || imp.producto || null,
    impresora: imp.impresora?._id || imp.impresora || null,
    cantidadPiezas: imp.cantidadPiezas,
    tiempo: imp.tiempo,
    estado: imp.estado,
    notas: imp.notas || ''
  };
  bobinas.value = (imp.filamentos || []).map((b) => ({
    filamento: b.filamento?._id || b.filamento,
    identificadorBobina: b.filamento?.identificadorBobina,
    color: b.filamento?.color,
    gramos: b.gramos
  }));
  resetDraft();
  dialog.value = true;
}
function openDetail(imp) { detail.value = imp; detailDialog.value = true; }

function addBobina() {
  const id = draftBobina.value.filamento;
  const gr = Number(draftBobina.value.gramos) || 0;
  if (!id) { $q.notify({ type: 'warning', message: 'Elegí una bobina' }); return; }
  if (gr <= 0) { $q.notify({ type: 'warning', message: 'Ingresá los gramos consumidos' }); return; }
  if (bobinas.value.some((b) => b.filamento === id)) { $q.notify({ type: 'warning', message: 'Esa bobina ya está en la lista' }); return; }
  const f = filamentos.value.find((x) => x._id === id);
  bobinas.value.push({ filamento: id, identificadorBobina: f?.identificadorBobina, color: f?.color, gramos: gr });
  resetDraft();
}

function buildPayload() {
  return {
    producto: form.value.producto,
    impresora: form.value.impresora,
    cantidadPiezas: form.value.cantidadPiezas || 1,
    tiempo: form.value.tiempo || 0,
    estado: form.value.estado,
    notas: form.value.notas || '',
    filamentos: bobinas.value.map((b) => ({ filamento: b.filamento, gramos: b.gramos }))
  };
}

async function onSubmit() {
  if (!form.value.producto) { $q.notify({ type: 'warning', message: 'Elegí el producto' }); return; }
  if (!form.value.impresora) { $q.notify({ type: 'warning', message: 'Elegí la impresora' }); return; }
  if (form.value.estado === 'terminada' && !bobinas.value.length) {
    $q.notify({ type: 'warning', message: 'Para marcarla terminada cargá al menos una bobina con sus gramos' });
    return;
  }
  const payload = buildPayload();
  const okDone = editing.value ? await update(editId.value, payload) : await create(payload);
  if (okDone) dialog.value = false;
}

async function setEstado(imp, estado) {
  if (estado === 'terminada' && !(imp.filamentos || []).length) {
    $q.notify({ type: 'warning', message: 'Cargá las bobinas usadas antes de finalizar (Editar)' });
    return;
  }
  try {
    await updateImpresion(imp._id, { estado });
    $q.notify({
      type: 'positive',
      message: estado === 'terminada' ? `#${imp.numero} terminada — stock de bobinas descontado` : `#${imp.numero}: ${estado}`
    });
    await reload();
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message || 'No se pudo cambiar el estado' });
  }
}

async function finalizar(imp) {
  try {
    await registrarConsumoImpresion(imp._id);
    $q.notify({ type: 'positive', message: 'Stock de bobinas descontado' });
    await reload();
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message || 'No se pudo descontar' });
  }
}

function confirmDelete(imp) {
  $q.dialog({ title: 'Eliminar', message: `¿Eliminar la impresión #${imp.numero}?`, cancel: true, persistent: true })
    .onOk(() => remove(imp._id));
}

const prodLabel = (p) => `${p.nombre} (${p.sku})`;
function filterProductos(val, update) {
  update(() => {
    const n = (val || '').toLowerCase();
    productoOptions.value = productos.value.filter((p) => prodLabel(p).toLowerCase().includes(n)).map((p) => ({ label: prodLabel(p), value: p._id }));
  });
}
const filamentoToOption = (f) => ({ label: `${bobinaLabel(f)} — ${f.pesoDisponible} g`, value: f._id, color: f.color });
function filterFilamentos(val, update) {
  update(() => {
    const n = (val || '').toLowerCase();
    filamentoOptions.value = filamentos.value
      .filter((f) => bobinaLabel(f).toLowerCase().includes(n))
      .map(filamentoToOption);
  });
}

onMounted(async () => {
  await reload();
  const [prods, fils, imps] = await Promise.all([
    fetchProductos({ limit: 200 }), fetchFilamentos({ limit: 200 }), fetchImpresoras({ limit: 100 })
  ]);
  productos.value = prods.items || [];
  filamentos.value = fils.items || [];
  impresoras.value = imps.items || [];
  productoOptions.value = productos.value.map((p) => ({ label: prodLabel(p), value: p._id }));
  filamentoOptions.value = filamentos.value.map(filamentoToOption);
  impresoraOptions.value = impresoras.value.map((i) => ({ label: i.modelo, value: i._id }));
});
</script>

<style scoped>
.i3d-color-chip { display: inline-flex; align-items: center; gap: 6px; }
.i3d-color-stack { display: inline-flex; align-items: center; }
.i3d-color-stack-dot { margin-left: -6px; }
.i3d-color-stack-dot:first-child { margin-left: 0; }

.i3d-imp-dialog { width: 700px; max-width: 94vw; }
.i3d-imp-dialog-body { max-height: 70vh; overflow-y: auto; }
.i3d-bob { border-top: 1px solid var(--border); padding-top: 14px; }
.i3d-bob-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.i3d-bob-head > span:first-child { font-weight: 600; }
.i3d-bob-hint { font-size: 11px; color: var(--text-muted); }
</style>
