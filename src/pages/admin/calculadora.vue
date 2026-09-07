<template>
  <div class="i3d-page-shell">
    <div class="i3d-page-header">
      <div>
        <h1 class="i3d-page-title">Calculadora de costos</h1>
        <p class="i3d-page-subtitle">Presupuestos y motor de costos por pieza</p>
      </div>
    </div>

    <div class="row q-col-gutter-md">
      <!-- Entradas -->
      <div class="col-12 col-md-7">
        <div class="i3d-section-card">
          <div class="text-subtitle1 q-mb-md">Datos de la pieza</div>
          <div class="row q-col-gutter-md">
            <div class="col-6"><q-input v-model.number="input.precioRollo" type="number" outlined dense label="Precio del rollo" prefix="$" /></div>
            <div class="col-6"><q-input v-model.number="input.pesoRollo" type="number" outlined dense label="Peso del rollo (g)" /></div>
            <div class="col-6"><q-input v-model.number="input.gramosUtilizados" type="number" outlined dense label="Gramos utilizados" /></div>
            <div class="col-6"><q-input v-model.number="input.tiempoImpresion" type="number" outlined dense label="Tiempo (min)" /></div>
            <div class="col-6"><q-input v-model.number="input.consumoElectrico" type="number" outlined dense label="Consumo (kW)" hint="ej. 0.15" /></div>
            <div class="col-6"><q-input v-model.number="input.precioKwh" type="number" outlined dense label="Precio kWh" prefix="$" /></div>
            <div class="col-6"><q-input v-model.number="input.costoHoraMaquina" type="number" outlined dense label="Costo/hora máquina" prefix="$" /></div>
            <div class="col-6"><q-input v-model.number="input.manoObra" type="number" outlined dense label="Mano de obra /hora" prefix="$" /></div>
            <div class="col-6"><q-input v-model.number="input.embalaje" type="number" outlined dense label="Embalaje" prefix="$" /></div>
            <div class="col-6"><q-input v-model.number="input.otros" type="number" outlined dense label="Otros costos" prefix="$" /></div>
            <div class="col-6"><q-input v-model.number="input.cantidadPiezas" type="number" outlined dense label="Cantidad de piezas" min="1" /></div>
          </div>

          <q-separator class="q-my-md" />

          <div class="text-subtitle2 q-mb-sm">Precio sugerido</div>
          <q-btn-toggle v-model="input.modo" spread no-caps class="q-mb-md"
                        :options="[{label:'Según margen',value:'margen'},{label:'Según ganancia',value:'ganancia'}]" />
          <div class="row q-col-gutter-md">
            <div class="col-6" v-if="input.modo === 'margen'">
              <q-input v-model.number="input.margenDeseado" type="number" outlined dense label="Margen deseado (%)" suffix="%" />
            </div>
            <div class="col-6" v-else>
              <q-input v-model.number="input.gananciaDeseada" type="number" outlined dense label="Ganancia deseada" prefix="$" />
            </div>
          </div>

          <q-btn color="primary" class="q-mt-md" :loading="loading" @click="calcular"><AppIcon name="calculate" :size="16" class="q-mr-xs" />Calcular</q-btn>
        </div>
      </div>

      <!-- Resultados -->
      <div class="col-12 col-md-5">
        <div class="i3d-section-card i3d-result">
          <div class="i3d-result-head">
            <span>Resultado</span>
            <span class="i3d-auto-tag" v-if="resultado"><AppIcon name="auto_awesome" :size="12" :bordered="false" /> auto</span>
          </div>
          <!-- El desglose se apila como capas que se construyen de abajo hacia arriba. -->
          <div v-if="resultado" class="i3d-layers" :key="calcVersion">
            <div class="i3d-result-row"><span>Costo por gramo</span><b class="mono">{{ money(resultado.costoPorGramo) }}</b></div>
            <div class="i3d-result-row"><span>Material</span><b class="mono">{{ money(resultado.costoMaterial) }}</b></div>
            <div class="i3d-result-row"><span>Electricidad</span><b class="mono">{{ money(resultado.costoElectricidad) }}</b></div>
            <div class="i3d-result-row"><span>Máquina</span><b class="mono">{{ money(resultado.costoMaquina) }}</b></div>
            <div class="i3d-result-row"><span>Mano de obra</span><b class="mono">{{ money(resultado.costoManoObra) }}</b></div>
            <div class="i3d-result-row"><span>Embalaje</span><b class="mono">{{ money(resultado.costoEmbalaje) }}</b></div>
            <div class="i3d-result-row"><span>Otros</span><b class="mono">{{ money(resultado.costoOtros) }}</b></div>
            <div class="i3d-result-row i3d-total"><span>Costo total</span><b class="mono">{{ money(resultado.costoTotal) }}</b></div>
            <div class="i3d-result-row i3d-highlight"><span>Precio sugerido</span><b class="mono">{{ money(resultado.precioSugerido) }}</b></div>
            <div v-if="input.cantidadPiezas > 1" class="i3d-result-row i3d-highlight"><span>Precio por pieza ({{ input.cantidadPiezas }})</span><b class="mono">{{ money(precioPorPieza) }}</b></div>
            <div class="i3d-result-row text-positive"><span>Ganancia</span><b class="mono">{{ money(resultado.ganancia) }}</b></div>
            <div class="i3d-result-row text-positive"><span>Margen</span><b class="mono">{{ pct(resultado.margen) }}</b></div>
          </div>
          <div v-else class="text-grey">Completá los datos y presioná Calcular.</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { calcularCosto, fetchConfig } from '../../services/api.js';
