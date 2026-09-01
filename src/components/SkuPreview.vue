<template>
  <div class="i3d-sku-box">
    <div class="i3d-sku-k">SKU</div>
    <div class="i3d-sku-v mono">
      <template v-if="existing">{{ existing }}</template>
      <template v-else-if="sku">{{ sku }}</template>
      <template v-else>—</template>
    </div>
    <div class="i3d-sku-hint">
      {{ existing ? 'Asignado automáticamente al crear el producto.' : 'Se genera solo a partir de la categoría.' }}
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { fetchNextSku } from '../services/api.js';

const props = defineProps({
  categoria: { type: String, default: '' },
  existing: { type: String, default: '' }
});

const sku = ref('');

watch(() => props.categoria, async (cat) => {
  if (props.existing || !cat) { sku.value = ''; return; }
  try {
    const res = await fetchNextSku(cat);
    sku.value = res.sku;
  } catch { sku.value = ''; }
}, { immediate: true });
</script>

<style scoped>
.i3d-sku-box {
  border: 1px dashed var(--border-strong); border-radius: var(--radius-sm);
  padding: 10px 12px; background: var(--bg-sunken); margin-top: 4px;
}
.i3d-sku-k { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); }
.i3d-sku-v { font-size: 18px; font-weight: 700; color: var(--tech); }
.i3d-sku-hint { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
</style>
