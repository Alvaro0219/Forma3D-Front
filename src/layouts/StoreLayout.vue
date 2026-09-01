<template>
  <div class="i3d-store">
    <header class="i3d-store-header">
      <router-link to="/tienda" class="i3d-store-brand">
        <span class="i3d-brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M12 2 L21 7 V17 L12 22 L3 17 V7 Z" stroke="var(--accent)" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 12 L21 7 M12 12 V22 M12 12 L3 7" stroke="var(--tech)" stroke-width="1.2"/></svg>
        </span>
        <span>{{ info.nombreNegocio || 'Tienda 3D' }}</span>
      </router-link>
      <q-space />
      <q-btn flat round dense :icon="theme.isDark ? 'light_mode' : 'dark_mode'" @click="theme.toggle()">
        <q-tooltip>{{ theme.isDark ? 'Modo claro' : 'Modo oscuro' }}</q-tooltip>
      </q-btn>
      <q-btn flat round id="i3d-cart-btn" icon="shopping_cart" @click="$router.push('/tienda/carrito')">
        <q-badge v-if="carrito.count" color="primary" floating>{{ carrito.count }}</q-badge>
      </q-btn>
    </header>

    <main class="i3d-store-main">
      <router-view />
    </main>

    <footer class="i3d-store-footer">
      <span>{{ info.nombreNegocio || 'Tienda 3D' }} — Impresión 3D a pedido</span>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useCarritoStore } from '../stores/carrito.js';
import { useThemeStore } from '../stores/theme.js';
import { fetchTiendaInfo } from '../services/api.js';

const carrito = useCarritoStore();
const theme = useThemeStore();
const info = ref({});

onMounted(async () => {
  try { info.value = await fetchTiendaInfo(); } catch { /* la tienda puede no estar configurada aun */ }
});
</script>

<style scoped>
.i3d-store { min-height: 100vh; display: flex; flex-direction: column; background: var(--bg-base); }
.i3d-store-header {
  display: flex; align-items: center; gap: 12px;
  background: color-mix(in srgb, var(--bg-surface) 88%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border);
  padding: 14px 22px; position: sticky; top: 0; z-index: 20;
}
.i3d-store-brand {
  display: flex; align-items: center; gap: 10px;
  font-family: var(--font-display); font-weight: 700; font-size: 19px;
  color: var(--text-primary); text-decoration: none;
}
.i3d-brand-mark { width: 26px; height: 26px; }
.i3d-brand-mark svg { width: 100%; height: 100%; }
.i3d-store-main { flex: 1; max-width: 1200px; width: 100%; margin: 0 auto; padding: 28px 18px; }
.i3d-store-footer {
  text-align: center; padding: 24px; color: var(--text-muted); font-size: 13px;
  border-top: 1px solid var(--border);
}
</style>
