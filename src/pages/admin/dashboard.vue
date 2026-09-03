<template>
  <div class="i3d-page-shell">
    <div class="i3d-page-header">
      <div>
        <h1 class="i3d-page-title">Dashboard</h1>
        <p class="i3d-page-subtitle">Resumen operativo y financiero</p>
      </div>
      <div class="i3d-quick">
        <q-btn color="primary" unelevated to="/admin/ventas" no-caps><AppIcon name="point_of_sale" :size="16" class="q-mr-xs" />Venta</q-btn>
        <q-btn outline color="secondary" to="/admin/pedidos" no-caps><AppIcon name="receipt_long" :size="16" class="q-mr-xs" />Pedido</q-btn>
        <q-btn outline color="secondary" to="/admin/compras" no-caps v-if="auth.isAdmin"><AppIcon name="shopping_cart" :size="16" class="q-mr-xs" />Compra</q-btn>
      </div>
    </div>

    <LoadingState :loading="loading" :empty="false" label="Calibrando panel…">
      <div class="i3d-kpi-grid i3d-build-stagger">
        <div class="i3d-kpi i3d-kpi--accent">
          <div class="i3d-kpi-label">Ventas de hoy</div>
          <div class="i3d-kpi-value i3d-accent"><Odometer :value="r.ventas?.hoy || 0" prefix="$ " /></div>
        </div>
        <div class="i3d-kpi">
          <div class="i3d-kpi-label">Ventas de la semana</div>
          <div class="i3d-kpi-value"><Odometer :value="r.ventas?.semana || 0" prefix="$ " /></div>
        </div>
        <div class="i3d-kpi">
          <div class="i3d-kpi-label">Ventas del mes</div>
          <div class="i3d-kpi-value"><Odometer :value="r.ventas?.mes || 0" prefix="$ " /></div>
        </div>
        <div class="i3d-kpi i3d-kpi--positive" v-if="auth.puedeVerCostos">
          <div class="i3d-kpi-label">Ganancia estimada (mes)</div>
          <div class="i3d-kpi-value i3d-positive"><Odometer :value="r.gananciaEstimadaMes || 0" prefix="$ " /></div>
        </div>
        <div class="i3d-kpi i3d-kpi--warning" v-if="auth.isAdmin">
          <div class="i3d-kpi-label">Gastos / compras (mes)</div>
          <div class="i3d-kpi-value i3d-warning"><Odometer :value="r.gastosMes || 0" prefix="$ " /></div>
        </div>
        <div class="i3d-kpi">
          <div class="i3d-kpi-label">Pedidos pendientes</div>
          <div class="i3d-kpi-value"><Odometer :value="r.pedidosPendientes || 0" /></div>
        </div>
        <div class="i3d-kpi i3d-kpi--tech">
          <div class="i3d-kpi-label">Impresiones en curso</div>
          <div class="i3d-kpi-value i3d-tech"><Odometer :value="r.impresionesEnCurso || 0" /></div>
        </div>
        <div class="i3d-kpi">
          <div class="i3d-kpi-label">Gramos consumidos (mes)</div>
          <div class="i3d-kpi-value"><Odometer :value="r.gramosConsumidosMes || 0" suffix=" g" /></div>
        </div>
      </div>

      <div class="row q-col-gutter-md">
        <!-- Grafico de ventas con reveal "g-code" -->
        <div class="col-12 col-md-8">
          <div class="i3d-section-card">
            <div class="i3d-card-head">
              <span>Ventas — últimos 30 días</span>
              <span class="mono i3d-card-sub">{{ series.length }} días</span>
            </div>
            <div v-if="series.length" class="i3d-chart">
              <div
                v-for="(d, idx) in series" :key="idx"
                class="i3d-bar-wrap"
                :title="`${d.fecha}: $${d.total.toLocaleString('es-AR')}`"
              >
                <div class="i3d-bar" :style="{ height: barHeight(d.total), animationDelay: (idx * 18) + 'ms' }"></div>
              </div>
            </div>
            <div v-else class="app-empty-state">Sin ventas registradas todavía.</div>
          </div>
        </div>

        <!-- Alertas -->
        <div class="col-12 col-md-4">
          <div class="i3d-section-card q-mb-md">
            <div class="i3d-card-head"><span>Stock crítico</span></div>
            <LoadingState :loading="false" :empty="!critico.length" empty-label="Todo en orden.">
              <q-list dense>
                <q-item v-for="i in critico" :key="i._id" class="i3d-alert-row">
                  <q-item-section>{{ i.nombre }}</q-item-section>
                  <q-item-section side><span class="mono i3d-alert-val">{{ i.stock }} {{ i.unidad }}</span></q-item-section>
                </q-item>
              </q-list>
            </LoadingState>
          </div>
          <div class="i3d-section-card">
            <div class="i3d-card-head"><span>Próximas entregas</span></div>
            <LoadingState :loading="false" :empty="!entregas.length" empty-label="Sin entregas programadas.">
              <q-list dense>
                <q-item v-for="p in entregas" :key="p._id">
                  <q-item-section>
                    <q-item-label>#{{ p.numero }} — {{ p.cliente?.nombre || p.clienteNombre || 'Cliente' }}</q-item-label>
                    <q-item-label caption class="mono">{{ date(p.fechaEntrega) }}</q-item-label>
                  </q-item-section>
                  <q-item-section side><StatusBadge :label="p.estado" :status="p.estado" /></q-item-section>
                </q-item>
              </q-list>
            </LoadingState>
          </div>
        </div>
      </div>
    </LoadingState>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import LoadingState from '../../components/LoadingState.vue';
