<template>
  <div class="i3d-page-shell">
    <div class="i3d-page-header">
      <div>
        <h1 class="i3d-page-title">Productos</h1>
        <p class="i3d-page-subtitle">Catálogo interno y de la tienda</p>
      </div>
      <q-btn color="primary" unelevated no-caps @click="openCreate"><AppIcon name="add" :size="16" :bordered="false" class="q-mr-xs" />Nuevo producto</q-btn>
    </div>

    <div class="i3d-toolbar">
      <q-input v-model="search" class="i3d-grow" outlined dense debounce="350"
               label="Buscar por nombre o SKU" @update:model-value="onFilter" clearable>
        <template #prepend><AppIcon name="search" :size="18" /></template>
      </q-input>
      <q-select v-model="fCategoria" :options="categorias" outlined dense clearable
                label="Filtrar por categoría" style="width:190px" @update:model-value="onFilter" />
      <q-input v-model="fMaterial" outlined dense label="Filtrar por material" @update:model-value="onFilter" clearable style="width:180px" />
    </div>

    <ResourceList
      :rows="items" :columns="columns" :loading="loading" :pagination="pagination"
      empty-label="No hay productos aún." @view="openDetail" @update:page="goToPage"
    >
      <template #cell-precioVenta="{ value }">{{ money(value) }}</template>
      <template #cell-insumos="{ row }">
        <span v-if="row.insumos?.length" class="mono">{{ row.insumos.length }}</span>
        <span v-else class="text-grey">—</span>
      </template>
      <template #cell-visibleEnTienda="{ value }">
        <AppIcon :name="value ? 'check_circle' : 'cancel'" :color="value ? 'success' : 'muted'" :size="18" />
      </template>
      <template #actions="{ row }">
        <q-btn flat dense round size="sm" @click="openEdit(row)"><AppIcon name="edit" :size="16" /></q-btn>
        <q-btn flat dense round color="negative" size="sm" @click="confirmDelete(row)"><AppIcon name="delete" :size="16" /></q-btn>
      </template>
    </ResourceList>

    <ResourceDialog
      v-model="dialog" :title="editing ? 'Editar producto' : 'Nuevo producto'"
      :fields="fields" :initial="current" :saving="saving" @submit="onSubmit"
    >
      <template #extra="{ form }">
        <SkuPreview :categoria="form.categoria" :existing="editing ? current.sku : ''" />

        <!-- Insumos / accesorios que lleva el producto -->
        <div class="i3d-bom">
          <div class="i3d-bom-head">
            <span>Insumos / accesorios</span>
            <span class="i3d-bom-hint">Se descuentan del stock al vender este producto</span>
          </div>

          <div class="row q-col-gutter-sm items-end q-mb-sm">
            <div class="col-7">
              <q-select v-model="draftInsumo.insumo" :options="insumoOptions" outlined dense clearable use-input
                        label="Insumo" emit-value map-options @filter="filterInsumos" />
            </div>
            <div class="col-3">
              <q-input v-model.number="draftInsumo.cantidad" type="number" outlined dense label="Cant. x unidad" min="0" />
            </div>
            <div class="col-2">
              <q-btn color="primary" outline dense class="i3d-add-btn i3d-add-btn-icon" @click="addInsumo"><AppIcon name="add" :size="16" /></q-btn>
            </div>
          </div>

          <ItemsTable v-if="bom.length" :rows="bom" :columns="bomColumns" has-actions>
            <template #actions="{ index }">
              <q-btn flat dense round size="sm" color="negative" @click="bom.splice(index,1)"><AppIcon name="close" :size="14" /></q-btn>
            </template>
          </ItemsTable>
          <div v-else class="text-grey q-pa-sm">Sin insumos asociados.</div>
        </div>
      </template>
    </ResourceDialog>

    <!-- Vista del producto -->
    <RecordDetailDialog
      v-model="detailDialog" :title="current.nombre || 'Producto'" :subtitle="current.sku" :fields="detailFields"
    >
      <template #header-side>
        <StatusBadge v-if="current.visibleEnTienda" label="Visible en tienda" tone-override="done" />
        <StatusBadge v-else label="Oculto" tone-override="canceled" />
      </template>
      <img v-if="current.fotoPrincipal" :src="current.fotoPrincipal" class="i3d-prod-detail-img" alt="foto" />
      <div v-if="current.descripcion" class="q-mb-md">{{ current.descripcion }}</div>

      <div class="text-subtitle2 q-mb-xs">Insumos / accesorios</div>
      <q-list v-if="current.insumos?.length" dense bordered class="rounded-borders q-mb-md">
        <q-item v-for="(l, i) in current.insumos" :key="i">
          <q-item-section>{{ l.insumo?.nombre || 'Insumo' }}</q-item-section>
          <q-item-section side class="mono">{{ l.cantidad }} {{ l.insumo?.unidad || '' }} x unidad</q-item-section>
        </q-item>
      </q-list>
      <div v-else class="text-grey q-mb-md">Sin insumos asociados.</div>

      <div class="i3d-auto-note" v-if="puedeVerCostos">
        <AppIcon name="lock" :size="13" :bordered="false" /> Datos internos (no se muestran en la tienda)
      </div>
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
import SkuPreview from '../../components/SkuPreview.vue';
import ItemsTable from '../../components/ItemsTable.vue';
import AppIcon from '../../components/AppIcon.vue';
import { useAuthStore } from '../../stores/auth.js';
import { useCrudResource } from '../../composables/useCrudResource.js';
import {
  fetchProductos, createProducto, updateProducto, deleteProducto, fetchConfig, fetchInsumos
} from '../../services/api.js';
import { formatMoney } from '../../utils/format.js';
import '../../styles/dashboard-unified.css';

