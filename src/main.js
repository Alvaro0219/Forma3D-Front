import { createApp } from 'vue';
import { Quasar, Notify, Dialog, Dark } from 'quasar';
import { createPinia } from 'pinia';
import router from './router/index.js';
import App from './App.vue';
import { useThemeStore } from './stores/theme.js';

import 'quasar/dist/quasar.css';
import '@quasar/extras/material-icons/material-icons.css';
import './styles/tokens.css';
import './styles/additive.css';
import './styles/app.css';
import './styles/dashboard-unified.css';

const app = createApp(App);
app.use(Quasar, { plugins: { Notify, Dialog, Dark }, config: { dark: true } });
const pinia = createPinia();
app.use(pinia);
app.use(router);

// Aplicar tema (dark por defecto) antes de montar, sincronizando con Quasar Dark.
useThemeStore(pinia).apply();

// Red de contención para errores no capturados.
app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue error]', err, info);
  Notify.create({ type: 'negative', message: 'Ocurrió un error inesperado. Intenta de nuevo.' });
};

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled promise rejection]', event.reason);
  Notify.create({ type: 'negative', message: 'Ocurrió un error inesperado. Intenta de nuevo.' });
});

app.mount('#app');
