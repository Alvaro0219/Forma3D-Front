<template>
  <div class="i3d-page-shell">
    <div class="i3d-page-header">
      <div>
        <h1 class="i3d-page-title">Impresiones</h1>
        <p class="i3d-page-subtitle">Trabajos de impresión, consumo de bobinas y costo real</p>
      </div>
      <q-btn color="primary" unelevated icon="add" label="Nueva impresión" no-caps @click="openCreate" />
    </div>

    <div class="i3d-toolbar">
      <q-select v-model="fEstado" :options="estados" outlined dense clearable label="Filtrar por estado"
                emit-value map-options style="width:220px" @update:model-value="onFilter" />
    </div>

    <LoadingState :loading="loading" :empty="!loading && items.length === 0" empty-label="No hay impresiones registradas.">
      <div class="i3d-imp-grid i3d-build-stagger">
        <div v-for="imp in items" :key="imp._id" class="i3d-imp-card">
          <div class="i3d-imp-top">
            <span class="i3d-imp-num mono">#{{ imp.numero }}</span>
            <StatusBadge :label="imp.estado" :status="imp.estado" />
          </div>

          <div class="i3d-imp-title">{{ imp.producto?.nombre || 'Sin producto' }}</div>

          <q-linear-progress
            :indeterminate="imp.estado === 'imprimiendo'"
            :value="progressValue(imp)"
            :color="progressColor(imp.estado)"
            track-color="grey-9" size="8px" rounded class="q-my-sm"
          />

          <div class="i3d-imp-meta">
            <div><q-icon name="print" size="14px" /> {{ imp.impresora?.modelo || '—' }}</div>
            <div><q-icon name="grain" size="14px" /> {{ bobinasResumen(imp) }}</div>
          </div>

          <div class="i3d-imp-stats">
            <div><span class="i3d-imp-k">Piezas</span><span class="mono">{{ imp.cantidadPiezas }}</span></div>
            <div><span class="i3d-imp-k">Peso</span><span class="mono">{{ imp.pesoTotal }} g</span></div>
            <div><span class="i3d-imp-k">Tiempo</span><span class="mono">{{ fmtMin(imp.tiempo) }}</span></div>
          </div>

          <div v-if="imp.consumoRegistrado" class="i3d-imp-cost">
            <span class="i3d-imp-k">Costo total</span>
            <span class="mono i3d-imp-cost-val">{{ money(imp.costoTotal) }}</span>
          </div>
          <div v-else-if="imp.estado === 'terminada'" class="i3d-imp-warn">
            <q-icon name="warning" size="14px" /> Terminada sin descontar stock
            <q-btn flat dense no-caps size="sm" label="Descontar ahora" @click="finalizar(imp)" />
          </div>

          <div class="i3d-imp-actions">
            <q-btn flat dense round icon="visibility" size="sm" @click="openDetail(imp)"><q-tooltip>Detalle</q-tooltip></q-btn>
            <q-btn-dropdown flat dense size="sm" dropdown-icon="swap_horiz" no-icon-animation>
              <q-list dense>
                <q-item v-for="e in estados" :key="e.value" clickable v-close-popup @click="setEstado(imp, e.value)">
                  <q-item-section>{{ e.label }}</q-item-section>
                </q-item>
              </q-list>
              <q-tooltip>Cambiar estado</q-tooltip>
            </q-btn-dropdown>
            <q-space />
            <q-btn flat dense round icon="edit" size="sm" @click="openEdit(imp)" />
            <q-btn flat dense round icon="delete" color="negative" size="sm" @click="confirmDelete(imp)" />
          </div>
        </div>
      </div>
      <div class="i3d-reslist-footer" v-if="pagination.total > 0">
        <span class="i3d-reslist-count mono">{{ pagination.total }} registro(s)</span>
        <q-space />
        <q-pagination v-if="pagination.totalPages > 1" :model-value="pagination.page" :max="pagination.totalPages"
                      :max-pages="6" direction-links boundary-numbers @update:model-value="goToPage" />
      </div>
    </LoadingState>

    <!-- Crear / editar impresion -->
    <q-dialog v-model="dialog" persistent>
      <q-card class="i3d-imp-dialog">
        <q-card-section class="row items-center">
          <div class="text-h6">{{ editing ? 'Editar impresión' : 'Nueva impresión' }}</div>
          <q-space /><q-btn icon="close" flat round dense v-close-popup />
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
                          label="Bobina" emit-value map-options @filter="filterFilamentos" />
              </div>
              <div class="col-3">
                <q-input v-model.number="draftBobina.gramos" type="number" outlined dense label="Gramos" min="0" />
              </div>
              <div class="col-2">
                <q-btn color="primary" outline icon="add" class="full-width" @click="addBobina" />
              </div>
            </div>

            <q-markup-table v-if="bobinas.length" flat bordered dense>
              <thead><tr><th class="text-left">Bobina</th><th class="text-right">Gramos</th><th></th></tr></thead>
              <tbody>
                <tr v-for="(b, i) in bobinas" :key="i">
                  <td>{{ b.nombre }}</td>
                  <td class="text-right mono">{{ b.gramos }} g</td>
                  <td class="text-center"><q-btn flat dense round icon="close" size="sm" color="negative" @click="bobinas.splice(i,1)" /></td>
                </tr>
                <tr>
                  <td class="text-weight-bold">Total</td>
                  <td class="text-right mono text-weight-bold">{{ totalGramos }} g</td>
                  <td></td>
                </tr>
              </tbody>
            </q-markup-table>
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
      <q-markup-table v-if="detail.filamentos?.length" flat bordered dense class="q-mb-md">
        <thead><tr><th class="text-left">Bobina</th><th class="text-right">Gramos</th></tr></thead>
        <tbody>
          <tr v-for="(b, i) in detail.filamentos" :key="i">
            <td>{{ bobinaLabel(b.filamento) }}</td>
            <td class="text-right mono">{{ b.gramos }} g</td>
          </tr>
        </tbody>
      </q-markup-table>
      <div v-else class="text-grey q-mb-md">Sin bobinas cargadas.</div>

      <template v-if="detail.consumoRegistrado">
        <div class="i3d-imp-k q-mb-xs">Costo (calculado por el sistema)</div>
        <div class="row q-col-gutter-sm">
          <div class="col-6">Material <b class="mono float-right">{{ money(detail.costoMaterial) }}</b></div>
          <div class="col-6">Total <b class="mono float-right i3d-imp-cost-val">{{ money(detail.costoTotal) }}</b></div>
        </div>
      </template>
      <div v-if="detail.notas" class="q-mt-md"><div class="i3d-imp-k">Notas</div>{{ detail.notas }}</div>
    </RecordDetailDialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import LoadingState from '../../components/LoadingState.vue';
