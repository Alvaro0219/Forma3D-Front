<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="i3d-dialog-card">
      <q-card-section class="row items-center">
        <div class="text-h6">{{ title }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-separator />

      <q-card-section class="i3d-dialog-body">
        <div class="row q-col-gutter-md">
          <div
            v-for="f in fields"
            :key="f.name"
            :class="`col-12 col-md-${f.cols || 6}`"
          >
            <q-select
              v-if="f.type === 'select'"
              v-model="form[f.name]"
              :label="f.label"
              :options="f.options"
              emit-value map-options
              outlined dense
              :hint="f.hint"
            />
            <q-toggle
              v-else-if="f.type === 'toggle'"
              v-model="form[f.name]"
              :label="f.label"
            />
            <q-select
              v-else-if="f.type === 'chips'"
              v-model="form[f.name]"
              :label="f.label"
              use-input use-chips multiple hide-dropdown-icon
              new-value-mode="add-unique"
              outlined dense
              :hint="f.hint || 'Escribí y presioná Enter'"
            />
            <q-input
              v-else-if="f.type === 'textarea'"
              v-model="form[f.name]"
              :label="f.label"
              type="textarea" autogrow
              outlined dense
              :hint="f.hint"
            />
            <div v-else-if="f.type === 'image'" class="i3d-image-field">
              <div class="i3d-image-field-label">{{ f.label }}</div>
              <q-file
                :model-value="null"
                :label="form[f.name] ? 'Cambiar imagen' : 'Seleccionar imagen (JPG, PNG o WebP)'"
                accept="image/jpeg,image/png,image/webp"
                outlined dense clearable
                :loading="uploadingField === f.name && uploading"
                @update:model-value="(file) => onImagePick(f, file)"
              >
                <template #prepend><q-icon name="cloud_upload" /></template>
              </q-file>
              <q-linear-progress
                v-if="uploadingField === f.name && uploading"
                :value="progress / 100" color="primary" size="6px" class="q-mt-xs rounded-borders"
              />
              <div v-if="form[f.name]" class="i3d-image-preview">
                <img :src="form[f.name]" alt="Vista previa" />
                <q-btn dense flat round icon="close" size="sm" color="negative" @click="form[f.name] = ''">
                  <q-tooltip>Quitar imagen</q-tooltip>
                </q-btn>
              </div>
            </div>
            <q-input
              v-else
              v-model="form[f.name]"
              :label="f.label"
              :type="f.type === 'number' ? 'number' : 'text'"
              outlined dense
              :hint="f.hint"
              :prefix="f.prefix"
            />
          </div>
        </div>

        <!-- Contenido extra de la pagina (ej. lista de insumos del producto) -->
        <slot name="extra" :form="form" />
      </q-card-section>

      <q-separator />

      <q-card-actions align="right">
        <q-btn flat label="Cancelar" v-close-popup />
        <q-btn color="primary" :label="submitLabel" :loading="saving" @click="submit" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useImageUpload } from '../composables/useImageUpload.js';

const props = defineProps({
  modelValue: Boolean,
  title: { type: String, default: 'Formulario' },
  submitLabel: { type: String, default: 'Guardar' },
  fields: { type: Array, required: true },
  initial: { type: Object, default: () => ({}) },
  saving: Boolean
});
const emit = defineEmits(['update:modelValue', 'submit']);

const form = ref({});

// Subida de imagenes para campos de tipo 'image' (sube a R2 y guarda la URL en el form).
const { uploading, progress, uploadImage } = useImageUpload();
const uploadingField = ref('');

async function onImagePick(field, file) {
  if (!file) return;
  uploadingField.value = field.name;
  const url = await uploadImage(file, field.folder || 'general');
  if (url) form.value[field.name] = url;
  uploadingField.value = '';
}

function buildForm() {
  const f = {};
  for (const field of props.fields) {
    const val = props.initial?.[field.name];
    if (val !== undefined && val !== null) {
      f[field.name] = val;
    } else if (field.type === 'chips') {
      f[field.name] = [];
    } else if (field.type === 'toggle') {
      f[field.name] = field.default ?? false;
    } else if (field.type === 'number') {
      f[field.name] = field.default ?? null;
    } else {
      f[field.name] = field.default ?? '';
    }
  }
  form.value = f;
}

watch(() => props.modelValue, (open) => { if (open) buildForm(); });
watch(() => props.initial, () => { if (props.modelValue) buildForm(); });

function submit() {
  // Convierte los campos numericos a Number.
  const payload = { ...form.value };
  for (const field of props.fields) {
    if (field.type === 'number' && payload[field.name] !== '' && payload[field.name] !== null) {
      payload[field.name] = Number(payload[field.name]);
    }
  }
  emit('submit', payload);
}
</script>

<style scoped>
.i3d-dialog-card { width: 640px; max-width: 92vw; }
.i3d-dialog-body { max-height: 68vh; overflow-y: auto; }

.i3d-image-field-label { font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; }
.i3d-image-preview {
  position: relative; margin-top: 10px; width: 120px; height: 120px;
  border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden;
  background: var(--bg-sunken);
}
.i3d-image-preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
.i3d-image-preview .q-btn { position: absolute; top: 2px; right: 2px; background: var(--bg-elevated); }
</style>
