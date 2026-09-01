import { defineStore } from 'pinia';
import { Dark } from 'quasar';

function initialTheme() {
  try {
    const saved = localStorage.getItem('i3d_theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* noop */ }
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch { return 'dark'; }
}

export const useThemeStore = defineStore('theme', {
  state: () => ({ theme: initialTheme() }),
  getters: {
    isDark: (s) => s.theme === 'dark'
  },
  actions: {
    apply() {
      document.documentElement.setAttribute('data-theme', this.theme);
      Dark.set(this.theme === 'dark');
      try {
        const meta = document.querySelector('meta[name=theme-color]');
        if (meta) meta.setAttribute('content', this.theme === 'light' ? '#F6F7F9' : '#0E1116');
      } catch { /* noop */ }
    },
    set(theme) {
      this.theme = theme === 'light' ? 'light' : 'dark';
      try { localStorage.setItem('i3d_theme', this.theme); } catch { /* noop */ }
      this.apply();
    },
    toggle() {
      this.set(this.theme === 'dark' ? 'light' : 'dark');
    }
  }
});
