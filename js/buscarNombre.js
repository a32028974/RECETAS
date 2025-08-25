// /RECETAS/js/buscarNombre.js
import { API_URL } from './api.js';

/**
 * Busca por DNI y completa nombre + teléfono (si existen).
 * Muestra/oculta el loader inline mientras consulta.
 */
export async function buscarNombrePorDNI(dniInput, nombreInput, telefonoInput, indicadorInline) {
  const dni = (dniInput?.value || '').trim();
  // Si está vacío: limpio y salgo
  if (!dni) {
    if (nombreInput)   nombreInput.value = '';
    if (telefonoInput) telefonoInput.value = '';
    return;
  }

  const showLoading = (on) => {
    if (indicadorInline) indicadorInline.hidden = !on;
    if (nombreInput) nombreInput.placeholder = on ? 'Buscando…' : 'Apellido y nombre';
  };

  // Helper para intentar JSON y, si no, texto plano
  const tryFetch = async (url) => {
    const res = await fetch(url, { method: 'GET' });
    try {
      const json = await res.json();
      return { kind: 'json', data: json, ok: res.ok };
    } catch {
      const text = await res.text();
      return { kind: 'text', data: text, ok: res.ok };
    }
  };

  showLoading(true);
  try {
    // 1) Intento moderno: JSON
    let resp = await tryFetch(`${API_URL}?buscarDNI=${encodeURIComponent(dni)}&json=1`);

    if (resp.kind === 'json' && resp.data && resp.data.ok) {
      const nombre   = (resp.data.nombre || '').toUpperCase();
      const telefono = resp.data.telefono || '';
      if (nombreInput) nombreInput.value = nombre;
      if (telefonoInput && telefono) telefonoInput.value = telefono;
      return;
    }

    // 2) Fallback legacy: texto plano
    if (resp.kind !== 'text') {
      resp = await tryFetch(`${API_URL}?buscarDNI=${encodeURIComponent(dni)}`);
    }
    const nombreTxt = (typeof resp.data === 'string' ? resp.data : '') || '';
    if (nombreTxt.startsWith('ERROR')) {
      if (nombreInput) nombreInput.value = '';
    } else {
      if (nombreInput) nombreInput.value = nombreTxt.toUpperCase();
    }
  } catch (e) {
    console.error('Error buscando cliente por DNI:', e);
    if (nombreInput) nombreInput.value = '';
  } finally {
    showLoading(false);
  }
}

// Por compatibilidad si alguna parte lo importa por default
export default buscarNombrePorDNI;
