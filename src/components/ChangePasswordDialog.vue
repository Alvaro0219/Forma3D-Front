<template>
  <q-dialog v-model="open" @hide="reset">
    <q-card class="i3d-pwd-card">
      <div class="i3d-pwd-head">
        <span class="i3d-card-title">Cambiar contraseña</span>
        <q-btn flat round dense v-close-popup><AppIcon name="close" :size="18" /></q-btn>
      </div>

      <q-form class="i3d-pwd-body" @submit.prevent="guardar">
        <q-input
          v-model="form.actual" outlined dense type="password"
          label="Contraseña actual" autocomplete="current-password"
        />
        <q-input
          v-model="form.nueva" outlined dense type="password"
          label="Contraseña nueva" autocomplete="new-password"
          hint="Mínimo 10 caracteres"
        />
        <q-input
          v-model="form.repetir" outlined dense type="password"
          label="Repetir contraseña nueva" autocomplete="new-password"
          :error="!!form.repetir && form.repetir !== form.nueva"
          error-message="Las contraseñas no coinciden"
        />

        <div class="i3d-pwd-note">
          Al cambiarla se cierran las sesiones abiertas en otros dispositivos.
        </div>

        <div class="i3d-pwd-actions">
          <q-btn flat no-caps label="Cancelar" v-close-popup />
          <q-btn type="submit" color="primary" unelevated no-caps label="Guardar" :loading="loading" :disable="!valido" />
        </div>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useQuasar } from 'quasar';
import AppIcon from './AppIcon.vue';
import { cambiarPassword } from '../services/api.js';

const open = defineModel({ type: Boolean, default: false });

const $q = useQuasar();
const loading = ref(false);
const form = ref({ actual: '', nueva: '', repetir: '' });

const valido = computed(() =>
  !!form.value.actual && form.value.nueva.length >= 10 && form.value.nueva === form.value.repetir
);

function reset() {
  form.value = { actual: '', nueva: '', repetir: '' };
}

async function guardar() {
  if (!valido.value) return;
  loading.value = true;
  try {
    await cambiarPassword(form.value.actual, form.value.nueva);
    $q.notify({ type: 'positive', message: 'Contraseña actualizada' });
    open.value = false;
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message || 'No se pudo cambiar la contraseña' });
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.i3d-pwd-card { width: 420px; max-width: 92vw; background: var(--bg-elevated); }
.i3d-pwd-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--sp-4); border-bottom: 1px solid var(--border);
}
.i3d-pwd-body { padding: var(--sp-4); display: flex; flex-direction: column; gap: var(--sp-3); }
.i3d-pwd-note { font-size: var(--fs-meta); color: var(--text-muted); }
.i3d-pwd-actions { display: flex; justify-content: flex-end; gap: var(--sp-2); margin-top: var(--sp-2); }
</style>
