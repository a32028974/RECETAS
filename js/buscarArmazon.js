// js/buscarArmazon.js
import { API_URL, withParams, apiGet } from './api.js';

/**
 * Completa detalle y precio de armazón por número.
 * @param {HTMLInputElement} numEl   input #numero_armazon
 * @param {HTMLInputElement} detEl   input #armazon_detalle
 * @param {HTMLInputElement} preEl   input #precio_armazon
 * @param {HTMLElement}      spinner (opcional)
 */
export async function buscarArmazonPorNumero(numEl, detEl, preEl, spinner) {
  const n = String(numEl?.value || '').replace(/\D+/g, '');
  if (!n) {
    if (detEl) detEl.value = '';
    if (preEl) preEl.value = '';
    return;
  }

  try {
    if (spinner) spinner.style.display = 'flex';

    const url = withParams(API_URL, { buscarArmazon: n });
    const data = await apiGet(url);

    if (detEl) detEl.value = (data?.modelo || '').trim();   // SIEMPRE completa
    if (preEl) preEl.value = (data?.precio || '').trim();   // SIEMPRE completa

    // si querés usar estado/vendedor/fecha, están en data.estado / data.vendedor / data.fecha

  } catch (err) {
    console.error('buscarArmazonPorNumero:', err);
    if (detEl) detEl.value = '';
    if (preEl) preEl.value = '';
  } finally {
    if (spinner) spinner.style.display = 'none';
  }
}
