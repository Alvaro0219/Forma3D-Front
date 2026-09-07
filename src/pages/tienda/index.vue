<template>
  <div>
    <!-- Héroe: identidad + firma visual (el macetero se imprime solo) + búsqueda -->
    <section class="i3d-hero i3d-printbed">
      <div class="i3d-hero-copy">
        <span class="i3d-hero-eyebrow">Catálogo · {{ info.nombreNegocio || 'Impresión 3D' }}</span>
        <h1 class="i3d-hero-title">Tu idea, impresa<br />capa a capa.</h1>
        <p class="i3d-hero-sub">Piezas listas para llevar o a pedido. Elegís, confirmás por WhatsApp y coordinamos el envío.</p>

        <div class="i3d-hero-search">
          <q-input v-model="search" outlined dense debounce="350" placeholder="Buscar producto"
                   @update:model-value="onFilter" clearable class="i3d-search-input">
            <template #prepend><AppIcon name="search" :size="18" :bordered="false" /></template>
          </q-input>
        </div>
      </div>

      <!-- Firma: la F de la marca, despidiendo filamento por la boquilla -->
      <div class="i3d-hero-art" aria-hidden="true">
        <svg viewBox="0 0 145 220" class="i3d-print-svg">
          <path class="i3d-print-outline"
                d="M20,15 L100,15 L100,37 L42,37 L42,68 L80,68 L80,88 L42,88 L42,155 L42,162 L31,178 L20,162 L20,155 Z" />
          <path class="i3d-print-thread" d="M31,178 C20,186 8,186 8,198 C8,210 24,213 36,204 L132,204" />
          <path class="i3d-print-thread-flow" d="M31,178 C20,186 8,186 8,198 C8,210 24,213 36,204 L132,204" />
          <circle class="i3d-print-drip" cx="31" cy="178" r="4" />
        </svg>
      </div>
    </section>

    <!-- Filtros: categorías como chips + material -->
    <div class="i3d-filters">
      <div class="i3d-chip-row">
        <button
          class="i3d-chip" :class="{ active: !categoria }"
          @click="setCategoria(null)"
        >Todas</button>
        <button
          v-for="c in info.categorias || []" :key="c"
          class="i3d-chip" :class="{ active: categoria === c }"
          @click="setCategoria(c)"
        >{{ c }}</button>
      </div>
      <q-select
        v-model="material" :options="info.materiales || []" outlined dense clearable
        label="Material" @update:model-value="onFilter" class="i3d-material-select"
      />
    </div>

    <LoadingState :loading="loading" :empty="!loading && productos.length === 0" empty-label="No hay productos disponibles.">
      <div class="i3d-grid i3d-build-stagger">
        <q-card v-for="p in productos" :key="p.id" class="i3d-prod-card" @click="goDetail(p)">
          <div class="i3d-prod-img" :class="{ 'i3d-printbed': !p.fotoPrincipal }">
            <img v-if="p.fotoPrincipal" :src="p.fotoPrincipal" :alt="p.nombre" />
            <AppIcon v-else name="view_in_ar" :size="36" color="muted" />
            <span v-if="p.disponibilidad" class="i3d-status i3d-disp" :data-tone="dispTone(p.disponibilidad)">{{ p.disponibilidad }}</span>
          </div>
          <q-card-section class="i3d-prod-body">
            <div class="i3d-prod-eyebrow" v-if="p.categoria">{{ p.categoria }}</div>
            <div class="i3d-prod-name">{{ p.nombre }}</div>
            <div v-if="p.descripcion" class="i3d-prod-desc">{{ p.descripcion }}</div>
            <div v-if="p.colores?.length" class="i3d-swatch-row">
              <span v-for="c in p.colores" :key="c" class="i3d-swatch-chip">{{ c }}</span>
            </div>
            <div class="i3d-prod-code mono">{{ p.codigo }}</div>
          </q-card-section>
          <q-card-actions class="i3d-prod-actions">
            <div class="i3d-prod-price">{{ money(p.precio) }}</div>
            <q-btn round unelevated color="primary" size="md"
                   :disable="p.disponibilidad === 'Sin stock'" @click.stop="add(p, $event)">
              <AppIcon name="add_shopping_cart" :size="18" :bordered="false" />
              <q-tooltip>Agregar</q-tooltip>
            </q-btn>
          </q-card-actions>
        </q-card>
      </div>
    </LoadingState>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import LoadingState from '../../components/LoadingState.vue';
import AppIcon from '../../components/AppIcon.vue';
import { useCarritoStore } from '../../stores/carrito.js';
import { fetchCatalogo, fetchTiendaInfo } from '../../services/api.js';
import { formatMoney } from '../../utils/format.js';

const $q = useQuasar();
const router = useRouter();
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
function setCategoria(c) { categoria.value = c; onFilter(); }
function goDetail(p) { router.push(`/tienda/producto/${p.id}`); }

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
/* ---------- Héroe ---------- */
.i3d-hero {
  display: flex; align-items: center; justify-content: space-between; gap: var(--sp-6);
  margin: -28px -18px var(--sp-6);
  padding: var(--sp-7) var(--sp-5) var(--sp-6);
  border-bottom: 1px solid var(--border);
}
.i3d-hero-copy { max-width: 520px; }
.i3d-hero-eyebrow {
  display: inline-block; font-size: var(--fs-label); font-weight: var(--fw-label);
  text-transform: uppercase; letter-spacing: .08em; color: var(--tech); margin-bottom: var(--sp-3);
}
.i3d-hero-title {
  font-size: 44px; line-height: 1.08; letter-spacing: -0.02em; font-weight: 800;
  color: var(--text-primary); margin: 0 0 var(--sp-3);
}
.i3d-hero-sub { color: var(--text-secondary); font-size: var(--fs-body); margin: 0 0 var(--sp-5); max-width: 42ch; }
.i3d-hero-search { max-width: 380px; }
.i3d-search-input :deep(.q-field__control) { background: var(--bg-surface); }

