<template>
  <div class="i3d-shell" :class="{ 'i3d-shell--collapsed': collapsed }">
    <!-- Sidebar -->
    <aside class="i3d-sidebar">
      <div class="i3d-brand">
        <span class="i3d-brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M12 2 L21 7 V17 L12 22 L3 17 V7 Z" stroke="var(--accent)" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 12 L21 7 M12 12 V22 M12 12 L3 7" stroke="var(--tech)" stroke-width="1.2"/></svg>
        </span>
        <span class="i3d-brand-name">{{ nombreNegocio }}</span>
      </div>

      <nav class="i3d-nav">
        <template v-for="group in navGroups" :key="group.title">
          <div class="i3d-nav-group" v-if="group.items.length">
            <div class="i3d-nav-group-title">{{ group.title }}</div>
            <router-link
              v-for="item in group.items"
              :key="item.path"
              :to="item.path"
              class="i3d-nav-link"
              :class="{ active: isActive(item.path) }"
            >
              <AppIcon :name="item.icon" :size="20" />
              <span class="i3d-nav-label">{{ item.label }}</span>
              <q-tooltip v-if="collapsed" anchor="center right" self="center left">{{ item.label }}</q-tooltip>
            </router-link>
          </div>
        </template>
      </nav>

      <div class="i3d-sidebar-footer">
        <a href="/tienda" target="_blank" class="i3d-nav-link">
          <AppIcon name="storefront" :size="20" />
          <span class="i3d-nav-label">Ver tienda</span>
        </a>
      </div>
    </aside>

    <!-- Main -->
    <div class="i3d-main">
      <header class="i3d-topbar">
        <q-btn flat round dense class="i3d-collapse-btn" @click="toggleCollapse"><AppIcon name="menu_open" :size="20" /></q-btn>
        <q-btn flat round dense class="i3d-mobile-menu-btn" @click="mobileMenu = true"><AppIcon name="menu" :size="20" /></q-btn>

        <q-space />

        <q-btn flat round dense @click="theme.toggle()">
          <AppIcon :name="theme.isDark ? 'light_mode' : 'dark_mode'" :size="18" />
          <q-tooltip>{{ theme.isDark ? 'Modo claro' : 'Modo oscuro' }}</q-tooltip>
        </q-btn>

        <q-btn-dropdown flat no-caps class="i3d-user-btn" dropdown-icon="none">
          <template #label>
            <div class="i3d-user-chip">
              <AppIcon name="account_circle" :size="22" />
              <div class="i3d-user-meta">
                <span class="i3d-user-name">{{ auth.user?.name }}</span>
                <span class="i3d-user-role mono">{{ auth.user?.role }}</span>
              </div>
            </div>
            <AppIcon name="expand_more" :size="16" :bordered="false" class="i3d-user-caret" />
          </template>
          <q-list>
            <q-item clickable v-close-popup @click="logout">
              <q-item-section avatar><AppIcon name="logout" :size="18" /></q-item-section>
              <q-item-section>Cerrar sesión</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </header>

      <main class="i3d-content">
        <router-view v-slot="{ Component }">
          <transition name="i3d-route" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <!-- Drawer mobile -->
    <q-dialog v-model="mobileMenu" position="left" full-height>
      <q-card class="i3d-drawer">
        <div class="i3d-brand"><span class="i3d-brand-name">{{ nombreNegocio }}</span></div>
        <q-list>
          <template v-for="group in navGroups" :key="group.title">
            <q-item-label header v-if="group.items.length">{{ group.title }}</q-item-label>
            <q-item
              v-for="item in group.items" :key="item.path"
              clickable v-close-popup :active="isActive(item.path)" @click="go(item.path)"
            >
              <q-item-section avatar><AppIcon :name="item.icon" :size="18" /></q-item-section>
              <q-item-section>{{ item.label }}</q-item-section>
            </q-item>
          </template>
        </q-list>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import { useThemeStore } from '../stores/theme.js';
import { fetchConfig } from '../services/api.js';
import AppIcon from '../components/AppIcon.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const theme = useThemeStore();

const mobileMenu = ref(false);
const collapsed = ref(loadCollapsed());
const nombreNegocio = ref('Gestión 3D');

function loadCollapsed() {
  try { return localStorage.getItem('i3d_sidebar_collapsed') === '1'; } catch { return false; }
}
function toggleCollapse() {
  collapsed.value = !collapsed.value;
  try { localStorage.setItem('i3d_sidebar_collapsed', collapsed.value ? '1' : '0'); } catch { /* noop */ }
}