const $q = useQuasar();
const auth = useAuthStore();
const money = (n) => formatMoney(n);
const puedeVerCostos = computed(() => auth.puedeVerCostos);

const { items, pagination, loading, saving, reload, goToPage, create, update, remove } = useCrudResource({
  fetchFn: fetchProductos, createFn: createProducto, updateFn: updateProducto, deleteFn: deleteProducto, label: 'el producto'
});

const columns = [
  { name: 'nombre', label: 'Nombre', field: 'nombre', sortable: true },
  { name: 'sku', label: 'SKU', field: 'sku', mono: true },
  { name: 'categoria', label: 'Categoría', field: 'categoria' },
  { name: 'precioVenta', label: 'Precio', field: 'precioVenta', align: 'right', mono: true, sortable: true },
  { name: 'stock', label: 'Stock', field: 'stock', align: 'right', mono: true, sortable: true },
  { name: 'insumos', label: 'Insumos', field: 'insumos', align: 'center' },
  { name: 'visibleEnTienda', label: 'Tienda', field: 'visibleEnTienda', align: 'center' }
];

// La categoria es una lista precargada desde Configuracion y define el prefijo del SKU.
const categorias = ref([]);
const insumosDisponibles = ref([]);
const insumoOptions = ref([]);

const fields = computed(() => [
  { name: 'nombre', label: 'Nombre', cols: 6, required: true },
  { name: 'categoria', label: 'Categoría', type: 'select', cols: 6,
    options: categorias.value.map((c) => ({ label: c, value: c })),
    hint: 'Define el prefijo del SKU' },
  { name: 'descripcion', label: 'Descripción', type: 'textarea', cols: 12 },
  { name: 'material', label: 'Material', cols: 6 },
  { name: 'colores', label: 'Colores', type: 'chips', cols: 6 },
  { name: 'precioVenta', label: 'Precio de venta', type: 'number', cols: 6, prefix: '$' },
  { name: 'stock', label: 'Stock', type: 'number', cols: 6 },
  { name: 'pesoInterno', label: 'Peso (g) [interno]', type: 'number', cols: 4 },
  { name: 'tiempoImpresion', label: 'Tiempo impresión (min) [interno]', type: 'number', cols: 4 },
  { name: 'costoFabricacion', label: 'Costo fabricación [interno]', type: 'number', cols: 4, prefix: '$' },
  { name: 'fotoPrincipal', label: 'Foto principal', type: 'image', folder: 'productos', cols: 12 },
  { name: 'disponibilidadTienda', label: 'Disponibilidad en tienda', type: 'select', cols: 6, default: 'auto',
    options: [
      { label: 'Automática (según stock)', value: 'auto' },
      { label: 'Disponible', value: 'disponible' },
      { label: 'Pocas unidades', value: 'pocas_unidades' },
      { label: 'Sin stock', value: 'sin_stock' },
      { label: 'A pedido', value: 'a_pedido' }
    ] },
  { name: 'visibleEnTienda', label: 'Visible en tienda', type: 'toggle', cols: 6, default: true }
]);

const search = ref('');
const fCategoria = ref(null);
const fMaterial = ref('');
const dialog = ref(false);
const editing = ref(false);
const current = ref({});
const detailDialog = ref(false);

