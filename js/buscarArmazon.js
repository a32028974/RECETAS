// buscarArmazon.js
import { API_URL } from './api.js';

export async function buscarArmazonPorNumero(
  numeroArmazonInput,
  armazonDetalleInput,
  precioArmazonInput,
  spinnerGlobal // compatibilidad; no lo usamos
) {
  const numero = (numeroArmazonInput?.value || "").trim();
  const spinner = document.getElementById("armazon-loading");
  if (spinner) spinner.hidden = false; // mostrar mientras busca

  if (!numero) {
    if (armazonDetalleInput) armazonDetalleInput.value = "";
    if (precioArmazonInput)  precioArmazonInput.value  = "";
    marcarEstado(numeroArmazonInput, null); // reset
    if (spinner) spinner.hidden = true;
    return;
  }

  try {
    const url = `${API_URL}?buscarArmazon=${encodeURIComponent(numero)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data && !data.error) {
      // Completar modelo y precio
      if (armazonDetalleInput) armazonDetalleInput.value = (data.modelo || "").toUpperCase();
      if (precioArmazonInput)  precioArmazonInput.value  = (data.precio || "");

      // Estado (DISPONIBLE / VENDIDO / desconocido)
      const estado   = (data.estado || "DESCONOCIDO").toUpperCase();
      const vendedor = (data.vendedor || "").toUpperCase();
      const fecha    = (data.fecha || "");

      mostrarAvisoEstado(estado, vendedor, fecha);
      marcarEstado(numeroArmazonInput, estado);
    } else {
      // No encontrado
      if (armazonDetalleInput) armazonDetalleInput.value = "";
      if (precioArmazonInput)  precioArmazonInput.value  = "";
      marcarEstado(numeroArmazonInput, "NO_ENCONTRADO");
      if (window.Swal) {
        Swal.fire({
          icon: "warning",
          title: "Armazón no encontrado",
          toast: true, position: "top-end", timer: 2500, showConfirmButton: false
        });
      }
    }
  } catch (err) {
    console.error("Error buscando armazón:", err);
    if (window.Swal) {
      Swal.fire({
        icon: "error",
        title: "Error de conexión",
        toast: true, position: "top-end", timer: 2500, showConfirmButton: false
      });
    }
  } finally {
    if (spinner) spinner.hidden = true; // ocultar siempre
  }
}

/* ===== Código de barras: debajo de “Fecha:” y SIN número dentro ===== */

/**
 * Busca la fila "Fecha:" dentro del panel principal de impresión
 * y coloca justo DEBAJO un contenedor full-row con el <svg> del código.
 */
function ensureBarcodeAfterFecha() {
  const printArea = document.getElementById('print-area');
  if (!printArea) return null;

  const panelMain = printArea.querySelector('.panel-main');
  if (!panelMain) return null;

  // Encontrar la fila que contiene la etiqueta "Fecha"
  const keys = panelMain.querySelectorAll('.print-k');
  let fechaRow = null;
  for (const k of keys) {
    const txt = (k.textContent || '').trim().toUpperCase();
    if (txt.startsWith('FECHA')) {
      // .print-k suele vivir dentro de una fila tipo .print-kv
      fechaRow = k.closest('.print-kv') || k.parentElement;
      break;
    }
  }

  // Si ya existe el holder, lo reutilizamos y lo movemos si hiciera falta
  let holder = panelMain.querySelector('#barcode-holder-trabajo');
  if (!holder) {
    holder = document.createElement('div');
    holder.id = 'barcode-holder-trabajo';
    holder.className = 'row-full';       // ocupa todo el ancho de las 2 columnas
    holder.style.textAlign = 'center';
    holder.style.margin = '2mm 0';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'barcode-trabajo');
    holder.appendChild(svg);
  }

  // Insertar inmediatamente DESPUÉS de la fila "Fecha:"
  if (fechaRow && fechaRow.parentNode) {
    if (holder.parentNode !== fechaRow.parentNode) {
      fechaRow.parentNode.insertBefore(holder, fechaRow.nextSibling);
    } else if (holder.previousSibling !== fechaRow) {
      fechaRow.parentNode.insertBefore(holder, fechaRow.nextSibling);
    }
  } else {
    // fallback: al inicio si no encontramos "Fecha"
    if (!holder.parentNode) {
      panelMain.insertAdjacentElement('afterbegin', holder);
    }
  }

  return holder.querySelector('#barcode-trabajo');
}

function renderBarcodeTrabajo(numeroTrabajo) {
  const svg = ensureBarcodeAfterFecha();
  if (!svg || !window.JsBarcode || !numeroTrabajo) return;

  try {
    // SIN número dentro (displayValue:false)
    // y tamaño más chico; el ancho final lo controla el CSS (width: 90mm)
    JsBarcode(svg, String(numeroTrabajo), {
      format: "CODE128",
      width: 1,       // barras finas
      height: 28,     // altura razonable
      displayValue: false,
      margin: 0
    });
  } catch (e) {
    console.error('Error generando código de barras:', e);
  }
}

// Justo antes de imprimir, generar el barcode con el valor actual del input
window.addEventListener('beforeprint', () => {
  const numeroTrabajo = document.getElementById('numero_trabajo')?.value?.trim();
  if (numeroTrabajo) {
    renderBarcodeTrabajo(numeroTrabajo);
  }
});

/* ===== UI helpers ===== */

function mostrarAvisoEstado(estado, vendedor, fecha) {
  if (!window.Swal) return; // por si no está cargado sweetalert

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
  } else {
    // Desconocido: no molestamos con toast; sólo no pintamos nada
  }
}

function marcarEstado(input, estado) {
  if (!input) return;
  // Limpio
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
