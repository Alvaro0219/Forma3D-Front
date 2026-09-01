import { defineStore } from 'pinia';

/**
 * Carrito de la tienda publica. Es temporal (sesion del cliente): se persiste en
 * localStorage por comodidad, pero NO genera registros en el sistema. Al finalizar
 * solo se convierte en un mensaje de WhatsApp.
 */
function loadCart() {
  try {
    const raw = localStorage.getItem('i3d_cart');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export const useCarritoStore = defineStore('carrito', {
  state: () => ({ items: loadCart() }),
  getters: {
    count: (s) => s.items.reduce((acc, i) => acc + i.cantidad, 0),
    total: (s) => s.items.reduce((acc, i) => acc + i.precio * i.cantidad, 0),
    isEmpty: (s) => s.items.length === 0
  },
  actions: {
    persist() {
      localStorage.setItem('i3d_cart', JSON.stringify(this.items));
    },
    add(producto, cantidad = 1) {
      const existing = this.items.find((i) => i.id === producto.id);
      if (existing) {
        existing.cantidad += cantidad;
      } else {
        this.items.push({
          id: producto.id,
          nombre: producto.nombre,
          codigo: producto.codigo,
          precio: producto.precio,
          fotoPrincipal: producto.fotoPrincipal,
          cantidad
        });
      }
      this.persist();
    },
    setCantidad(id, cantidad) {
      const item = this.items.find((i) => i.id === id);
      if (!item) return;
      item.cantidad = Math.max(1, cantidad);
      this.persist();
    },
    remove(id) {
      this.items = this.items.filter((i) => i.id !== id);
      this.persist();
    },
    clear() {
      this.items = [];
      this.persist();
    }
  }
});
