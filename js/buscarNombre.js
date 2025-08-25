// buscarNombre.js
import { API_URL } from './api.js';

/**
 * Busca por DNI y completa nombre + teléfono (si existen).
 * Se dispara automáticamente cuando salís del input DNI o al presionar Enter.
 */
export function initBuscarNombre() {
  const dniInput = document.getElementById('dni');
  const nombreInput = document.getElementById('nombre');
  const telefonoInput = document.getElementById('telefono');
  const indicadorInline = document.getElementById('dni-loading');

  if (!dniInput || !nombreInput) {
    console.warn("[buscarNombre] No se encontraron los inputs requeridos.");
    return;
  }

  // Función principal de búsqueda
  async function buscarNombrePorDNI() {
    const dni = (dniInput.value || "").trim();
    if (!dni) {
      nombreInput.value = "";
      if (telefonoInput) telefonoInput.value = "";
      return;
    }

    // Mostrar loader
    const showLoading = (on) => {
      if (indicadorInline) indicadorInline.hidden = !on;
      nombreInput.placeholder = on ? "Buscando…" : "Apellido y nombre";
    };

    showLoading(true);

    // Helper que intenta leer JSON y, si falla, texto
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
      console.log("[DNI] respuesta:", resp);

      // 2) Si la API responde correctamente
      if (resp.kind === "json" && resp.data && resp.data.ok) {
        const nombre = (resp.data.nombre || "").toUpperCase();
        const telefono = resp.data.telefono || "";
        nombreInput.value = nombre;
        if (telefonoInput && telefono) telefonoInput.value = telefono;
      } else {
        // 3) Fallback: modo texto plano
        if (resp.kind !== "text") {
          resp = await tryFetch(`${API_URL}?buscarDNI=${encodeURIComponent(dni)}`);
          console.log("[DNI] respuesta fallback:", resp);
        }
        const nombreTxt = (typeof resp.data === "string" ? resp.data : "") || "";
        if (nombreTxt.startsWith("ERROR")) {
          nombreInput.value = "";
        } else {
          nombreInput.value = nombreTxt.toUpperCase();
        }
      }
    } catch (err) {
      console.error("Error buscando nombre por DNI:", err);
      nombreInput.value = "";
    } finally {
      showLoading(false);
    }
  }

  // Evento blur → dispara búsqueda al salir del campo
  dniInput.addEventListener('blur', buscarNombrePorDNI);

  // Evento Enter → dispara búsqueda al presionar Enter
  dniInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscarNombrePorDNI();
    }
  });
}

// Inicializa automáticamente al cargar la página
document.addEventListener('DOMContentLoaded', initBuscarNombre);
