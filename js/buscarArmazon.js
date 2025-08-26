// js/buscarArmazon.js
import { API_URL, withParams, apiGet } from './api.js';

/**
 * Busca el armazón y completa detalle + precio.
 * - Acepta códigos alfanuméricos (RB1130, VO979, etc.)
 * - Si el backend devuelve varias coincidencias, muestra un selector para elegir.
 */
export async function buscarArmazonPorNumero(nInput, detalleInput, precioInput) {
  const raw  = String(nInput?.value || '').trim();
  const code = raw.toUpperCase().replace(/\s+/g, ''); // no quitamos letras ni guiones

  if (!code) {
    if (detalleInput) detalleInput.value = '';
    if (precioInput)  precioInput.value  = '';
    return;
  }

  // Si tiene letras o guión, pedimos "búsqueda exacta"
  const exacto = /[A-Z\-]/.test(code) ? 1 : 0;

  try {
    if (window.Swal) {
      Swal.fire({
        title: 'Buscando armazón…',
        text: `Código: ${code}`,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });
    }

    // Pedimos MULTI (lista). El backend puede devolver:
    // - un objeto único, o
    // - un array de candidatos.
    const url  = withParams(API_URL, { buscarArmazon: code, exacto, multi: 1 });
    const data = await apiGet(url);

    const cerrar = () => { if (window.Swal) Swal.close(); };

    // Normalizamos a array de candidatos
    const candidatos = Array.isArray(data) ? data : (data ? [data] : []);

    if (!candidatos.length) {
      cerrar();
      if (detalleInput) detalleInput.value = '';
      if (precioInput)  precioInput.value  = '';
      if (window.Swal) Swal.fire('No encontrado', `No se encontró "${code}".`, 'warning');
      return;
    }

    // Si hay 1, completamos directo
    if (candidatos.length === 1) {
      const c = candidatos[0];
      if (detalleInput) detalleInput.value = (c?.modelo || c?.detalle || c?.armazon || '').toString().trim();
      if (precioInput)  precioInput.value  = (c?.precio || '').toString().trim();
      cerrar();
      return;
    }

    // Si hay varios, armamos opciones para elegir
    const opts = {};
    candidatos.forEach((c, i) => {
      const cod = (c?.codigo || c?.code || c?.nro || c?.numero || '').toString();
      const det = (c?.modelo || c?.detalle || c?.armazon || '').toString();
      const pre = (c?.precio ?? '').toString();
      opts[i] = `${cod} — ${det}${pre ? ` ($ ${pre})` : ''}`;
    });

    cerrar();
    const { value: idx } = await Swal.fire({
      title: 'Elegí el armazón',
      input: 'select',
      inputOptions: opts,
      inputPlaceholder: 'Coincidencias',
      showCancelButton: true,
      confirmButtonText: 'Usar',
      cancelButtonText: 'Cancelar',
      allowOutsideClick: false
    });

    if (idx === undefined) return; // cancelado

    const elegido = candidatos[Number(idx)];
    if (detalleInput) detalleInput.value = (elegido?.modelo || elegido?.detalle || elegido?.armazon || '').toString().trim();
    if (precioInput)  precioInput.value  = (elegido?.precio || '').toString().trim();

  } catch (err) {
    console.error('buscarArmazonPorNumero:', err);
    if (window.Swal) Swal.close();
    if (detalleInput) detalleInput.value = '';
    if (precioInput)  precioInput.value  = '';
    if (window.Swal) Swal.fire('Error', 'No se pudo buscar el armazón.', 'error');
  }
}
