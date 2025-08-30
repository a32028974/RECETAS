// js/utils.js
// Helpers reutilizables y “fuente de verdad” única para dinero.

/**
 * Limpia un <input> de dinero dejando solo dígitos (pensado para $ AR).
 * Uso: el.addEventListener('input', ()=> sanitizePrice(el))
 */
export function sanitizePrice(el) {
  if (!el) return;
  el.value = String(el.value || '').replace(/[^\d]/g, '');
}

/**
 * Parsea un string/valor de dinero a número.
 * Admite signos y punto decimal; ignora cualquier otro carácter.
 * Ej: "$ 1.234,50" -> 1234.5   |   "2.000" -> 2000
 */
export function parseMoney(v) {
  const n = parseFloat(String(v ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