import RecordDetailDialog from '../../components/RecordDetailDialog.vue';
import StatusBadge from '../../components/StatusBadge.vue';
import { useCrudResource } from '../../composables/useCrudResource.js';
import {
  fetchImpresiones, createImpresion, updateImpresion, deleteImpresion, registrarConsumoImpresion,
  fetchProductos, fetchFilamentos, fetchImpresoras
} from '../../services/api.js';
import { formatMoney } from '../../utils/format.js';
import '../../styles/dashboard-unified.css';

const $q = useQuasar();
const money = (n) => formatMoney(n);
const estados = [
  { label: 'Pendiente', value: 'pendiente' },
  { label: 'Imprimiendo', value: 'imprimiendo' },
  { label: 'Terminada', value: 'terminada' },
  { label: 'Fallida', value: 'fallida' },
  { label: 'Cancelada', value: 'cancelada' }
];

const { items, pagination, loading, saving, reload, goToPage, create, update, remove } = useCrudResource({
  fetchFn: fetchImpresiones, createFn: createImpresion, updateFn: updateImpresion, deleteFn: deleteImpresion, label: 'la impresión'
});

const fEstado = ref(null);
const dialog = ref(false);
const editing = ref(false);
const editId = ref(null);
const detailDialog = ref(false);
const detail = ref({});

