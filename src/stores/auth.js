import { defineStore } from 'pinia';
import { loginApi, refreshApi } from '../services/api.js';

function parseStoredSession() {
  try {
    const raw = localStorage.getItem('i3d_session');
    if (!raw) return { accessToken: null, refreshToken: null, user: null };
    const parsed = JSON.parse(raw);
    return {
      accessToken: parsed.accessToken || null,
      refreshToken: parsed.refreshToken || null,
      user: parsed.user || null
    };
  } catch {
    return { accessToken: null, refreshToken: null, user: null };
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => parseStoredSession(),
  getters: {
    isAuthenticated: (s) => !!s.accessToken,
    isAdmin: (s) => s.user?.role === 'admin',
    puedeVerCostos: (s) => s.user?.role === 'admin' || !!s.user?.permisos?.verCostos
  },
  actions: {
    saveSession() {
      localStorage.setItem('i3d_session', JSON.stringify({
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        user: this.user
      }));
    },
    hydrate() {
      Object.assign(this, parseStoredSession());
    },
    async login(email, password) {
      const res = await loginApi(email, password);
      this.accessToken = res.accessToken;
      this.refreshToken = res.refreshToken;
      this.user = res.user;
      this.saveSession();
    },
    async refreshSession() {
      if (!this.refreshToken) throw new Error('Missing refresh token');
      const res = await refreshApi(this.refreshToken);
      this.accessToken = res.accessToken;
      this.refreshToken = res.refreshToken;
      this.user = res.user;
      this.saveSession();
    },
    logout() {
      this.accessToken = null;
      this.refreshToken = null;
      this.user = null;
      localStorage.removeItem('i3d_session');
    }
  }
});
