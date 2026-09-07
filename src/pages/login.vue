<template>
  <div class="i3d-login i3d-printbed">
    <div class="i3d-login-glow" aria-hidden="true"></div>
    <q-card class="i3d-login-card i3d-build">
      <div class="i3d-login-brand">
        <span class="i3d-brand-mark" aria-hidden="true">
          <img v-if="logoUrl" :src="logoUrl" alt="" class="i3d-brand-logo" />
          <svg v-else viewBox="0 0 24 24" fill="none"><path d="M12 2 L21 7 V17 L12 22 L3 17 V7 Z" stroke="var(--accent)" stroke-width="1.6" stroke-linejoin="round"/><path class="i3d-draw" style="--len:80" d="M12 12 L21 7 M12 12 V22 M12 12 L3 7" stroke="var(--tech)" stroke-width="1.2"/></svg>
        </span>
        <h1>Gestión Impresión 3D</h1>
        <p class="mono">panel de administración</p>
      </div>

      <q-form @submit.prevent="onSubmit" class="q-gutter-md">
        <q-input v-model="email" type="email" label="Email" outlined
                 :rules="[v => !!v || 'Requerido']" />
        <q-input v-model="password" :type="showPass ? 'text' : 'password'" label="Contraseña" outlined
                 :rules="[v => !!v || 'Requerido']">
          <template #append>
            <AppIcon :name="showPass ? 'visibility_off' : 'visibility'" :size="18" class="cursor-pointer" @click="showPass = !showPass" />
          </template>
        </q-input>

        <q-banner v-if="reason" dense class="i3d-login-banner">
          <template #avatar><AppIcon name="schedule" :size="20" color="warning" /></template>
          Tu sesión expiró. Iniciá sesión de nuevo.
        </q-banner>

        <q-btn type="submit" color="primary" label="Ingresar" class="full-width" unelevated size="lg" :loading="loading" />
      </q-form>

      <div class="i3d-login-store">
        <q-btn flat color="secondary" to="/tienda" no-caps><AppIcon name="storefront" :size="16" class="q-mr-xs" />Ir a la tienda</q-btn>
      </div>
    </q-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from '../stores/auth.js';
import AppIcon from '../components/AppIcon.vue';
import { fetchTiendaInfo } from '../services/api.js';

const router = useRouter();
const $q = useQuasar();
const auth = useAuthStore();

const email = ref('');
const password = ref('');
const showPass = ref(false);
const loading = ref(false);
const reason = ref('');
const logoUrl = ref('');

onMounted(async () => {
  try {
    reason.value = sessionStorage.getItem('i3d_login_reason') || '';
    sessionStorage.removeItem('i3d_login_reason');
  } catch { /* noop */ }
  if (auth.isAuthenticated) router.replace('/admin/dashboard');
  // Login no tiene sesion: el logo se pide via el endpoint publico de la tienda.
  try {
    const info = await fetchTiendaInfo();
    if (info?.logo) logoUrl.value = info.logo;
  } catch { /* sin logo configurado o tienda no disponible */ }
});

async function onSubmit() {
  loading.value = true;
  try {
    await auth.login(email.value, password.value);
    router.push('/admin/dashboard');
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message || 'No se pudo iniciar sesión' });
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.i3d-login {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  padding: 16px; position: relative; overflow: hidden;
}
.i3d-login-glow {
  position: absolute; width: 620px; height: 620px; border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--accent) 22%, transparent) 0%, transparent 65%);
  filter: blur(30px); pointer-events: none;
}
.i3d-login-card {
  position: relative; width: 400px; max-width: 92vw; padding: 34px;
  border-radius: var(--radius-lg);
  background: var(--bg-surface); border: 1px solid var(--border-strong);
  box-shadow: var(--shadow-2);
}
.i3d-login-brand { text-align: center; margin-bottom: 26px; }
.i3d-brand-mark { display: inline-block; width: 46px; height: 46px; }
.i3d-brand-mark svg { width: 100%; height: 100%; }
.i3d-brand-logo { width: 100%; height: 100%; object-fit: contain; border-radius: var(--radius-sm); }
.i3d-login-brand h1 { font-size: 21px; margin: 12px 0 4px; color: var(--text-primary); }
.i3d-login-brand p { color: var(--text-muted); margin: 0; font-size: 12px; letter-spacing: .05em; }
.i3d-login-banner { background: var(--accent-soft); color: var(--text-primary); border-radius: var(--radius-sm); }
.i3d-login-store { text-align: center; margin-top: 18px; }
</style>
