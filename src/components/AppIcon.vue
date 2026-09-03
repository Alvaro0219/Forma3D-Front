<template>
  <span
    class="i3d-icon"
    :class="{ 'i3d-icon--plain': !bordered }"
    :style="wrapperStyle"
  >
    <component :is="iconComponent" :size="innerSize" :stroke-width="strokeWidth" />
  </span>
</template>

<script setup>
import { computed } from 'vue';
import { ICONS, resolveIconColor } from '../utils/icons.js';

const props = defineProps({
  name: { type: String, required: true },
  // acepta numero (px) o string tipo "18px" (compat con el q-icon anterior)
  size: { type: [Number, String], default: 20 },
  color: { type: String, default: '' },
  strokeWidth: { type: [Number, String], default: 1.75 },
  bordered: { type: Boolean, default: true }
});

const iconComponent = computed(() => {
  const cmp = ICONS[props.name];
  if (!cmp && import.meta.env.DEV) console.warn('[AppIcon] icono desconocido: ' + props.name);
  return cmp || null;
});

const innerSize = computed(() => {
  const n = typeof props.size === 'string' ? parseInt(props.size, 10) : props.size;
  return Number.isFinite(n) ? n : 20;
});

const wrapperStyle = computed(() => {
  const size = innerSize.value;
  const pad = Math.max(2, Math.round(size * 0.22));
  return {
    '--icon-color': resolveIconColor(props.color),
    width: `${size + pad * 2}px`,
    height: `${size + pad * 2}px`
  };
});
</script>

<style scoped>
.i3d-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--icon-color, currentColor);
  border: 1px solid color-mix(in srgb, var(--icon-color, currentColor) 38%, transparent);
  border-radius: var(--radius-sm);
  line-height: 0;
}
.i3d-icon--plain { border-color: transparent; }
.i3d-icon :deep(svg) { display: block; }
</style>
