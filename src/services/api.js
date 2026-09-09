import axios from 'axios';
import { useAuthStore } from '../stores/auth.js';
import { ApiError } from '../utils/ApiError.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

const api = axios.create({ baseURL: API_BASE_URL });

// ─── Interceptor de request: inyecta el token ───────────────
api.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.accessToken) config.headers.Authorization = `Bearer ${auth.accessToken}`;
  return config;
});

// ─── Interceptor de response: refresh automatico en 401 ─────
let refreshPromise = null;

function redirectToLoginWithReason(reason) {
  try { sessionStorage.setItem('i3d_login_reason', reason); } catch { /* noop */ }
  if (!window.location.pathname.startsWith('/login')) window.location.assign('/login');
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const auth = useAuthStore();
    const originalRequest = error?.config;
    const status = error?.response?.status;
    const isAuthRoute = originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/refresh');

    if (status !== 401 || !originalRequest || originalRequest._retry || isAuthRoute) throw error;
    if (!auth.refreshToken) { auth.logout(); redirectToLoginWithReason('session-expired'); throw error; }

    originalRequest._retry = true;
    try {
      if (!refreshPromise) refreshPromise = auth.refreshSession();
      await refreshPromise;
      originalRequest.headers.Authorization = `Bearer ${auth.accessToken}`;
      return api.request(originalRequest);
    } catch (refreshError) {
      auth.logout();
      redirectToLoginWithReason('session-expired');
      throw refreshError;
    } finally {
      refreshPromise = null;
    }
  }
);

// Propaga { message, code } del backend como ApiError tipado.
function unwrap(data, fallbackMessage, status = null) {
  if (!data.success) {
    throw new ApiError(data.error?.message || fallbackMessage, data.error?.code || 'UNKNOWN_ERROR', status);
  }
  return data.data;
}

// Helpers CRUD genericos que devuelven la respuesta paginada { items, pagination }.
async function getList(path, params = {}) {
  const { data } = await api.get(path, { params });
  return data.data || { items: [], pagination: {} };
}
async function getOne(path) {
  const { data, status } = await api.get(path);
  return unwrap(data, 'No encontrado', status);
}
async function postOne(path, payload) {
  const { data, status } = await api.post(path, payload);
  return unwrap(data, 'Error al crear', status);
}
async function putOne(path, payload) {
  const { data, status } = await api.put(path, payload);
  return unwrap(data, 'Error al actualizar', status);
}
async function delOne(path) {
  const { data, status } = await api.delete(path);
  return unwrap(data, 'Error al eliminar', status);
}

// ─── Auth ───────────────────────────────────────────────────
export async function loginApi(email, password) {
  const { data, status } = await api.post('/auth/login', { email, password });
  return unwrap(data, 'No se pudo iniciar sesión', status);
}
export async function refreshApi(refreshToken) {
  const { data, status } = await api.post('/auth/refresh', { refreshToken });
  return unwrap(data, 'Sesión expirada', status);
}
export const fetchUsers = (params) => getList('/auth/users', params);
export const createUser = (p) => postOne('/auth/users', p);
export const updateUser = (id, p) => putOne(`/auth/users/${id}`, p);
export const cambiarPassword = (actual, nueva) => putOne('/auth/password', { actual, nueva });

// ─── Dashboard ──────────────────────────────────────────────
export const fetchResumen = () => getOne('/dashboard/resumen');
export const fetchSeries = (dias = 30) => getOne(`/dashboard/series?dias=${dias}`);

// ─── Clientes ───────────────────────────────────────────────
export const fetchClientes = (params) => getList('/clientes', params);
export const fetchCliente = (id) => getOne(`/clientes/${id}`);
export const createCliente = (p) => postOne('/clientes', p);
export const updateCliente = (id, p) => putOne(`/clientes/${id}`, p);
export const deleteCliente = (id) => delOne(`/clientes/${id}`);

// ─── Proveedores ────────────────────────────────────────────
export const fetchProveedores = (params) => getList('/proveedores', params);
export const createProveedor = (p) => postOne('/proveedores', p);
export const updateProveedor = (id, p) => putOne(`/proveedores/${id}`, p);
export const deleteProveedor = (id) => delOne(`/proveedores/${id}`);

// ─── Productos ──────────────────────────────────────────────
export const fetchProductos = (params) => getList('/productos', params);
export const fetchProducto = (id) => getOne(`/productos/${id}`);
export const createProducto = (p) => postOne('/productos', p);
export const updateProducto = (id, p) => putOne(`/productos/${id}`, p);
export const deleteProducto = (id) => delOne(`/productos/${id}`);
export const fetchNextSku = (categoria) => getOne(`/productos/next-sku?categoria=${encodeURIComponent(categoria)}`);

