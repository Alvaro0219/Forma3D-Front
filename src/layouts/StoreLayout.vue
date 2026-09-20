<template>
  <div class="i3d-store">
    <header class="i3d-store-header">
      <router-link to="/tienda" class="i3d-store-brand">
        <span class="i3d-brand-mark" aria-hidden="true">
          <img src="/forma-logo.png" alt="" class="i3d-brand-logo" />
        </span>
        <span>{{ info.nombreNegocio || 'Tienda 3D' }}</span>
      </router-link>
      <q-space />
      <q-btn flat round @click="carrito.openDrawer()">
        <AppIcon name="shopping_cart" :size="20" />
        <q-badge v-if="carrito.count" color="primary" floating>{{ carrito.count }}</q-badge>
      </q-btn>
    </header>

    <main class="i3d-store-main">
      <router-view />
    </main>

    <footer class="i3d-store-footer">
      <img src="/forma-logo.png" alt="" class="i3d-footer-logo" />
      <span>{{ info.nombreNegocio || 'Tienda 3D' }} — Impresión 3D a pedido</span>
    </footer>

    <!-- Carrito flotante: siempre visible, abre el panel sin cambiar de pagina -->
    <button id="i3d-cart-btn" class="i3d-cart-fab" @click="carrito.openDrawer()" aria-label="Ver carrito">
      <AppIcon name="shopping_cart" :size="20" :bordered="false" />
      <span>Pedido</span>
      <span v-if="carrito.count" class="i3d-cart-fab-badge">{{ carrito.count }}</span>
    </button>
    <CartDrawer />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { Dark } from 'quasar';
import { useCarritoStore } from '../stores/carrito.js';
import { useThemeStore } from '../stores/theme.js';
import { fetchTiendaInfo } from '../services/api.js';
import AppIcon from '../components/AppIcon.vue';
import CartDrawer from '../components/CartDrawer.vue';
import '../styles/tienda-brand.css';

const carrito = useCarritoStore();
const theme = useThemeStore();
const info = ref({});

// La tienda tiene una identidad de marca fija (blanco + rojo), independiente
// del dark/light del panel de administracion: activa el override de tokens
// mientras se navega /tienda y lo saca al salir (ver styles/tienda-brand.css).
//
// Ademas de los tokens, Quasar arranca con config.dark=true (main.js) y ese
// modo oscuro queda "pegado" segun la ultima preferencia del panel — sin este
// Dark.set(false), las etiquetas de los q-input salen en blanco sobre fondo
// blanco (invisibles), porque Quasar sigue creyendo que el fondo es oscuro.
let prevThemeColor = null;
onMounted(async () => {
  document.documentElement.setAttribute('data-store-brand', '1');
  Dark.set(false);
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) { prevThemeColor = meta.getAttribute('content'); meta.setAttribute('content', '#FFFFFF'); }
  try { info.value = await fetchTiendaInfo(); } catch { /* la tienda puede no estar configurada aun */ }
});
onUnmounted(() => {
  document.documentElement.removeAttribute('data-store-brand');
  theme.apply(); // restaura el dark/light de Quasar segun la preferencia del panel
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta && prevThemeColor) meta.setAttribute('content', prevThemeColor);
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
  font-family: var(--font-display); font-weight: 500; font-size: 20px;
  color: var(--text-primary); text-decoration: none;
}
.i3d-brand-mark {
  width: 32px; height: 32px; flex-shrink: 0; border-radius: 50%;
  overflow: hidden; background: #FFFFFF;
}
.i3d-brand-logo { width: 100%; height: 100%; object-fit: contain; }
.i3d-store-main { flex: 1; max-width: 1200px; width: 100%; margin: 0 auto; padding: 28px 18px; }
.i3d-store-footer {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  text-align: center; padding: 28px 24px; color: var(--text-muted); font-size: 13px;
  border-top: 1px solid var(--border);
}
.i3d-footer-logo {
  width: 32px; height: 32px; border-radius: 50%; overflow: hidden;
  background: #FFFFFF; object-fit: contain;
}

/* Carrito flotante: siempre visible en la esquina, para no perderlo de vista */
.i3d-cart-fab {
  position: fixed; right: 22px; bottom: 22px; z-index: 500;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 12px 20px 12px 16px; border: none; border-radius: var(--radius-pill);
  background: var(--accent); color: var(--accent-contrast);
  font-family: var(--font-sans); font-size: 14px; font-weight: 700;
  box-shadow: var(--glow-accent), var(--shadow-2);
  cursor: pointer; transition: transform var(--dur-micro) var(--ease-standard);
}
.i3d-cart-fab:hover { transform: translateY(-2px); }
.i3d-cart-fab.i3d-cart-bump { animation: i3d-cart-bump-kf .34s var(--ease-standard); }
@keyframes i3d-cart-bump-kf { 30% { transform: scale(1.15); } 100% { transform: scale(1); } }
.i3d-cart-fab-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 20px; height: 20px; padding: 0 5px; border-radius: var(--radius-pill);
  background: var(--accent-contrast); color: var(--accent);
  font-size: 11px; font-weight: 800;
}
@media (max-width: 599px) {
  .i3d-cart-fab span:not(.i3d-cart-fab-badge) { display: none; }
  .i3d-cart-fab { padding: 14px; }
}
</style>