const form = ref(emptyForm());
const bobinas = ref([]);
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

const fmtMin = (m) => {
  const n = Number(m) || 0;
  if (!n) return '—';
  const h = Math.floor(n / 60); const min = n % 60;
  return h ? `${h}h ${min}m` : `${min}m`;
};
const progressColor = (e) => ({ imprimiendo: 'secondary', terminada: 'positive', fallida: 'negative' }[e] || 'grey');
const progressValue = (imp) => {
  if (imp.estado === 'imprimiendo') return undefined;
  return ['terminada', 'fallida', 'cancelada'].includes(imp.estado) ? 1 : 0;
};

const bobinaLabel = (f) => (f ? `${f.identificadorBobina || ''} ${f.marca || ''} ${f.tipo || ''} ${f.color || ''}`.trim() : '—');
const bobinasResumen = (imp) => {
  const list = imp.filamentos || [];
  if (!list.length) return '—';
  if (list.length === 1) return bobinaLabel(list[0].filamento);
  return `${list.length} bobinas · ${imp.pesoTotal} g`;
};

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
    nombre: bobinaLabel(b.filamento),
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
  bobinas.value.push({ filamento: id, nombre: bobinaLabel(f), gramos: gr });
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
function filterFilamentos(val, update) {
  update(() => {
    const n = (val || '').toLowerCase();
    filamentoOptions.value = filamentos.value
      .filter((f) => bobinaLabel(f).toLowerCase().includes(n))
      .map((f) => ({ label: `${bobinaLabel(f)} — ${f.pesoDisponible} g`, value: f._id }));
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
  filamentoOptions.value = filamentos.value.map((f) => ({ label: `${bobinaLabel(f)} — ${f.pesoDisponible} g`, value: f._id }));
  impresoraOptions.value = impresoras.value.map((i) => ({ label: i.modelo, value: i._id }));
});
</script>

<style scoped>
.i3d-imp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.i3d-imp-card {
  background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-md);
  padding: 16px; display: flex; flex-direction: column;
  transition: border-color var(--dur-base) var(--ease-standard);
}
.i3d-imp-card:hover { border-color: var(--border-strong); }
.i3d-imp-top { display: flex; align-items: center; justify-content: space-between; }
.i3d-imp-num { color: var(--text-muted); font-size: 13px; font-weight: 600; }
.i3d-imp-title { font-family: var(--font-display); font-weight: 600; font-size: 16px; margin-top: 6px; color: var(--text-primary); }
.i3d-imp-meta { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--text-secondary); margin-bottom: 10px; }
.i3d-imp-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 10px; }
.i3d-imp-stats > div { display: flex; flex-direction: column; }
.i3d-imp-k { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); }
.i3d-imp-cost { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; background: var(--bg-sunken); border-radius: var(--radius-sm); margin-bottom: 10px; }
.i3d-imp-cost-val { color: var(--success); font-weight: 700; }
.i3d-imp-warn {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  font-size: 12px; color: var(--warning);
  background: color-mix(in srgb, var(--warning) 12%, transparent);
  border-radius: var(--radius-sm); padding: 6px 8px; margin-bottom: 10px;
}
.i3d-imp-actions { display: flex; align-items: center; gap: 2px; margin-top: auto; border-top: 1px solid var(--border); padding-top: 8px; }

.i3d-imp-dialog { width: 700px; max-width: 94vw; }
.i3d-imp-dialog-body { max-height: 70vh; overflow-y: auto; }
.i3d-bob { border-top: 1px solid var(--border); padding-top: 14px; }
.i3d-bob-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.i3d-bob-head > span:first-child { font-family: var(--font-display); font-weight: 600; }
.i3d-bob-hint { font-size: 11px; color: var(--text-muted); }
</style>
