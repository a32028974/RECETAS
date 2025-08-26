// js/buscarArmazon.js
import { API_URL, withParams, apiGet } from './api.js';

/**
 * Busca el armazón por número y completa:
 *   - Detalle del armazón
 *   - Precio del armazón
 * Muestra un SweetAlert de “Buscando…” bloqueando la pantalla.
 *
 * @param {HTMLInputElement} nInput        #numero_armazon
 * @param {HTMLInputElement} detalleInput  #armazon_detalle
 * @param {HTMLInputElement} precioInput   #precio_armazon
 */
export async function buscarArmazonPorNumero(nInput, detalleInput, precioInput) {
  const num = String(nInput?.value || '').replace(/\D+/g, '');
  if (!num) {
    if (detalleInput) detalleInput.value = '';
    if (precioInput)  precioInput.value  = '';
    return null;
  }

  // Loader bloqueante
  if (window.Swal) {
    Swal.fire({
      title: 'Buscando armazón…',
      text: `Nº ${num}`,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
      backdrop: true,
    });
  }

  try {
    const url  = withParams(API_URL, { buscarArmazon: num });
    const data = await apiGet(url);

    // Intentamos varias llaves posibles para el detalle
    const detalle =
      (data?.modelo ?? data?.detalle ?? data?.descripcion ?? data?.marca ?? data?.nombre ?? '')
        .toString()
        .trim();

    // Precio como texto limpio; puede llegar number o string
    let precio = (data?.precio ?? '').toString().trim();

    if (detalleInput) detalleInput.value = detalle;
    if (precioInput) {
      precioInput.value = precio;
      // Disparamos blur para que el formateo de moneda en main.js agregue "$ "
      precioInput.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    return data;
  } catch (err) {
    console.error('buscarArmazonPorNumero:', err);
    if (detalleInput) detalleInput.value = '';
    if (precioInput)  precioInput.value  = '';
    if (window.Swal) {
      Swal.fire('No encontrado', `No se encontró el armazón Nº ${num}.`, 'warning');
    }
    return null;
  } finally {
    if (window.Swal) Swal.close();
  }
}
