// buscarArmazon.js
import { API_URL } from './api.js';

/**
 * Inicializa la búsqueda de armazones.
 * Se dispara automáticamente al salir del campo o presionar Enter.
 */
export function initBuscarArmazon() {
  const numeroArmazonInput = document.getElementById('numero_armazon');
  const armazonDetalleInput = document.getElementById('armazon_detalle');
  const precioArmazonInput = document.getElementById('precio_armazon');
  const spinner = document.getElementById("armazon-loading");

  if (!numeroArmazonInput) {
    console.warn("[buscarArmazon] No se encontró #numero_armazon");
    return;
  }

  async function buscarArmazonPorNumero() {
    const numero = (numeroArmazonInput.value || "").trim();

    // Muestro spinner
    if (spinner) spinner.hidden = false;

    // Si está vacío, limpio todo
    if (!numero) {
      if (armazonDetalleInput) armazonDetalleInput.value = "";
      if (precioArmazonInput) precioArmazonInput.value = "";
      marcarEstado(numeroArmazonInput, null);
      if (spinner) spinner.hidden = true;
      return;
    }

    try {
      const url = `${API_URL}?buscarArmazon=${encodeURIComponent(numero)}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data && !data.error) {
        // Completar detalle y precio
        if (armazonDetalleInput) armazonDetalleInput.value = (data.modelo || "").toUpperCase();
        if (precioArmazonInput)  precioArmazonInput.value = (data.precio || "");

        // Estado del armazón (DISPONIBLE / VENDIDO)
        const estado   = (data.estado || "DESCONOCIDO").toUpperCase();
        const vendedor = (data.vendedor || "").toUpperCase();
        const fecha    = (data.fecha || "");

        mostrarAvisoEstado(estado, vendedor, fecha);
        marcarEstado(numeroArmazonInput, estado);
      } else {
        // No encontrado
        if (armazonDetalleInput) armazonDetalleInput.value = "";
        if (precioArmazonInput)  precioArmazonInput.value = "";
        marcarEstado(numeroArmazonInput, "NO_ENCONTRADO");

        if (window.Swal) {
          Swal.fire({
            icon: "warning",
            title: "Armazón no encontrado",
            toast: true,
            position: "top-end",
            timer: 2500,
            showConfirmButton: false
          });
        }
      }
    } catch (err) {
      console.error("Error buscando armazón:", err);
      if (window.Swal) {
        Swal.fire({
          icon: "error",
          title: "Error de conexión",
          toast: true,
          position: "top-end",
          timer: 2500,
          showConfirmButton: false
        });
      }
    } finally {
      if (spinner) spinner.hidden = true;
    }
  }

  // Dispara búsqueda al salir del input
  numeroArmazonInput.addEventListener('blur', buscarArmazonPorNumero);

  // Dispara búsqueda al presionar Enter
  numeroArmazonInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscarArmazonPorNumero();
    }
  });
}

/* ===== UI helpers ===== */

function mostrarAvisoEstado(estado, vendedor, fecha) {
  if (!window.Swal) return;

  if (estado === "VENDIDO") {
    const texto = [
      "Este armazón figura VENDIDO.",
      vendedor ? `Vendedor: ${vendedor}.` : "",
      fecha ? `Fecha: ${fecha}.` : ""
    ].filter(Boolean).join(" ");

    Swal.fire({
      icon: "warning",
      title: "Armazón VENDIDO",
      text: texto,
      toast: true,
      position: "top-end",
      timer: 3800,
      showConfirmButton: false
    });
  } else if (estado === "DISPONIBLE") {
    Swal.fire({
      icon: "success",
      title: "Armazón disponible",
      toast: true,
      position: "top-end",
      timer: 1800,
      showConfirmButton: false
    });
  }
}

function marcarEstado(input, estado) {
  if (!input) return;
  input.style.outline = "";
  input.style.borderColor = "";

  if (estado === "VENDIDO") {
    input.style.borderColor = "red";
    input.style.outline     = "2px solid rgba(255,0,0,.35)";
  } else if (estado === "DISPONIBLE") {
    input.style.borderColor = "green";
    input.style.outline     = "2px solid rgba(0,128,0,.25)";
  } else if (estado === "NO_ENCONTRADO") {
    input.style.borderColor = "#cc8800";
    input.style.outline     = "2px solid rgba(230,160,0,.25)";
  }
}