// ─── Filamentos ─────────────────────────────────────────────
export const fetchFilamentos = (params) => getList('/filamentos', params);
export const createFilamento = (p) => postOne('/filamentos', p);
export const updateFilamento = (id, p) => putOne(`/filamentos/${id}`, p);
export const deleteFilamento = (id) => delOne(`/filamentos/${id}`);
export const consumirFilamento = (id, p) => postOne(`/filamentos/${id}/consumir`, p);
export const fetchFilamentoMovimientos = (id) => getOne(`/filamentos/${id}/movimientos`);

// ─── Insumos ────────────────────────────────────────────────
export const fetchInsumos = (params) => getList('/insumos', params);
export const createInsumo = (p) => postOne('/insumos', p);
export const updateInsumo = (id, p) => putOne(`/insumos/${id}`, p);
export const deleteInsumo = (id) => delOne(`/insumos/${id}`);
export const ajustarInsumo = (id, p) => postOne(`/insumos/${id}/ajuste`, p);
export const fetchInsumoMovimientos = (id) => getOne(`/insumos/${id}/movimientos`);

// ─── Compras ────────────────────────────────────────────────
export const fetchCompras = (params) => getList('/compras', params);
export const fetchCompra = (id) => getOne(`/compras/${id}`);
export const createCompra = (p) => postOne('/compras', p);

// ─── Pedidos ────────────────────────────────────────────────
export const fetchPedidos = (params) => getList('/pedidos', params);
export const fetchPedido = (id) => getOne(`/pedidos/${id}`);
export const createPedido = (p) => postOne('/pedidos', p);
export const updatePedido = (id, p) => putOne(`/pedidos/${id}`, p);
export const cambiarEstadoPedido = async (id, estado) => {
  const { data, status } = await api.patch(`/pedidos/${id}/estado`, { estado });
  return unwrap(data, 'Error al cambiar estado', status);
};
export const deletePedido = (id) => delOne(`/pedidos/${id}`);

// ─── Ventas ─────────────────────────────────────────────────
export const fetchVentas = (params) => getList('/ventas', params);
export const fetchVenta = (id) => getOne(`/ventas/${id}`);
export const createVenta = (p) => postOne('/ventas', p);
export const crearVentaDesdePedido = (p) => postOne('/ventas/desde-pedido', p);
export const anularVenta = async (id) => {
  const { data, status } = await api.patch(`/ventas/${id}/anular`);
  return unwrap(data, 'Error al anular', status);
};

// ─── Costos ─────────────────────────────────────────────────
export const calcularCosto = (p) => postOne('/costos/calcular', p);

// ─── Configuracion + Impresoras ─────────────────────────────
export const fetchConfig = () => getOne('/config');
export const updateConfig = (p) => putOne('/config', p);
export const fetchImpresoras = (params) => getList('/config/impresoras', params);
export const createImpresora = (p) => postOne('/config/impresoras', p);
export const updateImpresora = (id, p) => putOne(`/config/impresoras/${id}`, p);
export const deleteImpresora = (id) => delOne(`/config/impresoras/${id}`);

// ─── Impresiones (modulo secundario) ────────────────────────
export const fetchImpresiones = (params) => getList('/impresiones', params);
export const createImpresion = (p) => postOne('/impresiones', p);
export const updateImpresion = (id, p) => putOne(`/impresiones/${id}`, p);
export const deleteImpresion = (id) => delOne(`/impresiones/${id}`);
export const registrarConsumoImpresion = async (id) => {
  const { data, status } = await api.post(`/impresiones/${id}/consumo`);
  return unwrap(data, 'Error al registrar consumo', status);
};

// ─── Archivos 3D (modulo secundario) ────────────────────────
export const fetchArchivos = (params) => getList('/archivos', params);
export const fetchArchivo = (id) => getOne(`/archivos/${id}`);
export const createArchivo = (p) => postOne('/archivos', p);
export const updateArchivo = (id, p) => putOne(`/archivos/${id}`, p);
export const deleteArchivo = (id) => delOne(`/archivos/${id}`);
export const addArchivoVersion = (id, p) => postOne(`/archivos/${id}/versiones`, p);
export const setArchivoVersionActual = async (id, numero) => {
  const { data, status } = await api.patch(`/archivos/${id}/versiones/${numero}/actual`);
  return unwrap(data, 'Error al marcar versión actual', status);
};

// ─── Tienda publica (sin auth) ──────────────────────────────
export const fetchTiendaInfo = () => getOne('/tienda/info');
export const fetchCatalogo = (params) => getList('/tienda/productos', params);
export const fetchProductoPublico = (id) => getOne(`/tienda/productos/${id}`);
export const checkoutTienda = (p) => postOne('/tienda/checkout', p);

export default api;
