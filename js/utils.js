// utils.js
export function sanitizePrice(v) {
  if (v == null) return 0;
  const s = String(v).replace(/[^\d,.\-]/g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
