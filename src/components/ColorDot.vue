<template>
  <span class="i3d-color-dot" :style="{ background: bg }" />
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  color: { type: String, default: '' },
  size: { type: [Number, String], default: 14 }
});

const bg = computed(() => (/^#[0-9a-fA-F]{3,6}$/.test(props.color || '') ? props.color : '#8b8b8b'));
</script>

<style scoped>
.i3d-color-dot {
  display: inline-block;
  width: v-bind('typeof size === "number" ? size + "px" : size');
  height: v-bind('typeof size === "number" ? size + "px" : size');
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid var(--border-strong);
}
</style>
