<template>
  <span class="i3d-status" :data-tone="tone" :data-pulse="pulse ? 'true' : 'false'">{{ label }}</span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: { type: String, required: true },
  // Mapea directamente un estado de dominio o recibe un tone explícito.
  status: { type: String, default: '' },
  toneOverride: { type: String, default: '' }
});

// Estados de dominio -> tono visual del sistema.
const MAP = {
  // pedidos
  Pendiente: 'pending', Diseno: 'pending', Preparando: 'warning',
  Imprimiendo: 'active', Listo: 'done', Entregado: 'done', Cancelado: 'canceled',
  // impresiones
  pendiente: 'pending', imprimiendo: 'active', terminada: 'done', fallida: 'failed', cancelada: 'canceled',
  // ventas / filamentos
  completada: 'done', anulada: 'canceled', nueva: 'done', en_uso: 'active', agotada: 'failed',
  // impresoras
  activa: 'done', inactiva: 'pending', mantenimiento: 'warning'
};

const tone = computed(() => props.toneOverride || MAP[props.status] || 'pending');
const pulse = computed(() => tone.value === 'active');
</script>
