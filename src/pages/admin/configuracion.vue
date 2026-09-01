<template>
  <div class="i3d-page-shell">
    <div class="i3d-page-header">
      <div>
        <h1 class="i3d-page-title">Configuración</h1>
        <p class="i3d-page-subtitle">Parámetros del negocio, costos y tienda</p>
      </div>
    </div>

    <LoadingState :loading="loading" :empty="false" label="Cargando configuración...">
      <div class="row q-col-gutter-md">
        <!-- Negocio + costos -->
        <div class="col-12 col-md-6">
          <div class="i3d-section-card q-mb-md">
            <div class="text-subtitle1 q-mb-md">Datos del emprendimiento</div>
            <q-input v-model="cfg.nombreNegocio" outlined dense label="Nombre del negocio" class="q-mb-sm" />
            <div class="row q-col-gutter-sm">
              <div class="col-6"><q-input v-model="cfg.telefono" outlined dense label="Teléfono" /></div>
              <div class="col-6"><q-input v-model="cfg.moneda" outlined dense label="Moneda" /></div>
            </div>
            <q-input v-model="cfg.direccion" outlined dense label="Dirección" class="q-mt-sm" />

            <div class="i3d-logo-field q-mt-sm">
              <div class="i3d-logo-label">Logo del negocio</div>
              <q-file
                :model-value="null"
                :label="cfg.logo ? 'Cambiar logo' : 'Subir logo (JPG, PNG o WebP)'"
                accept="image/jpeg,image/png,image/webp"
                outlined dense clearable
                :loading="uploading"
                @update:model-value="onLogoPick"
              >
                <template #prepend><q-icon name="cloud_upload" /></template>
              </q-file>
              <q-linear-progress v-if="uploading" :value="progress / 100" color="primary" size="6px" class="q-mt-xs rounded-borders" />
              <div v-if="cfg.logo" class="i3d-logo-preview">
                <img :src="cfg.logo" alt="Logo" />
                <q-btn dense flat round icon="close" size="sm" color="negative" @click="cfg.logo = ''">
                  <q-tooltip>Quitar logo</q-tooltip>
                </q-btn>
              </div>
            </div>
          </div>

          <div class="i3d-section-card">
            <div class="text-subtitle1 q-mb-md">Parámetros de costo</div>
            <div class="row q-col-gutter-sm">
              <div class="col-6"><q-input v-model.number="cfg.precioKwh" type="number" outlined dense label="Precio kWh" prefix="$" /></div>
              <div class="col-6"><q-input v-model.number="cfg.costoHoraMaquina" type="number" outlined dense label="Costo/hora máquina" prefix="$" /></div>
              <div class="col-6"><q-input v-model.number="cfg.consumoImpresoraDefault" type="number" outlined dense label="Consumo default (kW)" /></div>
              <div class="col-6"><q-input v-model.number="cfg.manoObraDefault" type="number" outlined dense label="Mano de obra /hora" prefix="$" /></div>
              <div class="col-6"><q-input v-model.number="cfg.costoEmbalajeDefault" type="number" outlined dense label="Embalaje default" prefix="$" /></div>
              <div class="col-6"><q-input v-model.number="cfg.margenDefault" type="number" outlined dense label="Margen default (%)" suffix="%" /></div>
            </div>
          </div>
        </div>

        <!-- Tienda -->
        <div class="col-12 col-md-6">
          <div class="i3d-section-card q-mb-md">
            <div class="text-subtitle1 q-mb-md">Tienda pública (WhatsApp)</div>
            <q-input v-model="cfg.whatsappNumero" outlined dense label="Número de WhatsApp"
                     hint="Formato internacional sin +, ej. 5493511234567" class="q-mb-sm" />
            <q-input v-model="cfg.plantillaMensaje" outlined type="textarea" autogrow label="Plantilla del mensaje"
                     hint="Variables: {items} {total} {nombre} {telefono} {notas} {email} {direccion}" />
            <q-toggle v-model="cfg.mostrarDisponibilidad" label="Mostrar disponibilidad en la tienda" class="q-mt-sm" />
          </div>

          <div class="i3d-section-card">
            <div class="text-subtitle1 q-mb-md">Impresoras</div>
            <q-list bordered separator class="rounded-borders q-mb-sm">
              <q-item v-for="imp in impresoras" :key="imp._id">
                <q-item-section>
                  <q-item-label>{{ imp.modelo }}</q-item-label>
                  <q-item-label caption>{{ imp.consumo }} kW · {{ money(imp.costoHora) }}/h · {{ imp.estado }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-btn flat dense round icon="delete" color="negative" @click="removeImpresora(imp)" />
                </q-item-section>
              </q-item>
              <q-item v-if="!impresoras.length"><q-item-section class="text-grey">Sin impresoras cargadas</q-item-section></q-item>
            </q-list>
            <div class="row q-col-gutter-sm items-end">
              <div class="col-5"><q-input v-model="newImp.modelo" outlined dense label="Modelo" /></div>
              <div class="col-3"><q-input v-model.number="newImp.consumo" type="number" outlined dense label="kW" /></div>
              <div class="col-2"><q-input v-model.number="newImp.costoHora" type="number" outlined dense label="$/h" /></div>
              <div class="col-2"><q-btn color="primary" dense icon="add" @click="addImpresora" /></div>
            </div>
          </div>
        </div>
      </div>

      <div class="q-mt-md text-right">
        <q-btn color="primary" icon="save" label="Guardar configuración" :loading="saving" @click="save" />
      </div>
    </LoadingState>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import LoadingState from '../../components/LoadingState.vue';
import {
  fetchConfig, updateConfig, fetchImpresoras, createImpresora, deleteImpresora
} from '../../services/api.js';
import { useImageUpload } from '../../composables/useImageUpload.js';
import { formatMoney } from '../../utils/format.js';
import '../../styles/dashboard-unified.css';

const $q = useQuasar();
const money = (n) => formatMoney(n);

// Subida del logo a R2 (guarda la URL publica en cfg.logo).
const { uploading, progress, uploadImage } = useImageUpload();
async function onLogoPick(file) {
  if (!file) return;
  const url = await uploadImage(file, 'logos');
  if (url) cfg.value.logo = url;
}

const loading = ref(true);
const saving = ref(false);
const cfg = ref({});
const impresoras = ref([]);
const newImp = ref({ modelo: '', consumo: 0.15, costoHora: 0 });

const CONFIG_FIELDS = [
  'nombreNegocio', 'telefono', 'direccion', 'logo', 'moneda',
  'precioKwh', 'costoHoraMaquina', 'consumoImpresoraDefault', 'manoObraDefault',
  'costoEmbalajeDefault', 'otrosCostosDefault', 'margenDefault',
  'categorias', 'unidades', 'whatsappNumero', 'plantillaMensaje', 'mostrarDisponibilidad'
];

async function loadAll() {
  loading.value = true;
  try {
    const [c, imps] = await Promise.all([fetchConfig(), fetchImpresoras({ limit: 100 })]);
    cfg.value = c;
    impresoras.value = imps.items || [];
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    const payload = {};
    for (const k of CONFIG_FIELDS) if (cfg.value[k] !== undefined) payload[k] = cfg.value[k];
    cfg.value = await updateConfig(payload);
    $q.notify({ type: 'positive', message: 'Configuración guardada' });
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message || 'No se pudo guardar' });
  } finally {
    saving.value = false;
  }
}

async function addImpresora() {
  if (!newImp.value.modelo) { $q.notify({ type: 'warning', message: 'Ingresá el modelo' }); return; }
  try {
    await createImpresora({ ...newImp.value });
    newImp.value = { modelo: '', consumo: 0.15, costoHora: 0 };
    const imps = await fetchImpresoras({ limit: 100 });
    impresoras.value = imps.items || [];
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message || 'No se pudo agregar' });
  }
}

function removeImpresora(imp) {
  $q.dialog({ title: 'Eliminar impresora', message: `¿Eliminar "${imp.modelo}"?`, cancel: true, persistent: true })
    .onOk(async () => {
      await deleteImpresora(imp._id);
      impresoras.value = impresoras.value.filter((i) => i._id !== imp._id);
    });
}

onMounted(loadAll);
</script>

<style scoped>
.i3d-logo-label { font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; }
.i3d-logo-preview {
  position: relative; margin-top: 10px; width: 140px; height: 90px;
  border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden;
  background: var(--bg-sunken);
}
.i3d-logo-preview img { width: 100%; height: 100%; object-fit: contain; display: block; }
.i3d-logo-preview .q-btn { position: absolute; top: 2px; right: 2px; background: var(--bg-elevated); }
</style>