// Lista de materiales (insumos) del producto, manejada en la pagina.
const bom = ref([]);
const bomColumns = [
  { name: 'nombre', label: 'Insumo' },
  { name: 'cantidad', label: 'Cant. x unidad', align: 'right', mono: true, format: (v, row) => `${row.cantidad} ${row.unidad || ''}`.trim() }
];
const draftInsumo = ref({ insumo: null, cantidad: 1 });

const detailFields = computed(() => {
  const p = current.value;
  const base = [
    { label: 'Categoría', value: p.categoria, cols: 4 },
    { label: 'Material', value: p.material, cols: 4 },
    { label: 'Colores', value: (p.colores || []).join(', '), cols: 4 },
    { label: 'Precio de venta', value: money(p.precioVenta), mono: true, cols: 6 },
    { label: 'Stock', value: `${p.stock ?? 0}`, mono: true, cols: 6 }
  ];
  if (puedeVerCostos.value) {
    base.push(
      { label: 'Peso interno', value: `${p.pesoInterno ?? 0} g`, mono: true, cols: 4 },
      { label: 'Tiempo impresión', value: `${p.tiempoImpresion ?? 0} min`, mono: true, cols: 4 },
      { label: 'Costo fabricación', value: money(p.costoFabricacion), mono: true, cols: 4 }
    );
  }
  return base;
});

function onFilter() {
  reload({ q: search.value, filter_categoria: fCategoria.value, filter_material: fMaterial.value });
}

function bomFromProducto(p) {
  return (p.insumos || []).map((l) => ({
    insumo: l.insumo?._id || l.insumo,
    nombre: l.insumo?.nombre || 'Insumo',
    unidad: l.insumo?.unidad || '',
    cantidad: l.cantidad
  }));
}

function resetDraft() { draftInsumo.value = { insumo: null, cantidad: 1 }; }
function openCreate() { editing.value = false; current.value = {}; bom.value = []; resetDraft(); dialog.value = true; }
function openEdit(row) { editing.value = true; current.value = { ...row }; bom.value = bomFromProducto(row); resetDraft(); dialog.value = true; }
function openDetail(row) { current.value = { ...row }; detailDialog.value = true; }

function addInsumo() {
  const id = draftInsumo.value.insumo;
  if (!id) { $q.notify({ type: 'warning', message: 'Elegí un insumo' }); return; }
  if (bom.value.some((l) => l.insumo === id)) { $q.notify({ type: 'warning', message: 'Ese insumo ya está en la lista' }); return; }
  const ins = insumosDisponibles.value.find((i) => i._id === id);
  bom.value.push({
    insumo: id,
    nombre: ins?.nombre || 'Insumo',
    unidad: ins?.unidad || '',
    cantidad: Math.max(0, draftInsumo.value.cantidad || 1)
  });
  resetDraft();
}

function filterInsumos(val, update) {
  update(() => {
    const n = (val || '').toLowerCase();
    insumoOptions.value = insumosDisponibles.value
      .filter((i) => i.nombre.toLowerCase().includes(n))
      .map((i) => ({ label: `${i.nombre} (${i.stock} ${i.unidad})`, value: i._id }));
  });
}

async function onSubmit(payload) {
  const full = { ...payload, insumos: bom.value.map((l) => ({ insumo: l.insumo, cantidad: l.cantidad })) };
  if (!full.categoria) { $q.notify({ type: 'warning', message: 'Elegí una categoría (define el SKU)' }); return; }
  const okDone = editing.value ? await update(current.value._id, full) : await create(full);
  if (okDone) dialog.value = false;
}

function confirmDelete(row) {
  $q.dialog({ title: 'Archivar producto', message: `¿Archivar "${row.nombre}"?`, cancel: true, persistent: true })
    .onOk(() => remove(row._id));
}

onMounted(async () => {
  await reload();
  const [cfg, ins] = await Promise.all([fetchConfig(), fetchInsumos({ limit: 200 })]);
  categorias.value = cfg.categorias || [];
  insumosDisponibles.value = ins.items || [];
  insumoOptions.value = insumosDisponibles.value.map((i) => ({ label: `${i.nombre} (${i.stock} ${i.unidad})`, value: i._id }));
});
</script>

<style scoped>
.i3d-prod-detail-img { width: 100%; max-height: 220px; object-fit: cover; border-radius: var(--radius-sm); margin-bottom: 12px; border: 1px solid var(--border); }
.i3d-auto-note { font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; margin-top: 8px; }
.i3d-bom { margin-top: 16px; border-top: 1px solid var(--border); padding-top: 14px; }
.i3d-bom-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.i3d-bom-head > span:first-child { font-weight: 600; }
.i3d-bom-hint { font-size: 11px; color: var(--text-muted); }
</style>
