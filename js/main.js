// main.js
import { cargarFechaHoy } from './fechaHoy.js';
import { buscarNombrePorDNI } from './buscarNombre.js';
import { buscarArmazonPorNumero } from './buscarArmazon.js';
import { configurarCalculoPrecios } from './calculos.js';
import { guardarTrabajo } from './guardar.js';
import { cargarCristales } from './sugerencias.js';
import { initPhotoPack } from './fotoPack.js';

window.QR_URL = window.QR_URL || "";

/* ===== Bloqueo general del formulario ===== */
function lockForm() {
  const form = document.getElementById("formulario");
  if (!form) return;
  form.setAttribute("aria-busy", "true");
  form.querySelectorAll("input, select, textarea, button").forEach(el => el.disabled = true);
  const sp = document.getElementById("spinner");
  if (sp) sp.style.display = "block";
}
function unlockForm() {
  const form = document.getElementById("formulario");
  if (!form) return;
  form.removeAttribute("aria-busy");
  form.querySelectorAll("input, select, textarea, button").forEach(el => el.disabled = false);
  const sp = document.getElementById("spinner");
  if (sp) sp.style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
  const fechaRetiraInput     = document.getElementById("fecha_retira");
  const telefonoInput        = document.getElementById("telefono");
  const numeroTrabajoInput   = document.getElementById("numero_trabajo");
  const dniInput             = document.getElementById("dni");
  const dniLoading           = document.getElementById("dni-loading");
  const nombreInput          = document.getElementById("nombre");
  const numeroArmazonInput   = document.getElementById("numero_armazon");
  const armazonDetalleInput  = document.getElementById("armazon_detalle");
  const precioArmazonInput   = document.getElementById("precio_armazon");
  const radiosEntrega        = document.querySelectorAll("input[name='entrega']");
  const dnpInput             = document.getElementById("dnp");

  initPhotoPack();

  // ===== Fechas
  cargarFechaHoy();

  function parseFechaDDMMYY(str){
    if(!str) return new Date();
    const [d,m,a]=str.split("/");
    let y=parseInt(a,10);
    if(a.length===2) y=2000+y;
    return new Date(y,parseInt(m,10)-1,parseInt(d,10));
  }
  function fmtDDMMYY(date){
    const d=String(date.getDate()).padStart(2,'0');
    const m=String(date.getMonth()+1).padStart(2,'0');
    const y=String(date.getFullYear()).slice(-2);
    return `${d}/${m}/${y}`;
  }
  function sumarDiasHabiles(base, dias){
    const dt = new Date(base);
    dt.setDate(dt.getDate()+dias);
    // Evitar domingos (0). Si cae domingo, pasarlo a lunes.
    if (dt.getDay() === 0) dt.setDate(dt.getDate()+1);
    return dt;
  }
  function recalcularFechaRetira(){
    const sel = document.querySelector("input[name='entrega']:checked");
    if(!sel) return;
    const dias = parseInt(sel.value,10);
    const base = parseFechaDDMMYY((document.getElementById("fecha")?.value || "").trim());
    const estimada = sumarDiasHabiles(base, dias);
    if (fechaRetiraInput) fechaRetiraInput.value = fmtDDMMYY(estimada);
  }
  radiosEntrega.forEach(r => r.addEventListener("change", recalcularFechaRetira));
  recalcularFechaRetira();

  // ===== N° de trabajo desde teléfono
  if (telefonoInput) {
    telefonoInput.addEventListener("blur", () => {
      const tel = telefonoInput.value.replace(/\D/g,'');
      if (tel.length >= 4) {
        const ult4 = tel.slice(-4), now=new Date();
        const anio = now.getFullYear().toString().slice(-1);
        const mes  = String(now.getMonth()+1).padStart(2,'0');
        const dia  = String(now.getDate()).padStart(2,'0');
        const hora = String(now.getHours()).padStart(2,'0');
        numeroTrabajoInput.value = `${anio}${mes}${dia}${hora}${ult4}`;
      } else {
        numeroTrabajoInput.value = "";
        alert("Ingresá un teléfono válido (mínimo 4 dígitos).");
      }
    });
  }

  // ===== DNI -> nombre + teléfono (bloquea mientras busca)
  if (dniInput) {
    dniInput.addEventListener("blur", async () => {
      if (!dniInput.value.trim()) return;
      try {
        lockForm();
        dniLoading?.removeAttribute("hidden");
        await buscarNombrePorDNI(dniInput, nombreInput, document.getElementById("telefono"), dniLoading);
      } finally {
        dniLoading?.setAttribute("hidden", "");
        unlockForm();
      }
    });
  }

  // ===== Armazón -> modelo/precio/estado (bloquea mientras busca)
  if (numeroArmazonInput) {
    // máscara: solo números 0-9 y máx 7
    numeroArmazonInput.addEventListener("input", () => {
      numeroArmazonInput.value = numeroArmazonInput.value.replace(/\D/g, '').slice(0,7);
    });
    numeroArmazonInput.addEventListener("blur", async () => {
      if (!numeroArmazonInput.value.trim()) return;
      try {
        lockForm();
        document.getElementById("armazon-loading")?.removeAttribute("hidden");
        await buscarArmazonPorNumero(numeroArmazonInput, armazonDetalleInput, precioArmazonInput, document.getElementById("spinner"));
      } finally {
        document.getElementById("armazon-loading")?.setAttribute("hidden","");
        unlockForm();
      }
    });
  }

  // ===== Totales + datalist de cristales
  configurarCalculoPrecios();
  cargarCristales();

  // ===== Graduaciones (combos) + validación de EJE + DNP
  cargarOpcionesGraduacion();
  configurarValidacionesEje();

  if (dnpInput){
    // máscara 99/99
    const fmt = (s) => s.replace(/\D/g,'').slice(0,4).replace(/^(\d{0,2})(\d{0,2}).*$/, (_,a,b)=> b ? `${a}/${b}` : a);
    dnpInput.addEventListener("input", () => { dnpInput.value = fmt(dnpInput.value); });
  }

  // ===== Guardar
  const form = document.getElementById("formulario");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validarEjesRequeridos()) return;
      if (dnpInput && !/^\d{2}\/\d{2}$/.test(dnpInput.value)) {
        alert("Ingresá DNP en formato 99/99 (OD/OI).");
        dnpInput.focus();
        return;
      }
      try {
        lockForm();
        await guardarTrabajo();  // guardar.js también maneja spinner y alertas
      } finally {
        unlockForm();
      }
    });
  }

  // ===== Botones inferiores
  const btnImp = document.getElementById("btn-imprimir");
  const btnClr = document.getElementById("btn-limpiar");
  if (btnImp) btnImp.addEventListener("click", async () => {
    try { (window.__buildPrintArea || buildPrintArea)(); } catch {}
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    window.print();
  });
  if (btnClr) btnClr.addEventListener("click", limpiarFormulario);

  window.__buildPrintArea = buildPrintArea;
});

/* =========================
   (el resto igual que ya tenías)
   ========================= */
function cargarOpcionesGraduacion() { /* ... igual a tu versión previa ... */ }
function agregarPlaceholder(select, texto){ /* ... */ }
function opcion(valor){ /* ... */ }
function rangoDecimales(inicio, fin, paso, skipZero){ /* ... */ }

function configurarValidacionesEje() { /* ... igual a tu versión previa ... */ }
function checkEjeRequerido(selCil, inpEje){ /* ... */ }
function styleEje(inp, ok){ /* ... */ }
function validarEjesRequeridos(){ /* ... */ }

function limpiarFormulario(){ /* ... igual a tu versión previa ... */ }

function buildPrintArea(){ /* ... igual a tu versión previa (ver abajo DNP) ... */ }
