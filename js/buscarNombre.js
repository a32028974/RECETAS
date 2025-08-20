// buscarNombre.js
import { API_URL } from './api.js';

/**
 * Busca por DNI y completa nombre + teléfono (si existen).
 * - Intenta JSON (&json=1) y, si falla, cae a texto plano (modo viejo).
 * - Muestra lupita y "Buscando..." mientras consulta.
 */
export async function buscarNombrePorDNI(dniInput, nombreInput, telefonoInput, indicadorInline) {
  const dni = (dniInput?.value || "").trim();
  if (!dni) {
    if (nombreInput)   nombreInput.value = "";
    if (telefonoInput) telefonoInput.value = "";
    return;
  }

  const showLoading = (on) => {
    if (indicadorInline) indicadorInline.hidden = !on;
    if (nombreInput) nombreInput.placeholder = on ? "Buscando…" : "Apellido y nombre";
  };

  showLoading(true);

  // helper: intenta leer JSON; si no, texto
  const tryFetch = async (url) => {
    const res = await fetch(url, { method: "GET" });
    let payload, text;
    try {
      payload = await res.json();
      return { kind: "json", data: payload, ok: res.ok };
    } catch {
      text = await res.text();
      return { kind: "text", data: text, ok: res.ok };
    }
  };

  try {
    // 1) Primer intento: JSON
    let resp = await tryFetch(`${API_URL}?buscarDNI=${encodeURIComponent(dni)}&json=1`);
    console.log("[DNI] respuesta 1:", resp);

    // 2) Si no trae ok/JSON válido, probamos sin json=1 (modo viejo)
    if (resp.kind === "json" && resp.data && resp.data.ok) {
      const nombre = (resp.data.nombre || "").toUpperCase();
      const telefono = resp.data.telefono || "";
      if (nombreInput)   nombreInput.value = nombre;
      if (telefonoInput && telefono) telefonoInput.value = telefono;
    } else {
      // Fallback texto plano
      if (resp.kind !== "text") {
        resp = await tryFetch(`${API_URL}?buscarDNI=${encodeURIComponent(dni)}`);
        console.log("[DNI] respuesta fallback:", resp);
      }
      const nombreTxt = (typeof resp.data === "string" ? resp.data : "") || "";
      if (nombreTxt.startsWith("ERROR")) {
        // no encontrado → no tocamos lo que hayas escrito en teléfono
        if (nombreInput) nombreInput.value = "";
      } else {
        if (nombreInput) nombreInput.value = nombreTxt.toUpperCase();
      }
    }
  } catch (err) {
    console.error("Error buscando nombre por DNI:", err);
    // No borramos teléfono por si ya lo escribiste
    if (nombreInput) nombreInput.value = "";
  } finally {
    showLoading(false);
  }
}
