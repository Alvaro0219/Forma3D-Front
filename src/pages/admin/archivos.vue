<template>
  <div class="i3d-page-shell">
    <div class="i3d-page-header">
      <div>
        <h1 class="i3d-page-title">Biblioteca de archivos 3D</h1>
        <p class="i3d-page-subtitle">Diseños con versionado (v1, v2, v3…) y archivos STL / 3MF</p>
      </div>
      <q-btn color="primary" unelevated icon="add" label="Nuevo archivo" no-caps @click="openCreate" />
    </div>

    <div class="i3d-toolbar">
      <q-input v-model="search" class="i3d-grow" outlined dense debounce="350" label="Buscar por nombre o código"
               @update:model-value="onSearch" clearable>
        <template #prepend><q-icon name="search" /></template>
      </q-input>
    </div>

    <LoadingState :loading="loading" :empty="!loading && items.length === 0" empty-label="No hay archivos cargados.">
      <div class="i3d-arc-grid i3d-build-stagger">
        <div v-for="a in items" :key="a._id" class="i3d-arc-card">
          <div class="i3d-arc-preview">
            <img v-if="a.fotos && a.fotos.length" :src="a.fotos[0]" :alt="a.nombre" />
            <q-icon v-else name="view_in_ar" size="42px" color="grey-6" />
            <span v-if="currentVersion(a)" class="i3d-arc-vbadge mono">v{{ currentVersion(a).numero }}</span>
          </div>
          <div class="i3d-arc-body">
            <div class="i3d-arc-name">{{ a.nombre }}</div>
            <div class="i3d-arc-meta mono">{{ a.codigo || 's/código' }}<span v-if="a.categoria"> · {{ a.categoria }}</span></div>
            <div class="i3d-arc-sub">{{ (a.versiones || []).length }} versión(es)</div>
          </div>
          <div class="i3d-arc-actions">
            <q-btn flat dense no-caps size="sm" icon="layers" label="Versiones" @click="openVersions(a)" />
            <q-space />
            <q-btn flat dense round icon="edit" size="sm" @click="openEdit(a)" />
            <q-btn flat dense round icon="delete" color="negative" size="sm" @click="confirmDelete(a)" />
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

    <!-- Crear / editar archivo -->
    <q-dialog v-model="dialog" persistent>
      <q-card class="i3d-arc-dialog">
        <q-card-section class="row items-center">
          <div class="text-h6">{{ editing ? 'Editar archivo' : 'Nuevo archivo 3D' }}</div>
          <q-space /><q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section class="i3d-arc-dialog-body">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6"><q-input v-model="form.nombre" outlined dense label="Nombre *" /></div>
            <div class="col-6 col-md-3"><q-input v-model="form.codigo" outlined dense label="Código" /></div>
            <div class="col-6 col-md-3"><q-input v-model="form.categoria" outlined dense label="Categoría" /></div>
            <div class="col-12 col-md-6">
              <q-select v-model="form.cliente" :options="clienteOptions" outlined dense clearable use-input
                        label="Cliente (si es personalizado)" emit-value map-options @filter="filterClientes" />
            </div>
            <div class="col-12 col-md-6">
              <q-select v-model="form.producto" :options="productoOptions" outlined dense clearable use-input
                        label="Producto asociado" emit-value map-options @filter="filterProductos" />
            </div>
            <div class="col-4"><q-input v-model.number="form.pesoImpresion" type="number" outlined dense label="Peso (g)" /></div>
            <div class="col-4"><q-input v-model.number="form.tiempoImpresion" type="number" outlined dense label="Tiempo (min)" /></div>
            <div class="col-4"><q-input v-model="form.configuracionImpresion" outlined dense label="Config" /></div>
            <div class="col-12"><q-input v-model="form.descripcion" type="textarea" autogrow outlined dense label="Descripción" /></div>
          </div>

          <!-- Fotos / previsualizaciones -->
          <div class="i3d-arc-fotos">
            <div class="i3d-imp-k q-mb-xs">Fotos / previsualizaciones</div>
            <div class="i3d-arc-thumbs">
              <div v-for="(url, i) in form.fotos" :key="i" class="i3d-arc-thumb">
                <img :src="url" alt="foto" />
                <q-btn dense flat round icon="close" size="xs" color="negative" @click="form.fotos.splice(i,1)" />
              </div>
              <q-file :model-value="null" accept="image/jpeg,image/png,image/webp" outlined dense
                      class="i3d-arc-addfoto" label="+ Foto" :loading="img.uploading" @update:model-value="onFotoPick">
                <template #prepend><q-icon name="add_photo_alternate" /></template>
              </q-file>
            </div>
            <q-linear-progress v-if="img.uploading" :value="img.progress/100" color="primary" size="4px" class="q-mt-xs" />
          </div>
        </q-card-section>
        <q-separator />
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Guardar" :loading="saving" @click="onSubmit" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Versiones -->
    <q-dialog v-model="versionsDialog">
      <q-card class="i3d-arc-dialog" v-if="vTarget">
        <q-card-section class="row items-center">
          <div class="text-h6">Versiones — {{ vTarget.nombre }}</div>
          <q-space /><q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section class="i3d-arc-dialog-body">
          <!-- Timeline -->
          <div class="i3d-timeline" v-if="(vTarget.versiones || []).length">
            <div v-for="v in orderedVersions" :key="v.numero" class="i3d-tl-item" :class="{ current: v.esActual }">
              <div class="i3d-tl-dot"></div>
              <div class="i3d-tl-body">
                <div class="i3d-tl-head">
                  <span class="mono i3d-tl-ver">v{{ v.numero }}</span>
                  <span v-if="v.esActual" class="i3d-status" data-tone="done">actual</span>
                  <span class="i3d-tl-date mono">{{ date(v.fecha) }}</span>
                </div>
                <div v-if="v.cambios" class="i3d-tl-changes">{{ v.cambios }}</div>
                <div class="i3d-tl-files">
                  <a v-if="v.archivoStl" :href="v.archivoStl" target="_blank" class="i3d-file-chip"><q-icon name="description" size="14px" /> STL</a>
                  <a v-if="v.archivo3mf" :href="v.archivo3mf" target="_blank" class="i3d-file-chip"><q-icon name="description" size="14px" /> 3MF</a>
                  <q-btn v-if="!v.esActual" flat dense size="sm" no-caps label="Marcar actual" @click="setActual(v.numero)" />
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-grey q-pa-sm">Sin versiones todavía. Agregá la primera abajo.</div>

          <q-separator class="q-my-md" />

          <!-- Agregar versión -->
          <div class="i3d-imp-k q-mb-sm">Nueva versión</div>
          <q-input v-model="newVersion.cambios" outlined dense type="textarea" autogrow label="Cambios de esta versión" class="q-mb-sm" />
          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-file :model-value="null" accept=".stl" outlined dense label="Archivo STL"
                      :loading="modelUp.uploading && upTarget==='stl'" @update:model-value="(f)=>onModelPick('stl', f)">
                <template #prepend><q-icon name="upload_file" /></template>
              </q-file>
              <div v-if="newVersion.archivoStl" class="i3d-uploaded mono"><q-icon name="check" size="14px" color="positive" /> STL cargado</div>
            </div>
            <div class="col-6">
              <q-file :model-value="null" accept=".3mf" outlined dense label="Archivo 3MF"
                      :loading="modelUp.uploading && upTarget==='3mf'" @update:model-value="(f)=>onModelPick('3mf', f)">
                <template #prepend><q-icon name="upload_file" /></template>
              </q-file>
              <div v-if="newVersion.archivo3mf" class="i3d-uploaded mono"><q-icon name="check" size="14px" color="positive" /> 3MF cargado</div>
            </div>
          </div>
          <q-linear-progress v-if="modelUp.uploading" :value="modelUp.progress/100" color="primary" size="6px" class="q-mt-sm rounded-borders" />
          <q-toggle v-model="newVersion.esActual" label="Marcar como versión actual" class="q-mt-sm" />
        </q-card-section>
        <q-separator />
        <q-card-actions align="right">
          <q-btn flat label="Cerrar" v-close-popup />
          <q-btn color="primary" label="Agregar versión" :loading="saving" @click="addVersion" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import LoadingState from '../../components/LoadingState.vue';