import AppIcon from '../../components/AppIcon.vue';
import { formatMoney, formatPercent } from '../../utils/format.js';
import '../../styles/dashboard-unified.css';

const $q = useQuasar();
const money = (n) => formatMoney(n);
const pct = (n) => formatPercent(n);

const input = ref({
  precioRollo: 25000, pesoRollo: 1000, gramosUtilizados: 0, tiempoImpresion: 0,
  consumoElectrico: 0.15, precioKwh: 0, costoHoraMaquina: 0, manoObra: 0,
  embalaje: 0, otros: 0, modo: 'margen', margenDeseado: 60, gananciaDeseada: 0, cantidadPiezas: 1
});
const resultado = ref(null);
const loading = ref(false);
const calcVersion = ref(0);

const precioPorPieza = computed(() => {
  const n = Number(input.value.cantidadPiezas) || 1;
  return resultado.value ? resultado.value.precioSugerido / n : 0;
});

async function calcular() {
  loading.value = true;
  try {
    const res = await calcularCosto(input.value);
    resultado.value = res.resultado;
    calcVersion.value += 1; // re-dispara la animación de capas
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message || 'No se pudo calcular' });
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  try {
    const cfg = await fetchConfig();
    input.value.precioKwh = cfg.precioKwh ?? 0;
    input.value.costoHoraMaquina = cfg.costoHoraMaquina ?? 0;
    input.value.consumoElectrico = cfg.consumoImpresoraDefault ?? 0.15;
    input.value.margenDeseado = cfg.margenDefault ?? 60;
  } catch { /* usa defaults */ }
});
</script>

<style scoped>
.i3d-result { position: sticky; top: 76px; }
.i3d-result-head {
  display: flex; align-items: center; justify-content: space-between;
  font-weight: 600; font-size: 16px;
  color: var(--text-primary); margin-bottom: 16px;
}
.i3d-result-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 7px 0; font-size: 14px; color: var(--text-secondary);
  border-bottom: 1px dashed var(--border);
}
.i3d-result-row b { color: var(--text-primary); }
.i3d-total { font-size: 15px; color: var(--text-primary); border-bottom: 1px solid var(--border-strong); margin-top: 4px; }
.i3d-total span { color: var(--text-primary); font-weight: 600; }
.i3d-highlight {
  background: var(--accent-soft); margin: 8px -10px; padding: 12px 10px;
  border-radius: var(--radius-sm); font-size: 16px; border-bottom: none;
}
.i3d-highlight span, .i3d-highlight b { color: var(--accent); font-weight: 700; }

/* Desglose que se construye de abajo hacia arriba (capas) */
.i3d-layers > .i3d-result-row { animation: i3d-layer-build var(--dur-base) var(--ease-standard) both; }
.i3d-layers > .i3d-result-row:nth-child(1)  { animation-delay: 0ms; }
.i3d-layers > .i3d-result-row:nth-child(2)  { animation-delay: 40ms; }
.i3d-layers > .i3d-result-row:nth-child(3)  { animation-delay: 80ms; }
.i3d-layers > .i3d-result-row:nth-child(4)  { animation-delay: 120ms; }
.i3d-layers > .i3d-result-row:nth-child(5)  { animation-delay: 160ms; }
.i3d-layers > .i3d-result-row:nth-child(6)  { animation-delay: 200ms; }
.i3d-layers > .i3d-result-row:nth-child(7)  { animation-delay: 240ms; }
.i3d-layers > .i3d-result-row:nth-child(8)  { animation-delay: 280ms; }
.i3d-layers > .i3d-result-row:nth-child(9)  { animation-delay: 320ms; }
.i3d-layers > .i3d-result-row:nth-child(10) { animation-delay: 360ms; }
.i3d-layers > .i3d-result-row:nth-child(11) { animation-delay: 400ms; }
</style>
