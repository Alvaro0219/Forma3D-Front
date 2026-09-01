import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

// Layouts
const AdminLayout = () => import('../layouts/AdminLayout.vue');
const StoreLayout = () => import('../layouts/StoreLayout.vue');

// Auth
const Login = () => import('../pages/login.vue');

// Tienda publica
const TiendaCatalogo = () => import('../pages/tienda/index.vue');
const TiendaCarrito = () => import('../pages/tienda/carrito.vue');

// Admin
const Dashboard = () => import('../pages/admin/dashboard.vue');
const Productos = () => import('../pages/admin/productos.vue');
const Clientes = () => import('../pages/admin/clientes.vue');
const Proveedores = () => import('../pages/admin/proveedores.vue');
const Pedidos = () => import('../pages/admin/pedidos.vue');
const Ventas = () => import('../pages/admin/ventas.vue');
const Filamentos = () => import('../pages/admin/filamentos.vue');
const Insumos = () => import('../pages/admin/insumos.vue');
const Compras = () => import('../pages/admin/compras.vue');
const Calculadora = () => import('../pages/admin/calculadora.vue');
const Configuracion = () => import('../pages/admin/configuracion.vue');
const Impresiones = () => import('../pages/admin/impresiones.vue');
const Archivos = () => import('../pages/admin/archivos.vue');

const routes = [
  { path: '/login', component: Login, meta: { public: true } },

  // Tienda publica
  {
    path: '/tienda',
    component: StoreLayout,
    meta: { public: true },
    children: [
      { path: '', component: TiendaCatalogo },
      { path: 'carrito', component: TiendaCarrito }
    ]
  },

  // Administracion (privado)
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/admin/dashboard' },
      { path: 'dashboard', component: Dashboard },
      { path: 'productos', component: Productos },
      { path: 'clientes', component: Clientes },
      { path: 'proveedores', component: Proveedores },
      { path: 'pedidos', component: Pedidos },
      { path: 'ventas', component: Ventas },
      { path: 'filamentos', component: Filamentos },
      { path: 'insumos', component: Insumos },
      { path: 'compras', component: Compras, meta: { requiresAuth: true, role: 'admin' } },
      { path: 'calculadora', component: Calculadora, meta: { requiresAuth: true, role: 'admin' } },
      { path: 'configuracion', component: Configuracion, meta: { requiresAuth: true, role: 'admin' } },
      { path: 'impresiones', component: Impresiones },
      { path: 'archivos', component: Archivos }
    ]
  },

  { path: '/', redirect: '/tienda' },
  { path: '/:pathMatch(.*)*', redirect: '/tienda' }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
});

// Guard global: unica fuente de verdad para acceso y roles.
router.beforeEach((to) => {
  const auth = useAuthStore();
  if (!auth.accessToken) auth.hydrate();

  if (to.meta.public) return true;
  if (to.meta.requiresAuth && !auth.isAuthenticated) return { path: '/login' };

  // Rutas restringidas a admin (costos, compras, configuracion).
  if (to.meta.role === 'admin' && auth.user?.role !== 'admin') {
    return { path: '/admin/dashboard' };
  }
  return true;
});

export default router;
