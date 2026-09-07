<template>
  <div class="i3d-items">
    <!-- Pantallas grandes: tabla real -->
    <q-markup-table v-if="isDesktop" flat bordered dense :class="tableClass">
      <thead>
        <tr>
          <th v-for="col in columns" :key="col.name" :class="col.align === 'right' ? 'text-right' : 'text-left'">{{ col.label }}</th>
          <th v-if="hasActions" style="width:40px"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in rows" :key="rowKey ? row[rowKey] : i">
          <td v-for="col in columns" :key="col.name" :class="[col.align === 'right' ? 'text-right' : '', col.mono ? 'mono' : '']">
            <slot :name="`cell-${col.name}`" :row="row" :index="i">{{ formatCell(col, row) }}</slot>
          </td>
          <td v-if="hasActions" class="text-center">
            <slot name="actions" :row="row" :index="i" />
          </td>
        </tr>
        <tr v-if="footLabel">
          <td class="text-weight-bold">{{ footLabel }}</td>
          <td v-for="n in columns.length - 2" :key="n"></td>
          <td class="text-right mono text-weight-bold">{{ footValue }}</td>
          <td v-if="hasActions"></td>
        </tr>
      </tbody>
    </q-markup-table>

    <!-- Pantallas chicas: tarjetas -->
    <div v-else class="i3d-items-cards">
      <div v-for="(row, i) in rows" :key="rowKey ? row[rowKey] : i" class="i3d-items-card">
        <div v-for="col in columns" :key="col.name" class="i3d-items-line">
          <span class="i3d-k">{{ col.label }}</span>
          <span class="i3d-items-v i3d-v" :class="col.mono ? 'mono' : ''">
            <slot :name="`cell-${col.name}`" :row="row" :index="i">{{ formatCell(col, row) }}</slot>
          </span>
        </div>
        <div v-if="hasActions" class="i3d-items-actions">
          <slot name="actions" :row="row" :index="i" />
        </div>
      </div>
      <div v-if="footLabel" class="i3d-items-foot">
        <span>{{ footLabel }}</span><b class="mono">{{ footValue }}</b>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useQuasar } from 'quasar';

const props = defineProps({
  // rows: array de objetos. columns: [{ name, label, field, align, mono, format(value,row) }]
  rows: { type: Array, default: () => [] },
  columns: { type: Array, required: true },
  hasActions: { type: Boolean, default: false },
  rowKey: { type: String, default: '' },
  footLabel: { type: String, default: '' },
  footValue: { type: String, default: '' },
  tableClass: { type: String, default: '' }
});

const $q = useQuasar();
// Debajo de 600px (dialogo a ancho completo en un celular) se apila como tarjetas.
const isDesktop = computed(() => $q.screen.gt.xs);

function formatCell(col, row) {
  const value = row[col.field || col.name];
  return col.format ? col.format(value, row) : (value ?? '');
}
</script>

<style scoped>
.i3d-items-cards { display: flex; flex-direction: column; gap: 10px; }
.i3d-items-card {
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  padding: var(--sp-3) var(--sp-4); background: var(--bg-sunken);
}
.i3d-items-line { display: flex; align-items: baseline; justify-content: space-between; gap: var(--sp-3); padding: 4px 0; }
.i3d-items-v { text-align: right; min-width: 0; }
.i3d-items-actions { display: flex; justify-content: flex-end; margin-top: 6px; padding-top: 6px; border-top: 1px dashed var(--border); }
.i3d-items-foot {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; font-weight: 600; color: var(--text-primary);
  background: var(--bg-elevated); border-radius: var(--radius-sm);
}
</style>
