<template>
  <div v-if="loading" class="app-loading-state">
    <svg class="i3d-extrude-loader" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke-width="2.5" />
    </svg>
    <span v-if="label" class="i3d-mono">{{ label }}</span>
  </div>
  <div v-else-if="empty" class="app-empty-state">
    <div class="i3d-empty-art" aria-hidden="true">
      <svg viewBox="0 0 80 48" fill="none">
        <rect x="4" y="30" width="72" height="14" rx="2" stroke="var(--border-strong)" stroke-width="1.5" />
        <path class="i3d-draw" style="--len:180" d="M10 30 L10 14 L40 6 L70 14 L70 30" stroke="var(--tech)" stroke-width="1.5" stroke-linejoin="round" />
      </svg>
    </div>
    <span>{{ emptyLabel }}</span>
    <slot name="empty-action" />
  </div>
  <slot v-else />
</template>

<script setup>
defineProps({
  loading: Boolean,
  empty: Boolean,
  label: { type: String, default: 'Cargando...' },
  emptyLabel: { type: String, default: 'Todavía no hay nada para imprimir aquí.' },
  emptyIcon: { type: String, default: 'inbox' }
});
</script>

<style scoped>
.i3d-empty-art { width: 120px; opacity: .9; }
.i3d-empty-art svg { width: 100%; height: auto; }
</style>
