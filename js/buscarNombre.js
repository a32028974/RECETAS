// js/buscarNombre.js
import { API_URL, withParams, apiGet } from './api.js';

/**
 * Completa nombre y teléfono a partir del DNI.
 * @param {HTMLInputElement} dniEl       input #dni
 * @param {HTMLInputElement} nombreEl    input #nombre
 * @param {HTMLInputElement} telefonoEl  input #telefono
 * @param {HTMLElement}      indicatorEl (opcional) icono/spinner junto al DNI
 */
export async function buscarNombrePorDNI(dniEl, nombreEl, telefonoEl, indicatorEl) {
  const dni = String(dniEl?.value || '').replace(/\D+/g, '');
  if (!dni) {
    if (nombreEl) nombreEl.value = '';
    if (telefonoEl) telefonoEl.value = '';
    return;
  }

  try {
    if (indicatorEl) indicatorEl.style.visibility = 'visible';

    const url = withParams(API_URL, { buscarDNI: dni, json: 1 });
    const data = await apiGet(url);

    const nombre   = (data?.nombre   || '').toUpperCase().trim();
    const telefono = (data?.telefono || '').trim();

    if (nombreEl)   nombreEl.value   = nombre;      // SIEMPRE completa nombre
    if (telefonoEl) telefonoEl.value = telefono;    // SIEMPRE completa teléfono

  } catch (err) {
    console.error('buscarNombrePorDNI:', err);
    if (nombreEl)   nombreEl.value   = '';
    if (telefonoEl) telefonoEl.value = '';
  } finally {
    if (indicatorEl) indicatorEl.style.visibility = 'hidden';
  }
}