import { useCrudResource } from '../../composables/useCrudResource.js';
import { useImageUpload } from '../../composables/useImageUpload.js';
import { useFileUpload } from '../../composables/useFileUpload.js';
import {
  fetchArchivos, createArchivo, updateArchivo, deleteArchivo, addArchivoVersion, setArchivoVersionActual,
  fetchClientes, fetchProductos
} from '../../services/api.js';
import { formatDate } from '../../utils/format.js';
import '../../styles/dashboard-unified.css';

const $q = useQuasar();
const date = (d) => formatDate(d);

const { items, pagination, loading, saving, reload, goToPage, create, update, remove } = useCrudResource({
  fetchFn: fetchArchivos, createFn: createArchivo, updateFn: updateArchivo, deleteFn: deleteArchivo, label: 'el archivo'
});

// Uploads: imagenes (fotos) y modelos (STL/3MF)
const img = useImageUpload();
const modelUp = useFileUpload();

const search = ref('');
const dialog = ref(false);
const editing = ref(false);
const editId = ref(null);
const form = ref(emptyForm());

const versionsDialog = ref(false);
const vTarget = ref(null);
const newVersion = ref({ cambios: '', archivoStl: '', archivo3mf: '', esActual: true });
const upTarget = ref('');

const allClientes = ref([]);
const allProductos = ref([]);
const clienteOptions = ref([]);
const productoOptions = ref([]);

