<template>
  <div class="i3d-sku-box">
    <div class="i3d-sku-k">ID de bobina</div>
    <div class="i3d-sku-v mono">
      <template v-if="existing">{{ existing }}</template>
      <template v-else-if="id">{{ id }}</template>
      <template v-else>—</template>
    </div>
    <div class="i3d-sku-hint">
      {{ existing ? 'Asignado automáticamente al crear la bobina.' : 'Se genera solo a partir de la marca.' }}
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { fetchNextBobinaId } from '../services/api.js';

const props = defineProps({
  marca: { type: String, default: '' },
  existing: { type: String, default: '' }
});

const id = ref('');

watch(() => props.marca, async (marca) => {
  if (props.existing || !marca) { id.value = ''; return; }
  try {
    const res = await fetchNextBobinaId(marca);
    id.value = res.identificadorBobina;
  } catch { id.value = ''; }
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
