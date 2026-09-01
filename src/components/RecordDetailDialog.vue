<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="i3d-detail-card">
      <q-card-section class="row items-center i3d-detail-head">
        <div>
          <div class="text-h6">{{ title }}</div>
          <div v-if="subtitle" class="i3d-detail-sub mono">{{ subtitle }}</div>
        </div>
        <q-space />
        <slot name="header-side" />
        <q-btn icon="close" flat round dense v-close-popup class="q-ml-sm" />
      </q-card-section>

      <q-separator />

      <q-card-section class="i3d-detail-body">
        <div v-if="loading" class="app-loading-state"><svg class="i3d-extrude-loader" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke-width="2.5" /></svg></div>
        <template v-else>
          <!-- Campos principales -->
          <div v-if="fields && fields.length" class="i3d-detail-grid">
            <div v-for="f in fields" :key="f.label" :class="`i3d-detail-cell col-${f.cols || 6}`">
              <div class="i3d-detail-k">{{ f.label }}</div>
              <div class="i3d-detail-v" :class="f.mono ? 'mono' : ''">{{ f.value ?? '—' }}</div>
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
.i3d-detail-sub { color: var(--text-muted); font-size: 12px; margin-top: 2px; }
.i3d-detail-body { max-height: 72vh; overflow-y: auto; }
.i3d-detail-grid { display: flex; flex-wrap: wrap; margin: -8px; }
.i3d-detail-cell { padding: 8px; }
.i3d-detail-cell.col-3 { width: 25%; }
.i3d-detail-cell.col-4 { width: 33.33%; }
.i3d-detail-cell.col-6 { width: 50%; }
.i3d-detail-cell.col-12 { width: 100%; }
.i3d-detail-k { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); margin-bottom: 3px; }
.i3d-detail-v { color: var(--text-primary); font-size: 14px; }

@media (max-width: 599px) {
  .i3d-detail-cell.col-3, .i3d-detail-cell.col-4 { width: 50%; }
}
</style>
