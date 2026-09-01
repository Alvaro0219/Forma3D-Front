// Helpers de formato compartidos.

export function formatMoney(n, moneda = 'ARS') {
  const val = Number(n || 0);
  return `${moneda} ${val.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('es-AR');
}

export function formatDateTime(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString('es-AR');
}
