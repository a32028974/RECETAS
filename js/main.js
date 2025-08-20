// main.js
import { cargarFechaHoy } from './fechaHoy.js';
import { buscarNombrePorDNI } from './buscarNombre.js';
import { buscarArmazonPorNumero } from './buscarArmazon.js';
import { configurarCalculoPrecios } from './calculos.js';
import { guardarTrabajo } from './guardar.js';
import { cargarCristales } from './sugerencias.js';
import { initPhotoPack } from './fotoPack.js';

// Si ya tenés una URL de QR, podés setearla en runtime: window.QR_URL = "https://...".
window.QR_URL = window.QR_URL || "";

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
  const spinner              = document.getElementById("spinner");
  const radiosEntrega        = document.querySelectorAll("input[name='entrega']");

  // Cámara (modal optimizado para tablet)
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
  function recalcularFechaRetira(){
    const sel = document.querySelector("input[name='entrega']:checked");
    if(!sel) return;
    const dias = parseInt(sel.value,10);
    const base = parseFechaDDMMYY((document.getElementById("fecha")?.value || "").trim());
    const estimada = new Date(base); estimada.setDate(estimada.getDate()+dias);
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

  // ===== DNI -> nombre + teléfono
  if (dniInput) {
    dniInput.addEventListener("blur", () => {
      if (dniInput.value.trim()) buscarNombrePorDNI(dniInput, nombreInput, telefonoInput, dniLoading);
    });
  }

  // ===== Armazón -> modelo/precio/estado
  if (numeroArmazonInput) {
    numeroArmazonInput.addEventListener("blur", () => {
      if (numeroArmazonInput.value.trim()) {
        buscarArmazonPorNumero(numeroArmazonInput, armazonDetalleInput, precioArmazonInput, spinner);
      }
    });
  }

  // ===== Totales + datalist de cristales
  configurarCalculoPrecios();
  cargarCristales();

  // ===== Graduaciones (combos) + validación de EJE
  cargarOpcionesGraduacion();
  configurarValidacionesEje();

  // ===== Guardar (-> guardarTrabajo genera PACK + Telegram + prompt de imprimir)
  const form = document.getElementById("formulario");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validarEjesRequeridos()) return;
      await guardarTrabajo();
    });
  }

  // ===== Botones inferiores
  const btnImp = document.getElementById("btn-imprimir");
  const btnClr = document.getElementById("btn-limpiar");
  if (btnImp) btnImp.addEventListener("click", () => { (window.__buildPrintArea || buildPrintArea)(); window.print(); });
  if (btnClr) btnClr.addEventListener("click", limpiarFormulario);

  // Exponer para que guardar.js use este layout cuando elegís "Imprimir ahora"
  window.__buildPrintArea = buildPrintArea;
});

/* =========================
   Graduación: combos ESF/CIL
   ========================= */
