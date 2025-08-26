// js/buscarArmazon.js
import { API_URL, withParams, apiGet } from './api.js';

/**
 * Busca el armazón y completa detalle + precio.
 * Acepta códigos alfanuméricos (RB1130, VO979, etc.).
 */
export async function buscarArmazonPorNumero(nInput, detalleInput, precioInput) {
  // NO borremos letras: normalizamos (sin espacios, mayúsculas)
  const raw  = String(nInput?.value || '').trim();
  const code = raw.toUpperCase().replace(/\s+/g, '');

  if (!code) {
    if (detalleInput) detalleInput.value = '';
    if (precioInput)  precioInput.value  = '';
    return;
  }

  try {
    if (window.Swal) {
      Swal.fire({
        title: 'Buscando armazón…',
        text: `Código: ${code}`,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });
    }

    // enviamos tal cual (ej: RB1130). El Apps Script lo recibirá como string.
    const url  = withParams(API_URL, { buscarArmazon: code });
    const data = await apiGet(url);

    // Completar lo que usás
    const detalle = (data?.modelo || data?.detalle || data?.armazon || '').toString().trim();
    const precio  = (data?.precio || '').toString().trim();

    if (detalleInput) detalleInput.value = detalle;
    if (precioInput)  precioInput.value  = precio;

    if (window.Swal) Swal.close();
  } catch (err) {
    console.error('buscarArmazonPorNumero:', err);
    if (window.Swal) Swal.close();
    if (detalleInput) detalleInput.value = '';
    if (precioInput)  precioInput.value  = '';
    if (window.Swal) {
      Swal.fire('No encontrado', `No se encontró el armazón "${code}".`, 'warning');
    }
  }
}