const allGroups = [
  { title: 'Operación', items: [
    { path: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/admin/pedidos', label: 'Pedidos', icon: 'receipt_long' },
    { path: '/admin/impresiones', label: 'Impresiones', icon: 'print' }
  ] },
  { title: 'Comercial', items: [
    { path: '/admin/productos', label: 'Catálogo', icon: 'category' },
    { path: '/admin/clientes', label: 'Clientes', icon: 'people' },
    { path: '/admin/ventas', label: 'Ventas', icon: 'point_of_sale' }
  ] },
  { title: 'Insumos', items: [
    { path: '/admin/insumos', label: 'Stock', icon: 'inventory_2' },
    { path: '/admin/filamentos', label: 'Filamentos', icon: 'grain' },
    { path: '/admin/proveedores', label: 'Proveedores', icon: 'local_shipping' },
    { path: '/admin/compras', label: 'Compras', icon: 'shopping_cart', admin: true }
  ] },
  { title: 'Diseño', items: [
    { path: '/admin/archivos', label: 'Archivos 3D', icon: 'view_in_ar' }
  ] },
  { title: 'Herramientas', items: [
    { path: '/admin/calculadora', label: 'Calculadora', icon: 'calculate', admin: true },
    { path: '/admin/configuracion', label: 'Configuración', icon: 'settings', admin: true }
  ] }
];

const navGroups = computed(() => allGroups.map((g) => ({
  title: g.title,
  items: g.items.filter((i) => !i.admin || auth.isAdmin)
})));

function isActive(path) { return route.path === path || route.path.startsWith(path + '/'); }
function go(path) { router.push(path); }
function logout() { auth.logout(); router.push('/login'); }

onMounted(async () => {
  try {
    const cfg = await fetchConfig();
    if (cfg?.nombreNegocio) nombreNegocio.value = cfg.nombreNegocio;
  } catch { /* default */ }
});
</script>

<style scoped>
.i3d-shell { display: flex; min-height: 100vh; background: var(--bg-base); }

/* ---- Sidebar ---- */
.i3d-sidebar {
  width: 248px;
  background: var(--bg-surface);
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column;
  position: sticky; top: 0; height: 100vh;
  transition: width var(--dur-base) var(--ease-standard);
}
.i3d-shell--collapsed .i3d-sidebar { width: 68px; }

.i3d-brand {
  display: flex; align-items: center; gap: 10px;
  padding: 18px 16px; height: 60px;
  border-bottom: 1px solid var(--border);
}
.i3d-brand-mark { width: 26px; height: 26px; flex-shrink: 0; }
.i3d-brand-mark svg { width: 100%; height: 100%; }
.i3d-brand-name {
  font-weight: 700; font-size: 15px;
  color: var(--text-primary); white-space: nowrap; overflow: hidden;
}
.i3d-shell--collapsed .i3d-brand-name { display: none; }

.i3d-nav { flex: 1; overflow-y: auto; padding: 12px 10px; }
.i3d-nav-group { margin-bottom: 14px; }
.i3d-nav-group-title {
  font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  color: var(--text-muted); padding: 4px 10px; margin-bottom: 2px;
}
.i3d-shell--collapsed .i3d-nav-group-title { opacity: 0; height: 8px; padding: 0; }

.i3d-nav-link {
  display: flex; align-items: center; gap: 12px;
  padding: 9px 10px; border-radius: var(--radius-sm);
  color: var(--text-secondary); font-size: 14px; font-weight: 500;
  transition: background var(--dur-micro) var(--ease-standard), color var(--dur-micro) var(--ease-standard);
  position: relative;
}
.i3d-nav-link:hover { background: var(--bg-elevated); color: var(--text-primary); }
.i3d-nav-link.active { background: var(--accent-soft); color: var(--accent); }
.i3d-nav-link.active::before {
  content: ""; position: absolute; left: -10px; top: 8px; bottom: 8px; width: 3px;
  background: var(--accent); border-radius: 0 3px 3px 0;
}
.i3d-shell--collapsed .i3d-nav-label { display: none; }
.i3d-shell--collapsed .i3d-nav-link { justify-content: center; }

.i3d-sidebar-footer { border-top: 1px solid var(--border); padding: 10px; }

/* ---- Main ---- */
.i3d-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }

.i3d-topbar {
  display: flex; align-items: center; gap: 10px;
  height: 60px; padding: 0 16px;
  background: color-mix(in srgb, var(--bg-base) 80%, transparent);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border);
  position: sticky; top: 0; z-index: 20;
}
.i3d-collapse-btn { color: var(--text-secondary); }
.i3d-mobile-menu-btn { display: none; color: var(--text-secondary); }

.i3d-user-chip { display: flex; align-items: center; gap: 8px; }
.i3d-user-meta { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.1; }
.i3d-user-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.i3d-user-role { font-size: 11px; color: var(--text-muted); text-transform: capitalize; }
.i3d-user-caret { color: var(--text-muted); margin-left: 2px; }

.i3d-content { flex: 1; min-width: 0; }

.i3d-drawer { width: 270px; max-width: 82vw; height: 100%; background: var(--bg-surface); border-radius: 0 !important; }

/* Transición de ruta */
.i3d-route-enter-active { transition: opacity var(--dur-base) var(--ease-standard), transform var(--dur-base) var(--ease-standard); }
.i3d-route-leave-active { transition: opacity var(--dur-micro) var(--ease-standard); }
.i3d-route-enter-from { opacity: 0; transform: translateY(8px); }
.i3d-route-leave-to { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .i3d-route-enter-from { transform: none; }
}

@media (max-width: 1023px) {
  .i3d-sidebar { display: none; }
  .i3d-collapse-btn { display: none; }
  .i3d-mobile-menu-btn { display: inline-flex; }
  .i3d-user-meta { display: none; }
}
</style>


<style>
/* Quasar aplica --minimized (padding 24px) junto con --fullheight; sin quitar ese padding
   el drawer queda "colgando" con hueco arriba/abajo en vez de ocupar todo el alto.
   .q-dialog__inner es un wrapper interno de Quasar, ancestro de nuestro contenido: el scoped
   CSS (ni :deep()) no puede alcanzarlo, por eso este bloque global. */
.q-dialog__inner--left.q-dialog__inner--fullheight {
  padding: 0 !important;
}
</style>
