// buscarArmazon.js
import { API_URL } from './api.js';

export function initBuscarArmazon() {
  const armazonInput = document.getElementById('numero_armazon');
  const detalleInput = document.getElementById('armazon_detalle');
  const precioInput = document.getElementById('precio_armazon');
  const indicadorInline = document.getElementById('armazon-loading');

  if (!armazonInput || !detalleInput || !precioInput) {
    console.warn("[buscarArmazon] No se encontraron los inputs requeridos.");
    return;
  }

  // Función principal
  async function buscarArmazon() {
    const numero = (armazonInput.value || "").trim();
    if (!numero) {
      detalleInput.value = "";
      precioInput.value = "";
      return;
    }

    const showLoading = (on) => {
      if (indicadorInline) indicadorInline.hidden = !on;
      detalleInput.placeholder = on ? "Buscando…" : "Marca / Modelo / Color";
    };

    showLoading(true);

    try {
      const res = await fetch(`${API_URL}?buscarArmazon=${encodeURIComponent(numero)}`);
      const data = await res.json();
      console.log("[ARMAZON] Respuesta:", data);

      if (data.error) {
        detalleInput.value = "";
        precioInput.value = "";
        Swal.fire({
          icon: "warning",
          title: "No encontrado",
          text: `El armazón ${numero} no existe en el stock.`,
          confirmButtonText: "Aceptar"
        });
        return;
      }

      // Si encontramos datos del armazón
      const detalle = data.modelo || "";
      const precio = data.precio || "";
      const estado = data.estado || "DESCONOCIDO";
      const vendedor = data.vendedor || "";
      const fecha = data.fecha || "";

      detalleInput.value = detalle;
      precioInput.value = precio;

      // Si está vendido → alerta al usuario
      if (estado === "VENDIDO") {
        Swal.fire({
          icon: "error",
          title: "Atención",
          html: `
            <b>El armazón ${numero} ya está VENDIDO.</b><br>
            Vendedor: ${vendedor || "Desconocido"}<br>
            Fecha: ${fecha || "Sin datos"}
          `,
          confirmButtonText: "Aceptar"
        });
      }
    } catch (err) {
      console.error("Error buscando armazón:", err);
      detalleInput.value = "";
      precioInput.value = "";
    } finally {
      showLoading(false);
    }
  }

  // Dispara búsqueda al salir del campo
  armazonInput.addEventListener('blur', buscarArmazon);

  // Dispara búsqueda al presionar Enter
  armazonInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscarArmazon();
    }
  });
}

// Inicializa automáticamente al cargar la página
document.addEventListener('DOMContentLoaded', initBuscarArmazon);