function cargarOpcionesGraduacion() {
  const od_esf = document.getElementById("od_esf");
  const od_cil = document.getElementById("od_cil");
  const oi_esf = document.getElementById("oi_esf");
  const oi_cil = document.getElementById("oi_cil");
  if (!od_esf || !od_cil || !oi_esf || !oi_cil) return;

  [od_esf, od_cil, oi_esf, oi_cil].forEach(sel => sel.innerHTML = "");
  agregarPlaceholder(od_esf, "ESF"); agregarPlaceholder(od_cil, "CIL");
  agregarPlaceholder(oi_esf, "ESF"); agregarPlaceholder(oi_cil, "CIL");

  // ESF: -15.00 a +15.00 (paso 0.25)
  const esfVals = rangoDecimales(-15, 15, 0.25, true); // incluye 0.00 una vez
  esfVals.forEach(v => { od_esf.appendChild(opcion(v)); oi_esf.appendChild(opcion(v)); });

  // CIL: 0.00 + negativos -0.25..-6.00 + positivos +0.25..+6.00
  const cilVals = ["0.00"]
    .concat(rangoDecimales(-0.25, -6, -0.25, false))
    .concat(rangoDecimales(0.25, 6, 0.25, false));
  cilVals.forEach(v => { od_cil.appendChild(opcion(v)); oi_cil.appendChild(opcion(v)); });
}
function agregarPlaceholder(select, texto){
  const o=document.createElement("option");
  o.textContent=texto; o.value=""; o.disabled=true; o.selected=true;
  select.appendChild(o);
}
function opcion(valor){ const o=document.createElement("option"); o.value=valor; o.textContent=valor; return o; }
function rangoDecimales(inicio, fin, paso, skipZero){
  const res=[];
  const fmt=n=>{ const s=Number(n).toFixed(2); return Number(n)>0?`+${s}`:Number(n)===0?"0.00":s; };
  if (inicio<=fin && paso>0){ for(let v=inicio; v<=fin+1e-9; v+=paso){ if(skipZero && Math.abs(v)<1e-9) continue; res.push(fmt(v)); } }
  else { for(let v=inicio; v>=fin-1e-9; v+=paso){ if(skipZero && Math.abs(v)<1e-9) continue; res.push(fmt(v)); } }
  if (skipZero && !res.includes("0.00")) res.splice(Math.floor(res.length/2),0,"0.00");
  return res;
}

/* =========================
   Validación de EJE
   ========================= */
function configurarValidacionesEje() {
  [{cil:"od_cil",eje:"od_eje"},{cil:"oi_cil",eje:"oi_eje"}].forEach(({cil,eje})=>{
    const sel=document.getElementById(cil), inp=document.getElementById(eje);
    if(!sel||!inp) return;
    sel.addEventListener("change",()=>checkEjeRequerido(sel,inp));
    inp.addEventListener("input",()=>{
      let v=inp.value.replace(/\D/g,"");
      if(v===""){ styleEje(inp,true); return; }
      let n=parseInt(v,10); if(isNaN(n)) n=""; if(n<0)n=0; if(n>180)n=180; inp.value=n.toString();
      checkEjeRequerido(sel,inp);
    });
  });
}
function checkEjeRequerido(selCil, inpEje){
  const requiere = selCil.value && selCil.value !== "0.00";
  if (requiere && !inpEje.value){ styleEje(inpEje,false); }
  else { styleEje(inpEje,true); }
}
function styleEje(inp, ok){ inp.style.borderColor = ok ? "#d7dbe0" : "red"; }
function validarEjesRequeridos(){
  const od = document.getElementById("od_cil"), odE=document.getElementById("od_eje");
  const oi = document.getElementById("oi_cil"), oiE=document.getElementById("oi_eje");
  if (od && od.value && od.value!=="0.00" && odE && !odE.value){ alert("Falta el EJE en OD."); odE.focus(); return false; }
  if (oi && oi.value && oi.value!=="0.00" && oiE && !oiE.value){ alert("Falta el EJE en OI."); oiE.focus(); return false; }
  return true;
}

/* =========================
   Limpiar (sin tocar fechas ni entrega)
   ========================= */
function limpiarFormulario(){
  const ids = [
    "numero_trabajo","dni","nombre","telefono",
    "cristal","precio_cristal","numero_armazon",
    "armazon_detalle","precio_armazon",
    "otro_concepto","precio_otro",
    "descripcion","tipo","dr",
    "od_esf","od_cil","od_eje","oi_esf","oi_cil","oi_eje","add",
    "vendedor","forma_pago","total","sena","saldo"
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === "SELECT") el.selectedIndex = 0;
    else el.value = "";
  });
}

/* =========================
   Impresión (A4) — panel 140×120 + cupón 50×120
   ========================= */
