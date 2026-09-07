<template>
  <div class="i3d-items">
    <div class="text-subtitle2 q-mb-sm">Ítems</div>

    <div class="i3d-item-add row q-col-gutter-sm q-mb-sm items-end">
      <div class="col-12 col-md-6">
        <q-select
          v-model="picked" :options="prodOptions" outlined dense clearable use-input
          label="Agregar producto" emit-value map-options @filter="filterProds"
        />
      </div>
      <div class="col-6 col-md-2">
        <q-input v-model.number="pickQty" type="number" outlined dense label="Cant." min="1" />
      </div>
      <div class="col-3 col-md-1">
        <q-btn color="primary" outline dense class="i3d-add-btn i3d-add-btn-icon" @click="addPicked">
          <AppIcon name="add" :size="16" /><q-tooltip>Agregar</q-tooltip>
        </q-btn>
      </div>
      <div class="col-9 col-md-3">
        <q-btn flat dense color="grey-7" class="full-width i3d-add-btn" @click="addManual"><AppIcon name="edit_note" :size="16" class="q-mr-xs" />Manual</q-btn>
      </div>
    </div>

    <ItemsTable v-if="modelValue.length" :rows="modelValue" :columns="columns" has-actions>
      <template #cell-nombre="{ row }">
        <q-input v-if="!row.producto" v-model="row.nombre" dense borderless placeholder="Descripción" />
        <span v-else>{{ row.nombre }}</span>
      </template>
      <template #cell-cantidad="{ row }">
        <q-input v-model.number="row.cantidad" type="number" dense borderless input-class="text-right" min="1" />
      </template>
      <template #cell-precioUnitario="{ row }">
        <q-input v-model.number="row.precioUnitario" type="number" dense borderless input-class="text-right" />
      </template>
      <template v-if="showCosto" #cell-costoUnitario="{ row }">
        <q-input
          v-if="!row.producto" v-model.number="row.costoUnitario" type="number" dense borderless
          input-class="text-right" placeholder="0" hint="Costo real (manual)"
        />
        <span v-else class="text-grey">automático</span>
      </template>
      <template #cell-subtotal="{ row }">{{ money(row.cantidad * row.precioUnitario) }}</template>
      <template #actions="{ index }">
        <q-btn flat dense round size="sm" color="negative" @click="removeItem(index)"><AppIcon name="close" :size="14" /></q-btn>
      </template>
    </ItemsTable>
    <div v-else class="text-grey q-pa-sm">Sin ítems. Agregá productos arriba.</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import AppIcon from './AppIcon.vue';
import ItemsTable from './ItemsTable.vue';
import { formatMoney } from '../utils/format.js';

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  productos: { type: Array, default: () => [] },
  // Muestra la columna de costo real para items manuales (sin producto asociado),
  // asi la ganancia calculada en el servidor no los asume gratis.
  showCosto: { type: Boolean, default: false }
});
const emit = defineEmits(['update:modelValue']);

const money = (n) => formatMoney(n);

const columns = computed(() => [
  { name: 'nombre', label: 'Producto' },
  { name: 'cantidad', label: 'Cant.', align: 'right' },
  { name: 'precioUnitario', label: 'Precio', align: 'right' },
  ...(props.showCosto ? [{ name: 'costoUnitario', label: 'Costo', align: 'right' }] : []),
  { name: 'subtotal', label: 'Subtotal', align: 'right', mono: true }
]);

const picked = ref(null);
const pickQty = ref(1);
const prodOptions = ref([]);

function syncOptions() {
  prodOptions.value = props.productos.map((p) => ({ label: `${p.nombre} (${p.sku})`, value: p._id }));
}
syncOptions();

function filterProds(val, update) {
  update(() => {
    const needle = (val || '').toLowerCase();
    prodOptions.value = props.productos
      .filter((p) => p.nombre.toLowerCase().includes(needle) || (p.sku || '').toLowerCase().includes(needle))
      .map((p) => ({ label: `${p.nombre} (${p.sku})`, value: p._id }));
  });
}

function addPicked() {
  if (!picked.value) return;
  const prod = props.productos.find((p) => p._id === picked.value);
  if (!prod) return;
  const list = [...props.modelValue];
  const existing = list.find((i) => i.producto === prod._id);
  if (existing) {
    existing.cantidad += Math.max(1, pickQty.value || 1);
  } else {
    list.push({ producto: prod._id, nombre: prod.nombre, cantidad: Math.max(1, pickQty.value || 1), precioUnitario: prod.precioVenta });
  }
  emit('update:modelValue', list);
  picked.value = null; pickQty.value = 1;
}

function addManual() {
  emit('update:modelValue', [...props.modelValue, { producto: null, nombre: '', cantidad: 1, precioUnitario: 0, costoUnitario: 0 }]);
}

function removeItem(idx) {
  const list = [...props.modelValue];
  list.splice(idx, 1);
  emit('update:modelValue', list);
}
</script>

<style scoped>
.i3d-items { border-top: 1px solid var(--border); padding-top: 12px; }
</style>
