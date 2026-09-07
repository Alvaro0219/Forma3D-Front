<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="i3d-detail-card">
      <q-card-section class="i3d-detail-head">
        <div class="i3d-detail-head-main">
          <div class="text-h6">{{ title }}</div>
          <div v-if="subtitle" class="i3d-detail-sub mono">{{ subtitle }}</div>
        </div>
        <div v-if="$slots['header-side']" class="i3d-detail-head-side"><slot name="header-side" /></div>
        <q-btn flat round dense v-close-popup class="i3d-detail-close"><AppIcon name="close" :size="18" /></q-btn>
      </q-card-section>

      <q-separator />

      <q-card-section class="i3d-detail-body">
        <div v-if="loading" class="app-loading-state"><svg class="i3d-extrude-loader" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke-width="2.5" /></svg></div>
        <template v-else>
          <!-- Campos principales -->
          <div v-if="fields && fields.length" class="i3d-detail-grid">
            <div v-for="f in fields" :key="f.label" :class="`i3d-detail-cell col-${f.cols || 6}`">
              <div class="i3d-k">{{ f.label }}</div>
              <div class="i3d-v" :class="f.mono ? 'mono' : ''">{{ f.value ?? '—' }}</div>
            </div>
          </div>

          <!-- Contenido extra: historial, items, desglose, etc. -->
          <slot />
        </template>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import AppIcon from './AppIcon.vue';

defineProps({
  modelValue: Boolean,
  title: { type: String, default: 'Detalle' },
  subtitle: { type: String, default: '' },
  fields: { type: Array, default: () => [] }, // [{ label, value, mono, cols }]
  loading: Boolean
});
defineEmits(['update:modelValue']);
</script>

<style scoped>
.i3d-detail-card { width: 620px; max-width: 94vw; background: var(--bg-elevated); }
/* La cruz siempre arriba a la derecha del card, sin importar cuánto mida el
   título/subtítulo o el contenido de header-side (badges, chips): position
   absolute evita que dependa del flujo del flex y de que todo entre en una
   sola línea. */
.i3d-detail-head { position: relative; padding-right: 52px; }
.i3d-detail-head-main { padding-right: var(--sp-2); }
.i3d-detail-head-side { display: flex; align-items: center; gap: var(--sp-2); flex-wrap: wrap; margin-top: var(--sp-2); }
.i3d-detail-close { position: absolute; top: var(--sp-3); right: var(--sp-3); }
.i3d-detail-sub { color: var(--text-muted); font-size: 12px; margin-top: 2px; }
.i3d-detail-body { max-height: 72vh; overflow-y: auto; }
.i3d-detail-grid { display: flex; flex-wrap: wrap; margin: -8px; margin-bottom: var(--sp-2); }
.i3d-detail-cell { padding: var(--sp-2) var(--sp-2) var(--sp-3); }
.i3d-detail-cell.col-3 { width: 25%; }
.i3d-detail-cell.col-4 { width: 33.33%; }
.i3d-detail-cell.col-6 { width: 50%; }
.i3d-detail-cell.col-12 { width: 100%; }
/* La etiqueta y el valor usan las primitivas globales (.i3d-k / .i3d-v). */

@media (max-width: 599px) {
  .i3d-detail-cell.col-3, .i3d-detail-cell.col-4 { width: 50%; }
}
</style>
