<template>
  <div class="i3d-items">
    <div class="text-subtitle2 q-mb-sm">Ítems</div>

    <div class="i3d-item-add row q-col-gutter-sm q-mb-sm items-end">
      <div class="col-12 col-md-5">
        <q-select
          v-model="picked" :options="prodOptions" outlined dense clearable use-input
          label="Agregar producto" emit-value map-options @filter="filterProds"
        />
      </div>
      <div class="col-6 col-md-2">
        <q-input v-model.number="pickQty" type="number" outlined dense label="Cant." min="1" />
      </div>
      <div class="col-6 col-md-3">
        <q-btn color="primary" outline icon="add" label="Agregar" class="full-width" @click="addPicked" />
      </div>
      <div class="col-12 col-md-2">
        <q-btn flat dense color="grey-7" icon="edit_note" label="Manual" class="full-width" @click="addManual" />
      </div>
    </div>

    <q-markup-table flat bordered dense v-if="modelValue.length">
      <thead>
        <tr>
          <th class="text-left">Producto</th>
          <th class="text-right" style="width:90px">Cant.</th>
          <th class="text-right" style="width:130px">Precio</th>
          <th class="text-right" style="width:120px">Subtotal</th>
          <th style="width:40px"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(it, idx) in modelValue" :key="idx">
          <td>
            <q-input v-if="!it.producto" v-model="it.nombre" dense borderless placeholder="Descripción" />
            <span v-else>{{ it.nombre }}</span>
          </td>
          <td class="text-right"><q-input v-model.number="it.cantidad" type="number" dense borderless input-class="text-right" min="1" /></td>
          <td class="text-right"><q-input v-model.number="it.precioUnitario" type="number" dense borderless input-class="text-right" /></td>
          <td class="text-right">{{ money(it.cantidad * it.precioUnitario) }}</td>
          <td class="text-center"><q-btn flat dense round icon="close" size="sm" color="negative" @click="removeItem(idx)" /></td>
        </tr>
      </tbody>
    </q-markup-table>
    <div v-else class="text-grey q-pa-sm">Sin ítems. Agregá productos arriba.</div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { formatMoney } from '../utils/format.js';

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  productos: { type: Array, default: () => [] }
});
const emit = defineEmits(['update:modelValue']);

const money = (n) => formatMoney(n);
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
  emit('update:modelValue', [...props.modelValue, { producto: null, nombre: '', cantidad: 1, precioUnitario: 0 }]);
}

function removeItem(idx) {
  const list = [...props.modelValue];
  list.splice(idx, 1);
  emit('update:modelValue', list);
}
</script>

<style scoped>
.i3d-items { border-top: 1px solid #e2e8f0; padding-top: 12px; }
</style>
