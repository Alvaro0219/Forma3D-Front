import { ref } from 'vue';
import { useQuasar } from 'quasar';

/**
 * Composable generico de listar/crear/editar/eliminar con PAGINACION server-side.
 * fetchFn recibe { ...filtros, page, limit } y devuelve una respuesta paginada
 * { items, pagination } (o un array, que se trata como una sola pagina).
 *
 * - reload(filtros): reemplaza los filtros y vuelve a la pagina 1.
 * - reload(): re-fetch de la pagina/filtros actuales (lo usan create/update/remove).
 * - goToPage(p): cambia de pagina manteniendo los filtros.
 */
export function useCrudResource({ fetchFn, createFn, updateFn, deleteFn, idKey = '_id', label = 'registro', pageSize = 10 }) {
  const $q = useQuasar();
  const items = ref([]);
  const pagination = ref({ page: 1, limit: pageSize, total: 0, totalPages: 1 });
  const loading = ref(false);
  const saving = ref(false);

  const _filters = ref({});
  const _page = ref(1);

  function applyResult(res) {
    if (Array.isArray(res)) {
      items.value = res;
      pagination.value = { page: 1, limit: pageSize, total: res.length, totalPages: 1 };
    } else if (res && Array.isArray(res.items)) {
      items.value = res.items;
      if (res.pagination) pagination.value = res.pagination;
    } else {
      items.value = [];
    }
  }

  async function fetchNow() {
    loading.value = true;
    try {
      const res = await fetchFn({ ..._filters.value, page: _page.value, limit: pageSize });
      applyResult(res);
      // Si borramos el ultimo registro de una pagina, retroceder.
      if (items.value.length === 0 && _page.value > 1) {
        _page.value -= 1;
        return fetchNow();
      }
    } catch (e) {
      $q.notify({ type: 'negative', message: e.message || `No se pudo cargar ${label}` });
    } finally {
      loading.value = false;
    }
  }

  async function reload(newFilters) {
    if (newFilters !== undefined) {
      // Limpia claves vacias para no ensuciar la query.
      const clean = {};
      for (const [k, v] of Object.entries(newFilters || {})) {
        if (v !== undefined && v !== null && v !== '') clean[k] = v;
      }
      _filters.value = clean;
      _page.value = 1;
    }
    await fetchNow();
  }

  async function goToPage(p) {
    _page.value = p;
    await fetchNow();
  }

  async function create(payload) {
    saving.value = true;
    try {
      await createFn(payload);
      await fetchNow();
      $q.notify({ type: 'positive', message: `${capitalize(label)} creado` });
      return true;
    } catch (e) {
      $q.notify({ type: 'negative', message: e.message || `No se pudo crear ${label}` });
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function update(id, payload) {
    saving.value = true;
    try {
      await updateFn(id, payload);
      await fetchNow();
      $q.notify({ type: 'positive', message: `${capitalize(label)} actualizado` });
      return true;
    } catch (e) {
      $q.notify({ type: 'negative', message: e.message || `No se pudo actualizar ${label}` });
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function remove(id) {
    saving.value = true;
    try {
      await deleteFn(id);
      await fetchNow();
      $q.notify({ type: 'positive', message: `${capitalize(label)} eliminado` });
      return true;
    } catch (e) {
      $q.notify({ type: 'negative', message: e.message || `No se pudo eliminar ${label}` });
      return false;
    } finally {
      saving.value = false;
    }
  }

  return { items, pagination, loading, saving, reload, goToPage, create, update, remove, idKey };
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
