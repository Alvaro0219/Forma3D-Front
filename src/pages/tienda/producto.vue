<template>
  <div>
    <q-btn flat dense no-caps to="/tienda" class="i3d-back">
      <AppIcon name="arrow_back" :size="16" class="q-mr-xs" :bordered="false" />Volver al catálogo
    </q-btn>

    <LoadingState :loading="loading" :empty="!loading && !producto" empty-label="No encontramos este producto.">
      <div v-if="producto" class="i3d-detail">
        <div class="i3d-detail-gallery">
          <div class="i3d-detail-main-img" :class="{ 'i3d-printbed': !activeFoto }">
            <img v-if="activeFoto" :src="activeFoto" :alt="producto.nombre" />
            <AppIcon v-else name="view_in_ar" :size="56" color="muted" />
          </div>
          <div v-if="fotos.length > 1" class="i3d-detail-thumbs">
            <button
              v-for="(f, i) in fotos" :key="i" class="i3d-detail-thumb"
              :class="{ active: f === activeFoto }" @click="activeFoto = f"
            ><img :src="f" alt="" /></button>
          </div>
        </div>

        <div class="i3d-detail-info">
          <div class="i3d-prod-eyebrow" v-if="producto.categoria">{{ producto.categoria }}</div>
          <h1 class="i3d-detail-name">{{ producto.nombre }}</h1>
          <div class="i3d-detail-code mono">{{ producto.codigo }}</div>

          <span v-if="producto.disponibilidad" class="i3d-status i3d-detail-disp" :data-tone="dispTone(producto.disponibilidad)">
            {{ producto.disponibilidad }}
          </span>

          <p v-if="producto.descripcion" class="i3d-detail-desc">{{ producto.descripcion }}</p>

          <div class="i3d-block">
            <div v-if="producto.material" class="i3d-meta-line">
              <AppIcon name="layers" :size="16" :bordered="false" color="muted" />
              <span class="i3d-meta-text">Material: {{ producto.material }}</span>
            </div>
            <div v-if="producto.colores?.length" class="i3d-meta-line">
              <AppIcon name="palette" :size="16" :bordered="false" color="muted" />
              <span class="i3d-meta-text i3d-swatch-row">
                <span v-for="c in producto.colores" :key="c" class="i3d-swatch-chip">{{ c }}</span>
              </span>
            </div>
          </div>

          <div class="i3d-detail-price-row i3d-block">
            <div class="i3d-detail-price">{{ money(producto.precio) }}</div>
            <div class="i3d-detail-qty">
              <q-btn flat dense round size="sm" @click="qty = Math.max(1, qty - 1)"><AppIcon name="remove" :size="14" /></q-btn>
              <span class="mono">{{ qty }}</span>
              <q-btn flat dense round size="sm" @click="qty++"><AppIcon name="add" :size="14" /></q-btn>
            </div>
          </div>

          <q-btn color="primary" unelevated no-caps size="lg" class="full-width"
                 :disable="producto.disponibilidad === 'Sin stock'" @click="add">
            <AppIcon name="add_shopping_cart" :size="18" class="q-mr-xs" :bordered="false" />Agregar al carrito
          </q-btn>
        </div>
      </div>
    </LoadingState>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import LoadingState from '../../components/LoadingState.vue';
import AppIcon from '../../components/AppIcon.vue';
import { useCarritoStore } from '../../stores/carrito.js';
import { fetchProductoPublico } from '../../services/api.js';
import { formatMoney } from '../../utils/format.js';

const route = useRoute();
const $q = useQuasar();
const carrito = useCarritoStore();
const money = (n) => formatMoney(n);

const producto = ref(null);
const loading = ref(true);
const qty = ref(1);
const activeFoto = ref('');

const fotos = computed(() => {
  const p = producto.value;
  if (!p) return [];
  const list = [p.fotoPrincipal, ...(p.fotos || [])].filter(Boolean);
  return [...new Set(list)];
});

const dispTone = (d) => ({ 'Disponible': 'done', 'Pocas unidades': 'warning', 'Sin stock': 'failed', 'A pedido': 'active' }[d] || 'pending');

async function load(id) {
  loading.value = true;
  producto.value = null;
  try {
    producto.value = await fetchProductoPublico(id);
    activeFoto.value = fotos.value[0] || '';
  } catch {
    producto.value = null;
  } finally {
    loading.value = false;
  }
}

function add() {
  carrito.add(producto.value, qty.value);
  $q.notify({ type: 'positive', message: `${producto.value.nombre} agregado`, timeout: 1100, position: 'bottom-right' });
  carrito.openDrawer();
}

watch(() => route.params.id, (id) => { if (id) load(id); });
onMounted(() => load(route.params.id));
</script>

<style scoped>
.i3d-back { margin-bottom: var(--sp-4); color: var(--text-secondary); }

.i3d-detail { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-6); align-items: start; }
@media (max-width: 767px) { .i3d-detail { grid-template-columns: 1fr; } }

.i3d-detail-main-img {
  height: 360px; border-radius: var(--radius-md); background: var(--bg-sunken); border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.i3d-detail-main-img img { width: 100%; height: 100%; object-fit: cover; }
.i3d-detail-thumbs { display: flex; gap: var(--sp-2); margin-top: var(--sp-3); }
.i3d-detail-thumb {
  width: 56px; height: 56px; border-radius: var(--radius-sm); overflow: hidden; padding: 0;
  border: 2px solid var(--border); background: var(--bg-sunken); cursor: pointer;
}
.i3d-detail-thumb.active { border-color: var(--accent); }
.i3d-detail-thumb img { width: 100%; height: 100%; object-fit: cover; }

.i3d-detail-name { font-size: 28px; font-weight: 800; letter-spacing: -0.01em; color: var(--text-primary); margin: 2px 0 4px; }
.i3d-detail-code { font-size: 12px; color: var(--text-muted); margin-bottom: var(--sp-3); }
.i3d-detail-disp { margin-bottom: var(--sp-4); }
.i3d-detail-desc { color: var(--text-secondary); line-height: 1.6; margin: 0 0 var(--sp-4); }

.i3d-swatch-row { display: inline-flex; flex-wrap: wrap; gap: 4px; }
.i3d-swatch-chip { font-size: 11px; color: var(--text-secondary); border: 1px solid var(--border); border-radius: var(--radius-pill); padding: 1px 9px; }

.i3d-detail-price-row { display: flex; align-items: center; justify-content: space-between; }
.i3d-detail-price { font-size: 30px; font-weight: 800; color: var(--accent); letter-spacing: -0.01em; }
.i3d-detail-qty { display: flex; align-items: center; gap: var(--sp-2); border: 1px solid var(--border); border-radius: var(--radius-pill); padding: 2px 8px; }
.i3d-detail-qty span { min-width: 18px; text-align: center; }
</style>
