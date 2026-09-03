<template>
  <div class="i3d-cart">
    <div class="i3d-cart-head">
      <q-btn flat dense to="/tienda"><AppIcon name="arrow_back" :size="16" class="q-mr-xs" />Seguir comprando</q-btn>
      <h1>Tu carrito</h1>
    </div>

    <div v-if="carrito.isEmpty" class="app-empty-state">
      <AppIcon name="shopping_cart" :size="40" color="muted" />
      <span>Tu carrito está vacío.</span>
      <q-btn color="primary" label="Ir al catálogo" to="/tienda" class="q-mt-md" />
    </div>

    <div v-else class="row q-col-gutter-md">
      <!-- Items -->
      <div class="col-12 col-md-8">
        <div class="i3d-section-card">
          <div v-for="item in carrito.items" :key="item.id" class="i3d-cart-item">
            <div class="i3d-cart-thumb">
              <img v-if="item.fotoPrincipal" :src="item.fotoPrincipal" :alt="item.nombre" />
              <AppIcon v-else name="view_in_ar" :size="22" color="muted" />
            </div>
            <div class="i3d-cart-info">
              <div class="i3d-cart-name">{{ item.nombre }}</div>
              <div class="i3d-cart-code">{{ item.codigo }}</div>
              <div class="i3d-cart-price">{{ money(item.precio) }} c/u</div>
            </div>
            <div class="i3d-cart-qty">
              <q-btn flat dense round size="sm" @click="dec(item)"><AppIcon name="remove" :size="14" /></q-btn>
              <span>{{ item.cantidad }}</span>
              <q-btn flat dense round size="sm" @click="inc(item)"><AppIcon name="add" :size="14" /></q-btn>
            </div>
            <div class="i3d-cart-sub">{{ money(item.precio * item.cantidad) }}</div>
            <q-btn flat dense round color="negative" @click="carrito.remove(item.id)"><AppIcon name="delete" :size="16" /></q-btn>
          </div>
        </div>
      </div>

      <!-- Resumen + datos -->
      <div class="col-12 col-md-4">
        <div class="i3d-section-card i3d-summary">
          <div class="text-subtitle1 q-mb-md">Finalizar pedido</div>
          <q-input v-model="datos.nombre" outlined dense label="Nombre *" class="q-mb-sm" />
          <q-input v-model="datos.telefono" outlined dense label="WhatsApp / Teléfono *" class="q-mb-sm" />
          <q-input v-model="datos.email" outlined dense label="Email (opcional)" class="q-mb-sm" />
          <q-input v-model="datos.direccion" outlined dense label="Dirección (opcional)" class="q-mb-sm" />
          <q-input v-model="datos.notas" outlined dense type="textarea" autogrow label="Notas del pedido" class="q-mb-md" />

          <div class="i3d-summary-total">
            <span>Total</span><b>{{ money(carrito.total) }}</b>
          </div>

          <q-btn color="green-7" class="full-width q-mt-md" size="lg"
                 :loading="loading" @click="finalizar" unelevated>
            <AppIcon name="chat" :size="18" class="q-mr-xs" />Finalizar por WhatsApp
          </q-btn>
          <div class="text-caption text-grey q-mt-sm text-center">
            Se abrirá WhatsApp con el detalle del pedido. No se procesan pagos en el sitio.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { useCarritoStore } from '../../stores/carrito.js';
import { checkoutTienda } from '../../services/api.js';
import AppIcon from '../../components/AppIcon.vue';
import { formatMoney } from '../../utils/format.js';

const $q = useQuasar();
const carrito = useCarritoStore();
const money = (n) => formatMoney(n);

const datos = ref({ nombre: '', telefono: '', email: '', direccion: '', notas: '' });
const loading = ref(false);

function inc(item) { carrito.setCantidad(item.id, item.cantidad + 1); }
function dec(item) { if (item.cantidad > 1) carrito.setCantidad(item.id, item.cantidad - 1); }

async function finalizar() {
  if (!datos.value.nombre || !datos.value.telefono) {
    $q.notify({ type: 'warning', message: 'Completá tu nombre y teléfono' });
    return;
  }
  loading.value = true;
  try {
    const res = await checkoutTienda({
      items: carrito.items.map((i) => ({ producto: i.id, cantidad: i.cantidad })),
      nombre: datos.value.nombre,
      telefono: datos.value.telefono,
      email: datos.value.email || undefined,
      direccion: datos.value.direccion || undefined,
      notas: datos.value.notas || undefined
    });
    // Abrir WhatsApp con el mensaje generado por el servidor.
    window.open(res.url, '_blank');
    $q.notify({ type: 'positive', message: 'Abriendo WhatsApp con tu pedido...' });
  } catch (e) {
    const msg = e.code === 'NO_WHATSAPP'
      ? 'La tienda aún no tiene WhatsApp configurado.'
      : (e.message || 'No se pudo finalizar el pedido');
    $q.notify({ type: 'negative', message: msg });
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.i3d-cart-head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.i3d-cart-head h1 { font-size: 24px; margin: 0; color: var(--text-primary); }

.i3d-cart-item {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 0; border-bottom: 1px solid var(--border);
}
.i3d-cart-item:last-child { border-bottom: none; }
.i3d-cart-thumb {
  width: 56px; height: 56px; border-radius: var(--radius-sm); background: var(--bg-sunken); flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.i3d-cart-thumb img { width: 100%; height: 100%; object-fit: cover; }
.i3d-cart-info { flex: 1; min-width: 0; }
.i3d-cart-name { font-weight: 600; color: var(--text-primary); }
.i3d-cart-code { font-size: 12px; color: var(--text-muted); font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
.i3d-cart-price { font-size: 13px; color: var(--text-secondary); font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
.i3d-cart-qty { display: flex; align-items: center; gap: 6px; }
.i3d-cart-qty span { font-family: var(--font-mono); font-variant-numeric: tabular-nums; min-width: 20px; text-align: center; }
.i3d-cart-sub { width: 90px; text-align: right; font-weight: 600; color: var(--text-primary); font-family: var(--font-mono); font-variant-numeric: tabular-nums; }

.i3d-summary { position: sticky; top: 88px; }
.i3d-summary-total { display: flex; justify-content: space-between; font-size: 18px; font-weight: 600; padding-top: 12px; border-top: 1px solid var(--border-strong); }
.i3d-summary-total b { color: var(--accent); font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
</style>
