<template>
  <div class="i3d-reslist">
    <LoadingState :loading="loading" :empty="!loading && rows.length === 0" :empty-label="emptyLabel">
      <!-- Pantallas grandes: tabla -->
      <div v-if="isDesktop" class="i3d-section-card i3d-reslist-table">
        <q-table
          :rows="rows" :columns="tableColumns" :row-key="rowKey" flat
          :pagination="{ rowsPerPage: 0 }" hide-pagination
        >
          <template v-for="col in columns" #[`body-cell-${col.name}`]="props" :key="col.name">
            <q-td :props="props" :class="col.mono ? 'mono' : ''">
              <slot :name="`cell-${col.name}`" :row="props.row" :value="props.row[col.field]">
                {{ formatCell(col, props.row) }}
              </slot>
            </q-td>
          </template>
          <template #body-cell-__actions="props">
            <q-td :props="props" class="text-right i3d-reslist-actions">
              <q-btn flat dense round size="sm" @click="$emit('view', props.row)">
                <AppIcon name="visibility" :size="16" />
                <q-tooltip>Ver</q-tooltip>
              </q-btn>
              <slot name="actions" :row="props.row" />
            </q-td>
          </template>
        </q-table>
      </div>

      <!-- Pantallas chicas: tarjetas -->
      <div v-else class="i3d-card-list">
        <div v-for="row in rows" :key="row[rowKey]" class="i3d-list-card" @click="$emit('view', row)">
          <slot name="card" :row="row">
            <div class="i3d-list-card-title">{{ cardTitle ? cardTitle(row) : formatCell(columns[0], row) }}</div>
            <div class="i3d-list-card-rows">
              <div v-for="col in bodyColumns" :key="col.name" class="i3d-list-card-row">
                <span v-if="!col.hideLabelOnCard" class="i3d-lc-k">{{ col.label }}</span>
                <span class="i3d-lc-v" :class="col.mono ? 'mono' : ''">
                  <slot :name="`cell-${col.name}`" :row="row" :value="row[col.field]">
                    {{ formatCell(col, row) }}
                  </slot>
                </span>
              </div>
            </div>
          </slot>
          <div class="i3d-list-card-actions" @click.stop>
            <q-btn flat dense round size="sm" color="primary" @click="$emit('view', row)">
              <AppIcon name="visibility" :size="16" color="accent" />
              <q-tooltip>Ver</q-tooltip>
            </q-btn>
            <slot name="actions" :row="row" />
          </div>
        </div>
      </div>

      <!-- Paginador (comun a tabla y tarjetas) -->
      <div class="i3d-reslist-footer" v-if="pagination && pagination.total > 0">
        <span class="i3d-reslist-count mono">{{ pagination.total }} registro(s)</span>
        <q-space />
        <q-pagination
          v-if="pagination.totalPages > 1"
          :model-value="pagination.page" :max="pagination.totalPages" :max-pages="6"
          direction-links boundary-numbers
          @update:model-value="(p) => $emit('update:page', p)"
        />
      </div>
    </LoadingState>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useQuasar } from 'quasar';
import LoadingState from './LoadingState.vue';
import AppIcon from './AppIcon.vue';

const props = defineProps({
  rows: { type: Array, default: () => [] },
  // columns: [{ name, label, field, align, mono, format(value,row) }]
  columns: { type: Array, required: true },
  loading: Boolean,
  rowKey: { type: String, default: '_id' },
  emptyLabel: { type: String, default: 'Todavía no hay nada para imprimir aquí.' },
  pagination: { type: Object, default: null },
  cardTitle: { type: Function, default: null },
  // fuerza tarjetas en cualquier tamaño (ej. galerias); por defecto responsivo
  alwaysCards: Boolean
});
defineEmits(['view', 'update:page']);

const $q = useQuasar();
// Pantallas grandes (>= 1024): tabla. Chicas: tarjetas.
const isDesktop = computed(() => !props.alwaysCards && $q.screen.gt.sm);

// La primera columna ya se muestra como titulo de la tarjeta: no repetirla como fila con leyenda.
const bodyColumns = computed(() => props.columns.filter((c) => c.name !== '__actions' && c.name !== props.columns[0]?.name));

const tableColumns = computed(() => [
  ...props.columns.map((c) => ({
    name: c.name, label: c.label, field: c.field || c.name,
    align: c.align || 'left', sortable: c.sortable || false
  })),
  { name: '__actions', label: '', field: '__actions', align: 'right' }
]);

function formatCell(col, row) {
  if (!col) return '';
  const value = row[col.field || col.name];
  return col.format ? col.format(value, row) : (value ?? '');
}
</script>

<style scoped>
.i3d-reslist-table :deep(.q-table) { background: transparent; }

.i3d-card-list { display: flex; flex-direction: column; gap: 12px; }
.i3d-list-card {
  background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-md);
  padding: 14px; cursor: pointer;
  transition: border-color var(--dur-micro) var(--ease-standard);
}
.i3d-list-card:active { border-color: var(--accent); }
.i3d-list-card-title { font-weight: 600; font-size: 16px; color: var(--text-primary); margin-bottom: 10px; }
.i3d-list-card-rows { display: flex; flex-direction: column; gap: 6px; }
.i3d-list-card-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 13px; }
.i3d-lc-k { color: var(--text-muted); text-transform: uppercase; font-size: 10px; letter-spacing: .04em; flex-shrink: 0; }
.i3d-lc-v { color: var(--text-primary); text-align: right; flex: 1; }
.i3d-list-card-actions { display: flex; align-items: center; justify-content: flex-end; gap: 2px; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border); }

.i3d-reslist-footer { display: flex; align-items: center; margin-top: 16px; gap: 12px; }
.i3d-reslist-count { color: var(--text-muted); font-size: 12px; }
.i3d-reslist-actions .q-btn { margin-left: 2px; }
</style>
