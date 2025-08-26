// js/buscarArmazon.js
import { API_URL, withParams, apiGet } from './api.js';

/**
 * Busca el armazón y completa detalle + precio.
 * Muestra un SweetAlert de “cargando” mientras consulta.
 */
export async function buscarArmazonPorNumero(nInput, detalleInput, precioInput) {
  const num = String(nInput?.value || '').replace(/\D+/g, '');
  if (!num) {
    if (detalleInput) detalleInput.value = '';
    if (precioInput)  precioInput.value  = '';
    return;
  }

  try {
    // Loader grande que tapa la pantalla (pero claro)
    if (window.Swal) {
      Swal.fire({
        title: 'Buscando armazón…',
        text: `Nº ${num}`,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });
    }

    const url  = withParams(API_URL, { buscarArmazon: num });
    const data = await apiGet(url);

    // Completar campos (solo lo que te interesa)
    const detalle = (data?.modelo || data?.detalle || '').toString().trim();
    const precio  = (data?.precio  || '').toString().trim();

    if (detalleInput) detalleInput.value = detalle;
    if (precioInput)  precioInput.value  = precio;

    if (window.Swal) Swal.close();
  } catch (err) {
    console.error('buscarArmazonPorNumero:', err);
    if (window.Swal) Swal.close();

    // Limpiar y avisar
    if (detalleInput) detalleInput.value = '';
    if (precioInput)  precioInput.value  = '';
    if (window.Swal) {
      Swal.fire('No encontrado', `No se encontró el armazón Nº ${num}.`, 'warning');
    }
  }
}
