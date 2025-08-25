// /RECETAS/js/buscarArmazon.js
import { API_URL } from './api.js';

/**
 * Busca un armazón por número en la hoja "Stock" (Apps Script).
 * Completa detalle y precio. Señala estado (DISPONIBLE / VENDIDO / NO_ENCONTRADO).
 *
 * @param {HTMLInputElement} numeroArmazonInput
 * @param {HTMLInputElement} armazonDetalleInput
 * @param {HTMLInputElement} precioArmazonInput
 * @param {HTMLElement}      spinnerGlobal (opcional)
 */
export async function buscarArmazonPorNumero(
  numeroArmazonInput,
  armazonDetalleInput,
  precioArmazonInput,
  spinnerGlobal
) {
  const numero = (numeroArmazonInput?.value || '').trim();
  const spinner = document.getElementById('armazon-loading') || spinnerGlobal;
  if (spinner) spinner.hidden = false;

  // Si está vacío → limpio y salgo
  if (!numero) {
    if (armazonDetalleInput) armazonDetalleInput.value = '';
    if (precioArmazonInput)  precioArmazonInput.value  = '';
    marcarEstado(numeroArmazonInput, null);
    if (spinner) spinner.hidden = true;
    return;
  }

  try {
    const resp = await fetch(`${API_URL}?buscarArmazon=${encodeURIComponent(numero)}`);
    const data = await resp.json();

    if (data && !data.error) {
      // Completar
      if (armazonDetalleInput) armazonDetalleInput.value = (data.modelo || '').toUpperCase();
      if (precioArmazonInput)  precioArmazonInput.value  = (data.precio || '');

      const estado   = (data.estado || 'DESCONOCIDO').toUpperCase();
      const vendedor = (data.vendedor || '').toUpperCase();
      const fecha    = (data.fecha || '');

      marcarEstado(numeroArmazonInput, estado);

      if (estado === 'VENDIDO') {
        avisar(
          'Armazón VENDIDO',
          [vendedor ? `Vendedor: ${vendedor}` : '', fecha ? `Fecha: ${fecha}` : '']
            .filter(Boolean)
            .join(' · '),
          'warning'
        );
      } else if (estado === 'DISPONIBLE') {
        // opcional: avisito corto
        // avisar('Armazón disponible', `Nº ${numero}`, 'success');
      }
    } else {
      // No encontrado
      if (armazonDetalleInput) armazonDetalleInput.value = '';
      if (precioArmazonInput)  precioArmazonInput.value  = '';
      marcarEstado(numeroArmazonInput, 'NO_ENCONTRADO');
      avisar('Armazón no encontrado', `Nº ${numero} no existe en Stock.`, 'warning');
    }
  } catch (e) {
    console.error('Error buscando armazón:', e);
    avisar('Error de conexión', 'No se pudo consultar el stock.', 'error');
  } finally {
    if (spinner) spinner.hidden = true;
  }
}

/* ===== Helpers UI ===== */
function avisar(title, text, icon = 'info') {
  if (!window.Swal) return;
  Swal.fire({
    icon, title, text,
    toast: true, position: 'top-end', timer: 2800, showConfirmButton: false
  });
}

function marcarEstado(input, estado) {
  if (!input) return;
  input.style.outline = '';
  input.style.borderColor = '';

  if (estado === 'VENDIDO') {
    input.style.borderColor = 'red';
    input.style.outline     = '2px solid rgba(255,0,0,.25)';
  } else if (estado === 'DISPONIBLE') {
    input.style.borderColor = 'green';
    input.style.outline     = '2px solid rgba(0,128,0,.20)';
  } else if (estado === 'NO_ENCONTRADO') {
    input.style.borderColor = '#cc8800';
    input.style.outline     = '2px solid rgba(230,160,0,.25)';
  }
}

// Por compatibilidad, si alguien lo importa como default
export default buscarArmazonPorNumero;
