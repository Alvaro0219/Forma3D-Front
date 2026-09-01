<template>
  <span class="i3d-odometer mono">{{ prefix }}{{ display }}{{ suffix }}</span>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';

const props = defineProps({
  value: { type: Number, default: 0 },
  prefix: { type: String, default: '' },
  suffix: { type: String, default: '' },
  decimals: { type: Number, default: 0 },
  duration: { type: Number, default: 900 }
});

const display = ref('0');

function format(n) {
  return Number(n).toLocaleString('es-AR', {
    minimumFractionDigits: props.decimals,
    maximumFractionDigits: props.decimals
  });
}

function animate(to) {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || props.duration <= 0) { display.value = format(to); return; }

  const from = 0;
  const start = performance.now();
  const step = (now) => {
    const t = Math.min((now - start) / props.duration, 1);
    // easeOutExpo
    const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    display.value = format(from + (to - from) * eased);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

onMounted(() => animate(props.value));
watch(() => props.value, (v) => animate(v));
</script>

<style scoped>
.i3d-odometer { font-variant-numeric: tabular-nums; }
</style>
