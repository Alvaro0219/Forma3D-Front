<template>
  <div>
    <div class="i3d-catalog-head i3d-build">
      <h1>Catálogo</h1>
      <p>Elegí tus productos y finalizá el pedido por WhatsApp.</p>
    </div>

    <div class="i3d-catalog-filters">
      <q-input v-model="search" outlined dense debounce="350" placeholder="Buscar producto"
               @update:model-value="onFilter" clearable class="col-grow">
        <template #prepend><q-icon name="search" /></template>
      </q-input>
      <q-select v-model="categoria" :options="info.categorias || []" outlined dense clearable
                placeholder="Categoría" @update:model-value="onFilter" style="min-width:160px" />
      <q-select v-model="material" :options="info.materiales || []" outlined dense clearable
                placeholder="Material" @update:model-value="onFilter" style="min-width:160px" />
    </div>

    <LoadingState :loading="loading" :empty="!loading && productos.length === 0" empty-label="No hay productos disponibles.">
      <div class="i3d-grid i3d-build-stagger">
        <q-card v-for="p in productos" :key="p.id" class="i3d-prod-card">
          <div class="i3d-prod-img">
            <img v-if="p.fotoPrincipal" :src="p.fotoPrincipal" :alt="p.nombre" />
            <q-icon v-else name="view_in_ar" size="48px" color="grey-6" />
            <span v-if="p.disponibilidad" class="i3d-status i3d-disp" :data-tone="dispTone(p.disponibilidad)">{{ p.disponibilidad }}</span>
          </div>
          <q-card-section class="i3d-prod-body">
            <div class="i3d-prod-name">{{ p.nombre }}</div>
            <div class="i3d-prod-meta mono">{{ p.material }}<span v-if="p.colores?.length"> · {{ p.colores.join(', ') }}</span></div>
            <div class="i3d-prod-price mono">{{ money(p.precio) }}</div>
          </q-card-section>
          <q-card-actions class="q-pt-none">
            <q-btn color="primary" class="full-width" icon="add_shopping_cart" label="Agregar" unelevated no-caps
                   :disable="p.disponibilidad === 'Sin stock'" @click="add(p, $event)" />
          </q-card-actions>
        </q-card>
      </div>
    </LoadingState>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import LoadingState from '../../components/LoadingState.vue';
import { useCarritoStore } from '../../stores/carrito.js';
import { fetchCatalogo, fetchTiendaInfo } from '../../services/api.js';
import { formatMoney } from '../../utils/format.js';

const $q = useQuasar();
const carrito = useCarritoStore();
const money = (n) => formatMoney(n);

const productos = ref([]);
const info = ref({});
const loading = ref(true);
const search = ref('');
const categoria = ref(null);
const material = ref(null);

const dispTone = (d) => ({ 'Disponible': 'done', 'Pocas unidades': 'warning', 'Sin stock': 'failed', 'A pedido': 'active' }[d] || 'pending');

async function load() {
  loading.value = true;
  try {
    const res = await fetchCatalogo({
      q: search.value || undefined,
      categoria: categoria.value || undefined,
      material: material.value || undefined,
      limit: 60
    });
    productos.value = res.items || [];
  } finally {
    loading.value = false;
  }
}
function onFilter() { load(); }

/* Animación firma: hilo de filamento que vuela del botón al carrito. */
function flyToCart(fromEl) {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cartBtn = document.getElementById('i3d-cart-btn');
  if (reduce || !fromEl || !cartBtn) { bumpCart(cartBtn); return; }

  const a = fromEl.getBoundingClientRect();
  const b = cartBtn.getBoundingClientRect();
  const dot = document.createElement('div');
  dot.className = 'i3d-fly';
  dot.style.left = `${a.left + a.width / 2}px`;
  dot.style.top = `${a.top + a.height / 2}px`;
  dot.style.setProperty('--dx', `${b.left + b.width / 2 - (a.left + a.width / 2)}px`);
  dot.style.setProperty('--dy', `${b.top + b.height / 2 - (a.top + a.height / 2)}px`);
  document.body.appendChild(dot);
  setTimeout(() => { dot.remove(); bumpCart(cartBtn); }, 600);
}
function bumpCart(cartBtn) {
  if (!cartBtn) return;
  cartBtn.classList.add('i3d-cart-bump');
  setTimeout(() => cartBtn.classList.remove('i3d-cart-bump'), 340);
}

function add(p, ev) {
  carrito.add(p, 1);
  flyToCart(ev?.currentTarget);
  $q.notify({ type: 'positive', message: `${p.nombre} agregado`, timeout: 1100, position: 'bottom-right' });
}

onMounted(async () => {
  try { info.value = await fetchTiendaInfo(); } catch { /* noop */ }
  await load();
});
</script>

<style scoped>
.i3d-catalog-head h1 { font-family: var(--font-display); font-size: 30px; margin: 0 0 4px; color: var(--text-primary); letter-spacing: -0.02em; }
.i3d-catalog-head p { color: var(--text-secondary); margin: 0 0 22px; }
.i3d-catalog-filters { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 22px; }
.i3d-catalog-filters .col-grow { flex: 1 1 240px; }

.i3d-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 18px; }
.i3d-prod-card {
  border-radius: var(--radius-md); overflow: hidden; display: flex; flex-direction: column;
  border: 1px solid var(--border); background: var(--bg-surface);
  transition: transform var(--dur-base) var(--ease-standard), box-shadow var(--dur-base) var(--ease-standard), border-color var(--dur-base) var(--ease-standard);
}
.i3d-prod-card:hover { transform: translateY(-4px); border-color: var(--border-strong); box-shadow: var(--shadow-2); }
.i3d-prod-img {
  position: relative; height: 175px; background: var(--bg-sunken);
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.i3d-prod-img img { width: 100%; height: 100%; object-fit: cover; transition: transform var(--dur-slow) var(--ease-standard); }
.i3d-prod-card:hover .i3d-prod-img img { transform: scale(1.05); }
.i3d-disp { position: absolute; top: 10px; right: 10px; font-size: 11px; }
.i3d-prod-body { padding-bottom: 6px; }
.i3d-prod-name { font-weight: 600; color: var(--text-primary); margin-bottom: 3px; }
.i3d-prod-meta { font-size: 12px; color: var(--text-secondary); margin-bottom: 10px; min-height: 16px; }
.i3d-prod-price { font-size: 20px; font-weight: 700; color: var(--accent); }
</style>
