// Helpers de formato compartidos.
// Criterio unico para toda la app: los montos siempre llevan simbolo "$" y dos
// decimales; las cantidades sin unidad monetaria no llevan decimales salvo que
// se pidan; las unidades (g, %, min) van separadas por un espacio del numero.

const LOCALE = 'es-AR';

/** Monto: siempre "$ 1.234,50" (dos decimales, sin excepciones). */
export function formatMoney(n) {
  const val = Number(n) || 0;
  return `$ ${val.toLocaleString(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Numero suelto. Por defecto sin decimales (piezas, unidades, gramos enteros). */
export function formatNumber(n, decimals = 0) {
  const val = Number(n) || 0;
  return val.toLocaleString(LOCALE, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Gramos: "1.000 g". */
export function formatGrams(n, decimals = 0) {
  return `${formatNumber(n, decimals)} g`;
}

/** Porcentaje: "62,5%" (un decimal, salvo que se pida otra cosa). */
export function formatPercent(n, decimals = 1) {
  return `${formatNumber(n, decimals)}%`;
}

/** Minutos -> "2 h 30 min" / "45 min". Formato unico en toda la app. */
export function formatMinutes(m) {
  const n = Math.round(Number(m) || 0);
  if (!n) return '—';
  const h = Math.floor(n / 60);
  const min = n % 60;
  if (!h) return `${min} min`;
  return min ? `${h} h ${min} min` : `${h} h`;
}

export function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(LOCALE);
}

export function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString(LOCALE, {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false
  });
}