function emptyForm() {
  return { nombre: '', codigo: '', categoria: '', cliente: null, producto: null,
    descripcion: '', configuracionImpresion: '', pesoImpresion: null, tiempoImpresion: null, fotos: [] };
}
const currentVersion = (a) => (a.versiones || []).find((v) => v.esActual) || (a.versiones || [])[a.versiones.length - 1];
const orderedVersions = computed(() => [...(vTarget.value?.versiones || [])].sort((a, b) => b.numero - a.numero));

function onSearch() { reload({ q: search.value || '' }); }

function openCreate() { editing.value = false; editId.value = null; form.value = emptyForm(); dialog.value = true; }
function openEdit(a) {
  editing.value = true; editId.value = a._id;
  form.value = {
    nombre: a.nombre, codigo: a.codigo || '', categoria: a.categoria || '',
    cliente: a.cliente?._id || a.cliente || null, producto: a.producto?._id || a.producto || null,
    descripcion: a.descripcion || '', configuracionImpresion: a.configuracionImpresion || '',
    pesoImpresion: a.pesoImpresion, tiempoImpresion: a.tiempoImpresion, fotos: [...(a.fotos || [])]
  };
  dialog.value = true;
}

async function onFotoPick(file) {
  if (!file) return;
  const url = await img.uploadImage(file, 'archivos');
  if (url) form.value.fotos.push(url);
}

async function onSubmit() {
  if (!form.value.nombre) { $q.notify({ type: 'warning', message: 'El nombre es obligatorio' }); return; }
  const payload = { ...form.value };
  if (!payload.cliente) delete payload.cliente;
  if (!payload.producto) delete payload.producto;
  // Joi number() rechaza null: quitar los campos numericos vacios (usan default del schema).
  if (payload.pesoImpresion == null) delete payload.pesoImpresion;
  if (payload.tiempoImpresion == null) delete payload.tiempoImpresion;
  const okDone = editing.value ? await update(editId.value, payload) : await create(payload);
  if (okDone) dialog.value = false;
}

function confirmDelete(a) {
  $q.dialog({ title: 'Eliminar archivo', message: `¿Eliminar "${a.nombre}"?`, cancel: true, persistent: true })
    .onOk(() => remove(a._id));
}

// ── Versiones ──
function openVersions(a) {
  vTarget.value = a;
  newVersion.value = { cambios: '', archivoStl: '', archivo3mf: '', esActual: true };
  versionsDialog.value = true;
}
async function onModelPick(kindExt, file) {
  if (!file) return;
  upTarget.value = kindExt;
  const url = await modelUp.uploadFile(file, { folder: 'modelos', kind: 'model' });
  if (url) newVersion.value[kindExt === 'stl' ? 'archivoStl' : 'archivo3mf'] = url;
  upTarget.value = '';
}
async function addVersion() {
  if (!newVersion.value.archivoStl && !newVersion.value.archivo3mf && !newVersion.value.cambios) {
    $q.notify({ type: 'warning', message: 'Agregá al menos un archivo o describí los cambios' });
    return;
  }
  saving.value = true;
  try {
    const updated = await addArchivoVersion(vTarget.value._id, { ...newVersion.value });
    vTarget.value = updated;
    newVersion.value = { cambios: '', archivoStl: '', archivo3mf: '', esActual: true };
    $q.notify({ type: 'positive', message: 'Versión agregada' });
    await reload();
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message || 'No se pudo agregar la versión' });
  } finally {
    saving.value = false;
  }
}
async function setActual(numero) {
  try {
    vTarget.value = await setArchivoVersionActual(vTarget.value._id, numero);
    await reload();
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message || 'No se pudo marcar como actual' });
  }
}