import Odometer from '../../components/Odometer.vue';
import StatusBadge from '../../components/StatusBadge.vue';
import AppIcon from '../../components/AppIcon.vue';
import { useAuthStore } from '../../stores/auth.js';
import { fetchResumen, fetchSeries } from '../../services/api.js';
import { formatDate } from '../../utils/format.js';
import '../../styles/dashboard-unified.css';

const auth = useAuthStore();
const loading = ref(true);
const r = ref({});
const series = ref([]);

const date = (d) => formatDate(d);
const critico = computed(() => r.value.stockCritico || []);
const entregas = computed(() => r.value.proximasEntregas || []);
const maxSerie = computed(() => Math.max(1, ...series.value.map((d) => d.total)));
const barHeight = (total) => `${Math.max(2, (total / maxSerie.value) * 100)}%`;

onMounted(async () => {
  loading.value = true;
  try {
    const [resumen, s] = await Promise.all([fetchResumen(), fetchSeries(30)]);
    r.value = resumen;
    series.value = s;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.i3d-quick { display: flex; gap: 8px; flex-wrap: wrap; }
.i3d-card-head {
  display: flex; align-items: center; justify-content: space-between;
  font-weight: 600; font-size: 15px;
  color: var(--text-primary); margin-bottom: 16px;
}
.i3d-card-sub { color: var(--text-muted); font-size: 12px; }

.i3d-chart { display: flex; align-items: flex-end; gap: 4px; height: 190px; padding-top: 8px; }
.i3d-bar-wrap { flex: 1; height: 100%; display: flex; align-items: flex-end; }
@keyframes i3d-bar-rise { from { transform: scaleY(0); } to { transform: scaleY(1); } }
.i3d-bar {
  width: 100%; border-radius: 3px 3px 0 0; min-height: 2px; transform-origin: bottom;
  background: linear-gradient(180deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 55%, var(--tech)) 100%);
  animation: i3d-bar-rise var(--dur-slow) var(--ease-standard) both;
  transition: filter var(--dur-micro) var(--ease-standard);
}
.i3d-bar:hover { filter: brightness(1.2); }

.i3d-alert-val { color: var(--danger); font-weight: 600; }

@media (prefers-reduced-motion: reduce) {
  .i3d-bar { animation: none; transform: scaleY(1); }
}
</style>