.i3d-hero-art { flex-shrink: 0; width: 145px; height: 210px; display: none; }
.i3d-print-svg { width: 100%; height: 100%; overflow: visible; }

/* La F se dibuja sola, como si la estuviera imprimiendo la propia boquilla */
.i3d-print-outline {
  fill: none; stroke: var(--tech); stroke-width: 6; stroke-linejoin: round; stroke-linecap: round;
  stroke-dasharray: 620; stroke-dashoffset: 620;
  animation: i3d-print-draw 1.1s var(--ease-standard) forwards;
}
/* El filamento sale de la punta de la F y queda tendido */
.i3d-print-thread {
  fill: none; stroke: var(--accent); stroke-width: 5; stroke-linecap: round;
  stroke-dasharray: 220; stroke-dashoffset: 220;
  animation: i3d-print-draw .9s var(--ease-standard) 1s forwards;
}
/* Encima, un patrón de guiones que "fluye" sin parar: sensación de extrusión activa */
.i3d-print-thread-flow {
  fill: none; stroke: color-mix(in srgb, var(--accent) 55%, white); stroke-width: 5; stroke-linecap: round;
  stroke-dasharray: 4 14; opacity: 0;
  animation: i3d-print-flow 1s linear 1.9s infinite;
}
.i3d-print-drip {
  fill: var(--accent); opacity: 0; transform-box: fill-box; transform-origin: center;
  animation: i3d-print-drip-in .25s var(--ease-standard) .9s forwards, i3d-print-drip-pulse 1.5s var(--ease-standard) 1.9s infinite;
}
@keyframes i3d-print-draw { to { stroke-dashoffset: 0; } }
@keyframes i3d-print-flow { 0% { opacity: .85; stroke-dashoffset: 36; } 100% { opacity: .85; stroke-dashoffset: 0; } }
@keyframes i3d-print-drip-in { to { opacity: 1; } }
@keyframes i3d-print-drip-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.3); } }

@media (min-width: 900px) { .i3d-hero-art { display: block; } }
@media (prefers-reduced-motion: reduce) {
  .i3d-print-outline, .i3d-print-thread { stroke-dashoffset: 0; animation: none; }
  .i3d-print-thread-flow, .i3d-print-drip { animation: none; opacity: 0; }
}

/* ---------- Filtros ---------- */
.i3d-filters { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-4); flex-wrap: wrap; margin-bottom: var(--sp-5); }
.i3d-chip-row { display: flex; gap: var(--sp-2); flex-wrap: wrap; }
.i3d-chip {
  font-family: var(--font-sans); font-size: var(--fs-meta); font-weight: 600;
  padding: 7px 16px; border-radius: var(--radius-pill);
  border: 1px solid var(--border); background: var(--bg-surface); color: var(--text-secondary);
  cursor: pointer; transition: border-color var(--dur-micro) var(--ease-standard), color var(--dur-micro) var(--ease-standard), background var(--dur-micro) var(--ease-standard);
}
.i3d-chip:hover { border-color: var(--border-strong); color: var(--text-primary); }
.i3d-chip.active { background: var(--accent-soft); border-color: var(--accent); color: var(--accent); }
.i3d-material-select { min-width: 160px; }

/* ---------- Grilla de productos ---------- */
.i3d-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 18px; }
.i3d-prod-card {
  border-radius: var(--radius-md); overflow: hidden; display: flex; flex-direction: column;
  border: 1px solid var(--border); background: var(--bg-surface); cursor: pointer;
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

.i3d-prod-body { padding-bottom: 0; }
.i3d-prod-eyebrow { font-size: var(--fs-label); font-weight: var(--fw-label); text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); margin-bottom: 4px; }
.i3d-prod-name { font-size: var(--fs-title); font-weight: var(--fw-title); color: var(--text-primary); line-height: 1.3; }
.i3d-prod-desc { font-size: var(--fs-meta); color: var(--text-secondary); margin-top: 3px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.i3d-swatch-row { display: flex; flex-wrap: wrap; gap: 4px; margin-top: var(--sp-2); }
.i3d-swatch-chip {
  font-size: 11px; color: var(--text-secondary); border: 1px solid var(--border); border-radius: var(--radius-pill);
  padding: 1px 9px;
}
.i3d-prod-code { font-size: 11px; color: var(--text-muted); margin-top: var(--sp-2); }

.i3d-prod-actions { display: flex; align-items: center; justify-content: space-between; padding: var(--sp-3) var(--sp-4) var(--sp-4); }
.i3d-prod-price { font-size: 21px; font-weight: 800; color: var(--accent); letter-spacing: -0.01em; }

@media (max-width: 599px) {
  .i3d-hero { margin: -28px -18px var(--sp-5); padding: var(--sp-6) var(--sp-4) var(--sp-5); }
  .i3d-hero-title { font-size: 32px; }
}
</style>
