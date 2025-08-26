// js/buscarArmazon.js
import { API_URL, withParams, apiGet } from './api.js';

/**
 * Busca el armazón y completa detalle + precio.
 * - Acepta códigos alfanuméricos (RB1130, VO979, 13336, 13-336, etc.).
 * - Si hay varios resultados, muestra un selector para elegir.
 * - Mantiene la firma: (nInput, detalleInput, precioInput)
 */
export async function buscarArmazonPorNumero(nInput, detalleInput, precioInput) {
  const raw  = String(nInput?.value || '').trim();
  const code = raw.toUpperCase().replace(/\s+/g, ''); // normalizamos pero NO quitamos letras

  // Limpia si está vacío
  if (!code) {
    if (detalleInput) detalleInput.value = '';
    if (precioInput)  precioInput.value  = '';
    return;
  }

  // Helper de "no encontrado"
  const notFound = (c) => {
    if (detalleInput) detalleInput.value = '';
    if (precioInput)  precioInput.value  = '';
    if (window.Swal) Swal.fire('No encontrado', `No se encontró el armazón "${c}".`, 'warning');
  };

  try {
    // Loader
    if (window.Swal) {
      Swal.fire({
        title: 'Buscando armazón…',
        text: `Código: ${code}`,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });
    }

    // Flags:
    // - Si hay letras o guión, buscamos "exacto" (RB11330 ≠ 11330)
    // - Si es solo numérico, permitimos varios (multi) para que elijas
    const hasAlphaOrHyphen = /[A-Za-z-]/.test(code);
    const url = withParams(API_URL, {
      buscarArmazon: code,
      exacto: hasAlphaOrHyphen ? 1 : 0,
      multi:  hasAlphaOrHyphen ? 0 : 1
    });

    const res = await apiGet(url);
    if (window.Swal) Swal.close();

    let item = null;

    if (Array.isArray(res)) {
      if (res.length === 0) return notFound(code);
      if (res.length === 1) {
        item = res[0];
      } else {
        // Hay varios: pedir selección
        const options = {};
        res.forEach((r, i) => {
          const det = (r.detalle || [r.marca, r.modelo, r.color].filter(Boolean).join(' ')).trim();
          const p   = r.precio ? ` — $${r.precio}` : '';
          options[i] = `${r.codigo}${det ? ' — ' + det : ''}${p}`;
        });

        const { value: idx, isConfirmed } = await Swal.fire({
          title: 'Elegí el armazón',
          input: 'select',
          inputOptions: options,
          inputPlaceholder: 'Seleccionar',
          showCancelButton: true,
          confirmButtonText: 'Usar',
          cancelButtonText: 'Cancelar'
        });

        if (!isConfirmed) return; // usuario canceló
        item = res[parseInt(idx, 10)];
      }
    } else {
      item = res; // objeto único
    }

    if (!item) return notFound(code);

    // Completar campos
    const detalle = (item.detalle || item.modelo || item.armazon || '').toString().trim();
    const precioNum = (item.precio || '').toString().replace(/[^\d]/g, ''); // deja solo dígitos

    if (detalleInput) detalleInput.value = detalle;
    if (precioInput)  precioInput.value  = precioNum;

    // Si el backend nos devolvió el código "oficial", lo dejamos escrito (ej: de 13336 → RB13336)
    if (nInput && item.codigo) nInput.value = String(item.codigo).toUpperCase();
  } catch (err) {
    console.error('buscarArmazonPorNumero:', err);
    if (window.Swal) Swal.close();
    notFound(code);
  }
}