function buildPrintArea(){
  const P = (id) => (document.getElementById(id)?.value || "").toString();
  const money = (v) => {
    const n = parseFloat((v||"").toString().replace(/[^0-9.,-]/g,"").replace(",", ".")) || 0;
    return "$" + n.toLocaleString("es-AR", {minimumFractionDigits:2, maximumFractionDigits:2});
  };
  const QR = (window.QR_URL || "").toString();

  const html = `
    <div class="print-sheet">

      <!-- PANEL PRINCIPAL 140x120 -->
      <div class="panel panel-main">
        <img src="logo.png" alt="Logo" class="logo" onerror="this.style.display='none'">
        <div class="panel-title">Ingreso de trabajo</div>

        <div class="rows">
          <div><strong>Fecha:</strong> ${P("fecha")}</div>
          <div><strong>Retira (estimada):</strong> ${P("fecha_retira")}</div>
          <div><strong>N° trabajo:</strong> ${P("numero_trabajo")}</div>
          <div><strong>DNI:</strong> ${P("dni")}</div>
          <div class="row-full"><strong>Cliente:</strong> ${P("nombre")}</div>
          <div><strong>Tel:</strong> ${P("telefono")}</div>
          <div><strong>DR:</strong> ${P("dr")}</div>
        </div>

        <table class="print-table">
          <tr><td><strong>Cristal</strong></td><td>${P("cristal")} — ${money(P("precio_cristal"))}</td></tr>
          <tr><td><strong>Armazón</strong></td><td>${P("numero_armazon")} ${P("armazon_detalle")} — ${money(P("precio_armazon"))}</td></tr>
          <tr><td><strong>Otro</strong></td><td>${P("otro_concepto")} — ${money(P("precio_otro"))}</td></tr>
          <tr><td><strong>Descripción</strong></td><td>${P("descripcion")}</td></tr>
          <tr><td><strong>Tipo</strong></td><td>${P("tipo")}</td></tr>
        </table>

        <table class="print-table">
          <tr><td><strong>OD</strong></td><td>ESF ${P("od_esf")}  |  CIL ${P("od_cil")}  |  EJE ${P("od_eje")}</td></tr>
          <tr><td><strong>OI</strong></td><td>ESF ${P("oi_esf")}  |  CIL ${P("oi_cil")}  |  EJE ${P("oi_eje")}</td></tr>
          <tr><td><strong>ADD</strong></td><td>${P("add")}</td></tr>
        </table>

        <div class="print-footer">
          <div><strong>TOTAL:</strong> ${money(P("total"))}</div>
          <div><strong>SEÑA:</strong> ${money(P("sena"))} — <strong>SALDO:</strong> ${money(P("saldo"))}</div>
          <div><strong>Forma de pago:</strong> ${P("forma_pago")}</div>
          <div><strong>Vendedor:</strong> ${P("vendedor")}</div>
        </div>
      </div>

      <!-- CUPÓN 50x120 -->
      <div class="panel panel-coupon">
        <span class="cut-hint" aria-hidden="true"></span>

        <img src="logo.png" alt="Logo" class="logo" onerror="this.style.display='none'">
        <div class="coupon-title">CUPÓN DE RETIRO</div>

        <div class="coupon-field"><span class="coupon-strong">N° Trabajo:</span> ${P("numero_trabajo")}</div>
        <div class="coupon-field"><span class="coupon-strong">Cliente:</span> ${P("nombre")}</div>
        <div class="coupon-field"><span class="coupon-strong">Encargó:</span> ${P("fecha")}</div>
        <div class="coupon-field"><span class="coupon-strong">Entrega (estimada):</span> ${P("fecha_retira")}</div>
        <div class="coupon-field"><span class="coupon-strong">Total:</span> ${money(P("total"))}</div>
        <div class="coupon-field"><span class="coupon-strong">Seña:</span> ${money(P("sena"))}</div>
        <div class="coupon-field"><span class="coupon-strong">Saldo:</span> ${money(P("saldo"))}</div>

        ${QR
          ? `<img src="${QR}" class="qr" alt="QR">`
          : `<div class="qr" style="display:flex;align-items:center;justify-content:center;font-size:10px;">QR</div>`
        }
      </div>

    </div>
  `;
  const area = document.getElementById("print-area");
  if (area) area.innerHTML = html;
}