function filterClientes(val, update) {
  update(() => {
    const n = (val || '').toLowerCase();
    clienteOptions.value = allClientes.value.filter((c) => c.nombre.toLowerCase().includes(n)).map((c) => ({ label: c.nombre, value: c._id }));
  });
}
function filterProductos(val, update) {
  update(() => {
    const n = (val || '').toLowerCase();
    productoOptions.value = allProductos.value.filter((p) => p.nombre.toLowerCase().includes(n)).map((p) => ({ label: p.nombre, value: p._id }));
  });
}

onMounted(async () => {
  await reload();
  const [cli, prod] = await Promise.all([fetchClientes({ limit: 200 }), fetchProductos({ limit: 200 })]);
  allClientes.value = cli.items || [];
  allProductos.value = prod.items || [];
  clienteOptions.value = allClientes.value.map((c) => ({ label: c.nombre, value: c._id }));
  productoOptions.value = allProductos.value.map((p) => ({ label: p.nombre, value: p._id }));
});
</script>

<style scoped>
.i3d-arc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
.i3d-arc-card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden; display: flex; flex-direction: column; transition: border-color var(--dur-base) var(--ease-standard); }
.i3d-arc-card:hover { border-color: var(--border-strong); }
.i3d-arc-preview { position: relative; height: 150px; background: var(--bg-sunken); display: flex; align-items: center; justify-content: center; overflow: hidden; }
.i3d-arc-preview img { width: 100%; height: 100%; object-fit: cover; }
.i3d-arc-vbadge { position: absolute; top: 8px; right: 8px; background: var(--bg-elevated); border: 1px solid var(--border-strong); color: var(--tech); font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: var(--radius-pill); }
.i3d-arc-body { padding: 12px 12px 8px; flex: 1; }
.i3d-arc-name { font-family: var(--font-display); font-weight: 600; color: var(--text-primary); }
.i3d-arc-meta { font-size: 12px; color: var(--text-muted); margin: 2px 0; }
.i3d-arc-sub { font-size: 12px; color: var(--text-secondary); }
.i3d-arc-actions { display: flex; align-items: center; gap: 2px; padding: 6px 8px; border-top: 1px solid var(--border); }

.i3d-arc-dialog { width: 680px; max-width: 94vw; }
.i3d-arc-dialog-body { max-height: 70vh; overflow-y: auto; }
.i3d-arc-fotos { margin-top: 16px; }
.i3d-arc-thumbs { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.i3d-arc-thumb { position: relative; width: 64px; height: 64px; border-radius: var(--radius-sm); overflow: hidden; border: 1px solid var(--border); }
.i3d-arc-thumb img { width: 100%; height: 100%; object-fit: cover; }
.i3d-arc-thumb .q-btn { position: absolute; top: 0; right: 0; background: rgba(0,0,0,.5); }
.i3d-arc-addfoto { width: 120px; }
.i3d-uploaded { font-size: 12px; color: var(--success); margin-top: 4px; }

/* Timeline de versiones */
.i3d-timeline { position: relative; padding-left: 8px; }
.i3d-tl-item { position: relative; padding: 0 0 16px 22px; border-left: 2px solid var(--border); }
.i3d-tl-item:last-child { border-left-color: transparent; }
.i3d-tl-item.current > .i3d-tl-dot { background: var(--tech); box-shadow: 0 0 0 3px var(--tech-soft); }
.i3d-tl-dot { position: absolute; left: -7px; top: 2px; width: 12px; height: 12px; border-radius: 50%; background: var(--border-strong); }
.i3d-tl-head { display: flex; align-items: center; gap: 8px; }
.i3d-tl-ver { font-weight: 700; color: var(--text-primary); }
.i3d-tl-date { font-size: 12px; color: var(--text-muted); margin-left: auto; }
.i3d-tl-changes { font-size: 13px; color: var(--text-secondary); margin: 4px 0; }
.i3d-tl-files { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
.i3d-file-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; padding: 2px 10px; border: 1px solid var(--border-strong); border-radius: var(--radius-pill); color: var(--tech); font-family: var(--font-mono); }
.i3d-imp-k { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); }
</style>
