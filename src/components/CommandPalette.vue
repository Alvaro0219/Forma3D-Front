<template>
  <q-dialog :model-value="modelValue" @update:model-value="close" position="top">
    <q-card class="i3d-palette">
      <div class="i3d-palette-input">
        <q-icon name="search" size="20px" color="grey" />
        <input
          ref="inputEl" v-model="q" type="text" placeholder="Buscar o ejecutar una acción…"
          @keydown.down.prevent="move(1)" @keydown.up.prevent="move(-1)"
          @keydown.enter.prevent="run(flat[cursor])" @keydown.esc="close(false)"
        />
        <kbd class="i3d-kbd">Esc</kbd>
      </div>

      <q-separator />

      <div class="i3d-palette-body">
        <div v-if="loading" class="i3d-palette-loading">
          <svg class="i3d-extrude-loader" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke-width="2.5" /></svg>
        </div>

        <template v-for="(group, gi) in groups" :key="group.title">
          <div v-if="group.items.length" class="i3d-palette-group">
            <div class="i3d-palette-group-title">{{ group.title }}</div>
            <button
              v-for="item in group.items" :key="item.key"
              class="i3d-palette-item" :class="{ active: flat[cursor] && flat[cursor].key === item.key }"
              @click="run(item)" @mousemove="setCursorTo(item)"
            >
              <q-icon :name="item.icon" size="18px" :style="{ color: item.color || 'var(--text-secondary)' }" />
              <span class="i3d-palette-label">{{ item.label }}</span>
              <span v-if="item.hint" class="i3d-palette-hint mono">{{ item.hint }}</span>
            </button>
          </div>
        </template>

        <div v-if="!loading && flat.length === 0" class="i3d-palette-empty">
          Sin resultados para “{{ q }}”.
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { fetchProductos, fetchClientes, fetchPedidos } from '../services/api.js';
import { formatMoney } from '../utils/format.js';

const props = defineProps({ modelValue: Boolean });
const emit = defineEmits(['update:modelValue']);
const router = useRouter();

const q = ref('');
const loading = ref(false);
const cursor = ref(0);
const inputEl = ref(null);
const results = ref({ productos: [], clientes: [], pedidos: [] });

const actions = [
  { key: 'a-venta', label: 'Nueva venta', icon: 'point_of_sale', path: '/admin/ventas', kw: 'venta vender' },
  { key: 'a-pedido', label: 'Nuevo pedido', icon: 'receipt_long', path: '/admin/pedidos', kw: 'pedido' },
  { key: 'a-producto', label: 'Nuevo producto', icon: 'category', path: '/admin/productos', kw: 'producto catalogo' },
  { key: 'a-bobina', label: 'Nueva bobina', icon: 'grain', path: '/admin/filamentos', kw: 'filamento bobina' },
  { key: 'a-calc', label: 'Calculadora de costos', icon: 'calculate', path: '/admin/calculadora', kw: 'costo calculadora presupuesto' },
  { key: 'a-config', label: 'Configuración', icon: 'settings', path: '/admin/configuracion', kw: 'config ajustes' }
];

let timer = null;
watch(q, () => {
  clearTimeout(timer);
  timer = setTimeout(search, 250);
});

async function search() {
  const term = q.value.trim();
  if (term.length < 2) { results.value = { productos: [], clientes: [], pedidos: [] }; cursor.value = 0; return; }
  loading.value = true;
  try {
    const [p, c, pe] = await Promise.all([
      fetchProductos({ q: term, limit: 5 }),
      fetchClientes({ q: term, limit: 5 }),
      fetchPedidos({ limit: 5 })
    ]);
    results.value = {
      productos: p.items || [],
      clientes: c.items || [],
      pedidos: (pe.items || []).filter((x) => String(x.numero).includes(term) || (x.clienteNombre || '').toLowerCase().includes(term.toLowerCase()))
    };
  } finally {
    loading.value = false;
    cursor.value = 0;
  }
}

const filteredActions = computed(() => {
  const term = q.value.trim().toLowerCase();
  if (!term) return actions;
  return actions.filter((a) => a.label.toLowerCase().includes(term) || a.kw.includes(term));
});

const groups = computed(() => [
  { title: 'Acciones', items: filteredActions.value.map((a) => ({ ...a, type: 'nav' })) },
  { title: 'Productos', items: results.value.productos.map((p) => ({
    key: 'p' + p._id, label: p.nombre, hint: p.sku, icon: 'category', color: 'var(--tech)', type: 'nav', path: '/admin/productos'
  })) },
  { title: 'Clientes', items: results.value.clientes.map((c) => ({
    key: 'c' + c._id, label: c.nombre, hint: c.telefono, icon: 'people', type: 'nav', path: '/admin/clientes'
  })) },
  { title: 'Pedidos', items: results.value.pedidos.map((pe) => ({
    key: 'pe' + pe._id, label: `Pedido #${pe.numero} — ${pe.clienteNombre || pe.cliente?.nombre || ''}`,
    hint: formatMoney(pe.total), icon: 'receipt_long', color: 'var(--accent)', type: 'nav', path: '/admin/pedidos'
  })) }
]);

const flat = computed(() => groups.value.flatMap((g) => g.items));

function move(delta) {
  const n = flat.value.length;
  if (!n) return;
  cursor.value = (cursor.value + delta + n) % n;
}
function setCursorTo(item) {
  const idx = flat.value.findIndex((i) => i.key === item.key);
  if (idx >= 0) cursor.value = idx;
}
function run(item) {
  if (!item) return;
  if (item.path) router.push(item.path);
  close(false);
}
function close(val) {
  emit('update:modelValue', val === true);
}

watch(() => props.modelValue, async (open) => {
  if (open) {
    q.value = '';
    results.value = { productos: [], clientes: [], pedidos: [] };
    cursor.value = 0;
    await nextTick();
    inputEl.value?.focus();
  }
});
</script>

<style scoped>
.i3d-palette {
  width: 620px; max-width: 94vw; margin-top: 8vh;
  background: var(--bg-elevated); border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg); box-shadow: var(--shadow-2); overflow: hidden;
}
.i3d-palette-input { display: flex; align-items: center; gap: 10px; padding: 14px 16px; }
.i3d-palette-input input {
  flex: 1; border: none; outline: none; background: transparent;
  color: var(--text-primary); font-size: 16px; font-family: var(--font-ui);
}
.i3d-palette-body { max-height: 56vh; overflow-y: auto; padding: 8px; }
.i3d-palette-loading { display: flex; justify-content: center; padding: 24px; }
.i3d-palette-group { margin-bottom: 8px; }
.i3d-palette-group-title {
  font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  color: var(--text-muted); padding: 6px 10px 2px;
}
.i3d-palette-item {
  display: flex; align-items: center; gap: 12px; width: 100%;
  padding: 9px 12px; border: none; background: transparent; cursor: pointer;
  border-radius: var(--radius-sm); color: var(--text-primary);
  font-size: 14px; text-align: left; font-family: var(--font-ui);
}
.i3d-palette-item.active { background: var(--accent-soft); }
.i3d-palette-item.active .i3d-palette-label { color: var(--accent); }
.i3d-palette-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.i3d-palette-hint { font-size: 12px; color: var(--text-muted); }
.i3d-palette-empty { padding: 24px; text-align: center; color: var(--text-muted); font-size: 14px; }
.i3d-kbd {
  font-family: var(--font-mono); font-size: 11px; color: var(--text-secondary);
  background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; padding: 1px 6px;
}
</style>
