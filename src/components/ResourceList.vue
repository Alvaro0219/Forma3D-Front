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
            <q-td :props="props" class="text-right">
              <div class="i3d-reslist-actions">
                <q-btn flat dense round size="sm" @click="$emit('view', props.row)">
                  <AppIcon name="visibility" :size="16" color="accent" />
                  <q-tooltip>Ver</q-tooltip>
                </q-btn>
                <slot name="actions" :row="props.row" />
              </div>
            </q-td>
          </template>
        </q-table>
      </div>

      <!-- Pantallas chicas: tarjetas -->
      <div v-else class="i3d-card-list">
        <div v-for="row in rows" :key="row[rowKey]" class="i3d-list-card" @click="$emit('view', row)">
          <slot name="card" :row="row">
            <div class="i3d-card-title-row">
              <div class="i3d-card-title">
                <template v-if="cardTitle">{{ cardTitle(row) }}</template>
                <slot v-else :name="`cell-${columns[0]?.name}`" :row="row" :value="row[columns[0]?.field]">
                  {{ formatCell(columns[0], row) }}
                </slot>
              </div>
              <div v-if="titleSideColumns.length" class="i3d-card-title-side">
                <template v-for="col in titleSideColumns" :key="col.name">
                  <slot :name="`cell-${col.name}`" :row="row" :value="row[col.field]">
                    {{ formatCell(col, row) }}
                  </slot>
                </template>
              </div>
            </div>
            <div class="i3d-meta">
              <div v-for="col in bodyColumns" :key="col.name" class="i3d-meta-line">
                <AppIcon v-if="col.icon" :name="col.icon" :size="15" :bordered="false" color="muted" />
                <span v-else-if="!col.hideLabelOnCard" class="i3d-k i3d-lc-key">{{ col.label }}</span>
                <span class="i3d-meta-text i3d-v" :class="col.mono ? 'mono' : ''">
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
// Las columnas con titleSide (ej. estado) se muestran al lado del titulo, tampoco van en el cuerpo.
const bodyColumns = computed(() => props.columns.filter((c) => c.name !== '__actions' && c.name !== props.columns[0]?.name && !c.titleSide));
const titleSideColumns = computed(() => props.columns.filter((c) => c.titleSide));

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

.i3d-card-list { display: flex; flex-direction: column; gap: var(--sp-3); }
.i3d-list-card {
  background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-md);
  padding: var(--sp-4); cursor: pointer;
  transition: border-color var(--dur-micro) var(--ease-standard);
}
.i3d-list-card:active { border-color: var(--accent); }
/* Titulo + columna titleSide (ej. estado) en la misma fila, arriba a la derecha */
.i3d-card-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--sp-3); margin-bottom: var(--sp-3); }
.i3d-card-title-side { display: flex; align-items: center; gap: var(--sp-2); flex-shrink: 0; }
/* Ancho fijo para las etiquetas sin icono: los valores quedan alineados entre si */
.i3d-lc-key { flex-shrink: 0; min-width: 78px; }
.i3d-list-card-actions {
  display: flex; align-items: center; justify-content: flex-end; gap: var(--sp-2);
  margin-top: var(--sp-3); padding-top: var(--sp-3); border-top: 1px solid var(--border);
}

.i3d-reslist-footer { display: flex; align-items: center; margin-top: 16px; gap: 12px; }
.i3d-reslist-count { color: var(--text-muted); font-size: 12px; }
/* display:flex ignora los espacios en blanco del template: separacion pareja
   entre el "ver" automatico y los botones que agrega cada pagina via #actions,
   sin importar como esten formateadas esas lineas. */
.i3d-reslist-actions { display: flex; align-items: center; justify-content: flex-end; gap: var(--sp-2); }
</style>
