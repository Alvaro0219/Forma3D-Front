<template>
  <Teleport to="body">
    <Transition name="i3d-cart-fade">
      <div v-if="carrito.drawerOpen" class="i3d-cart-backdrop" @click="carrito.closeDrawer()"></div>
    </Transition>
    <Transition name="i3d-cart-slide">
      <aside v-if="carrito.drawerOpen" class="i3d-cart-panel" role="dialog" aria-label="Carrito">
        <div class="i3d-cart-head">
          <span class="i3d-cart-title">Tu carrito</span>
          <q-btn flat round dense @click="carrito.closeDrawer()"><AppIcon name="close" :size="18" /></q-btn>
        </div>

        <div v-if="carrito.isEmpty" class="i3d-cart-empty">
          <AppIcon name="shopping_cart" :size="36" color="muted" />
          <span>Tu carrito está vacío.</span>
          <q-btn color="primary" label="Ir al catálogo" unelevated no-caps @click="carrito.closeDrawer()" />
        </div>

        <template v-else>
          <div class="i3d-cart-items">
            <div v-for="item in carrito.items" :key="item.id" class="i3d-cart-item">
              <div class="i3d-cart-thumb">
                <img v-if="item.fotoPrincipal" :src="item.fotoPrincipal" :alt="item.nombre" />
                <AppIcon v-else name="view_in_ar" :size="20" color="muted" />
              </div>
              <div class="i3d-cart-info">
                <div class="i3d-cart-name">{{ item.nombre }}</div>
                <div class="i3d-cart-code mono">{{ item.codigo }}</div>
                <div class="i3d-cart-qty">
                  <q-btn flat dense round size="xs" @click="dec(item)"><AppIcon name="remove" :size="12" /></q-btn>
                  <span>{{ item.cantidad }}</span>
                  <q-btn flat dense round size="xs" @click="inc(item)"><AppIcon name="add" :size="12" /></q-btn>
                </div>
              </div>
              <div class="i3d-cart-right">
                <div class="i3d-cart-sub">{{ money(item.precio * item.cantidad) }}</div>
                <q-btn flat dense round size="sm" @click="carrito.remove(item.id)"><AppIcon name="close" :size="14" color="danger" /></q-btn>
              </div>
            </div>
          </div>

          <div class="i3d-cart-foot">
            <div class="i3d-cart-total"><span>Total</span><b>{{ money(carrito.total) }}</b></div>

            <q-input v-model="datos.nombre" outlined dense label="Tu nombre *" class="q-mb-sm" />
            <q-input v-model="datos.notas" outlined dense type="textarea" autogrow label="Notas del pedido (opcional)" class="q-mb-md" />

            <q-btn color="positive" class="full-width i3d-wa-btn" size="lg" unelevated
                   :loading="loading" @click="finalizar">
              <WhatsAppIcon :size="20" class="q-mr-sm" />Finalizar por WhatsApp
            </q-btn>
            <div class="i3d-cart-hint">Se abrirá WhatsApp con el detalle del pedido. No se procesan pagos en el sitio.</div>
          </div>
        </template>
      </aside>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { useCarritoStore } from '../stores/carrito.js';
import { checkoutTienda } from '../services/api.js';
import AppIcon from './AppIcon.vue';
import WhatsAppIcon from './WhatsAppIcon.vue';
import { formatMoney } from '../utils/format.js';

const $q = useQuasar();
const carrito = useCarritoStore();
const money = (n) => formatMoney(n);

const datos = ref({ nombre: '', notas: '' });
const loading = ref(false);

function inc(item) { carrito.setCantidad(item.id, item.cantidad + 1); }
function dec(item) { if (item.cantidad > 1) carrito.setCantidad(item.id, item.cantidad - 1); }

async function finalizar() {
  if (!datos.value.nombre) { $q.notify({ type: 'warning', message: 'Contanos tu nombre para el pedido' }); return; }
  loading.value = true;
  try {
    const res = await checkoutTienda({
      items: carrito.items.map((i) => ({ producto: i.id, cantidad: i.cantidad })),
      nombre: datos.value.nombre,
      notas: datos.value.notas || undefined
    });
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
.i3d-cart-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,.55);
  z-index: 900;
}
.i3d-cart-panel {
  position: fixed; top: 0; right: 0; bottom: 0; width: 420px; max-width: 92vw;
  background: var(--bg-elevated); border-left: 1px solid var(--border-strong);
  box-shadow: var(--shadow-2); z-index: 901;
  display: flex; flex-direction: column;
}
.i3d-cart-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--sp-4) var(--sp-4); border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.i3d-cart-title { font-size: var(--fs-title); font-weight: var(--fw-title); color: var(--text-primary); }

.i3d-cart-empty {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: var(--sp-3); color: var(--text-muted); padding: var(--sp-6);
}

.i3d-cart-items { flex: 1; overflow-y: auto; padding: var(--sp-2) var(--sp-4); }
.i3d-cart-item { display: flex; align-items: center; gap: var(--sp-3); padding: var(--sp-3) 0; border-bottom: 1px solid var(--border); }
.i3d-cart-item:last-child { border-bottom: none; }
.i3d-cart-thumb {
  width: 48px; height: 48px; border-radius: var(--radius-sm); background: var(--bg-sunken); flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.i3d-cart-thumb img { width: 100%; height: 100%; object-fit: cover; }
.i3d-cart-info { flex: 1; min-width: 0; }
.i3d-cart-name { font-size: var(--fs-meta); font-weight: 600; color: var(--text-primary); }
.i3d-cart-code { font-size: 11px; color: var(--text-muted); }
.i3d-cart-qty { display: flex; align-items: center; gap: 4px; margin-top: 2px; }
.i3d-cart-qty span { font-variant-numeric: tabular-nums; min-width: 16px; text-align: center; font-size: var(--fs-meta); }
.i3d-cart-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.i3d-cart-sub { font-weight: 600; color: var(--text-primary); font-variant-numeric: tabular-nums; font-size: var(--fs-meta); }

.i3d-cart-foot { flex-shrink: 0; padding: var(--sp-4); border-top: 1px solid var(--border-strong); background: var(--bg-surface); }
.i3d-cart-total { display: flex; justify-content: space-between; font-size: 17px; font-weight: 700; margin-bottom: var(--sp-3); }
.i3d-cart-total b { color: var(--accent); font-variant-numeric: tabular-nums; }
.i3d-wa-btn { background: #25D366 !important; color: #fff !important; }
.i3d-cart-hint { font-size: 11px; color: var(--text-muted); text-align: center; margin-top: var(--sp-2); }

/* Transiciones */
.i3d-cart-fade-enter-active, .i3d-cart-fade-leave-active { transition: opacity var(--dur-base) var(--ease-standard); }
.i3d-cart-fade-enter-from, .i3d-cart-fade-leave-to { opacity: 0; }
.i3d-cart-slide-enter-active, .i3d-cart-slide-leave-active { transition: transform var(--dur-base) var(--ease-standard); }
.i3d-cart-slide-enter-from, .i3d-cart-slide-leave-to { transform: translateX(100%); }

@media (prefers-reduced-motion: reduce) {
  .i3d-cart-fade-enter-active, .i3d-cart-fade-leave-active,
  .i3d-cart-slide-enter-active, .i3d-cart-slide-leave-active { transition: none; }
}
</style>
