// /RECETAS/js/main.js — versión final
import { obtenerNumeroTrabajoDesdeTelefono } from './numeroTrabajo.js';
import { cargarFechaHoy } from './fechaHoy.js';
import { buscarNombrePorDNI } from './buscarNombre.js';
import { buscarArmazonPorNumero } from './buscarArmazon.js';
import { guardarTrabajo } from './guardar.js';

const $  = (id) => document.getElementById(id);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function lockForm(){ const sp = $("spinner"); if (sp) sp.style.display = 'flex'; }
function unlockForm(){ const sp = $("spinner"); if (sp) sp.style.display = 'none'; }

/* ===== Fechas ===== */
function parseFechaDDMMYY(str){
  if(!str) return new Date();
  const [d,m,a] = str.split('/');
  const dd = parseInt(d||'0',10), mm = parseInt(m||'1',10);
  let yy = parseInt(a||'0',10); if ((a||'').length===2) yy = 2000 + yy;
  return new Date(yy, mm-1, dd);
}
function fmtISO(d){
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), da=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${da}`;
}
function sumarDias(base, dias){ const d=new Date(base.getTime()); d.setDate(d.getDate() + (parseInt(dias,10)||0)); return d; }
function recalcularFechaRetiro(){
  const enc = $('fecha'), out = $('fecha_retira'); if(!enc || !out) return;
  const radio = document.querySelector("input[name='entrega']:checked");
  const base = parseFechaDDMMYY(enc.value);
  const dias = radio?.value ? parseInt(radio.value,10) : 7;
  out.value = fmtISO(sumarDias(base, dias));
}

/* ===== Nº de trabajo desde teléfono ===== */
const generarNumeroTrabajoDesdeTelefono = () => {
  const tel = $('telefono'), out = $('numero_trabajo');
  if (!tel || !out) return;
  out.value = obtenerNumeroTrabajoDesdeTelefono(tel.value);
};

/* ===== Graduaciones (inputs con +/- y punto) ===== */
// Utils
function clamp(n, min, max){ return Math.min(Math.max(n, min), max); }
function snapToStep(n, step){ return Math.round(n / step) * step; }

// Sanitiza en tiempo real: sin coma; opcionalmente sin signos (para ADD)
function sanitizeGradual(el, allowSigns = true){
  let v = el.value;
  v = v.replace(/,/g, '');            // bloquea coma
  v = v.replace(/[^\d+.\-]/g, '');    // deja + - dígitos y punto
  if (!allowSigns) {
    v = v.replace(/[+-]/g, '');       // ADD: sin signos
  } else {
    v = v.replace(/(?!^)[+-]/g, '');  // si se permiten: solo uno y al inicio
  }
  const parts = v.split('.');
  if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
  el.value = v;
}

// Valida al salir: rango + paso y fija 2 decimales
function validateGradual(el){
  const min  = parseFloat(el.dataset.min);
  const max  = parseFloat(el.dataset.max);
  const step = parseFloat(el.dataset.step);
  let v = el.value.trim();
  if (!v) return; // permitir vacío

  v = v.replace(/,/g, '.');           // por si pegaron coma
  const num = parseFloat(v);
  if (isNaN(num)) { el.value = ''; return; }

  let val = clamp(snapToStep(num, step), min, max);
  el.value = val.toFixed(2);
}

// EJE: 0..180 enteros
function sanitizeEje(el){ el.value = el.value.replace(/\D/g, '').slice(0,3); }
function validateEje(el){
  if (!el.value) return;
  let n = parseInt(el.value, 10);
  if (isNaN(n)) { el.value=''; return; }
  n = clamp(n, 0, 180);
  el.value = String(n);
}

// EJE requerido si CIL ≠ 0
function styleEje(inp, ok){ if(!inp) return; inp.style.borderColor = ok? '#e5e7eb' : '#ef4444'; }
function checkEjeRequerido(cilEl, ejeEl){
  const cil = parseFloat((cilEl?.value || '').replace(',', '.'));
  const eje = parseInt(ejeEl?.value || '', 10);
  const requerido = !isNaN(cil) && cil !== 0;
  let ok = true;
  if (requerido) ok = (eje>=0 && eje<=180);
  styleEje(ejeEl, ok);
  return !requerido || ok;
}
function validarEjesRequeridos(){
  const ok1 = checkEjeRequerido($('od_cil'), $('od_eje'));
  const ok2 = checkEjeRequerido($('oi_cil'), $('oi_eje'));
  if(!(ok1 && ok2) && window.Swal){
    Swal.fire({
      icon:'warning',
      title:'Revisá los EJE',
      text:'Si hay CIL distinto de 0, el EJE debe estar entre 0 y 180.',
      timer:2500, showConfirmButton:false, toast:true, position:'top-end'
    });
  }
  return ok1 && ok2;
}

// Wireup de eventos para ESF/CIL/ADD/EJE
function setupGraduaciones(){
  // ESF/CIL/ADD → class="grad" (ADD además lleva class="grad-add")
  document.querySelectorAll('input.grad').forEach(el=>{
    const isAdd = el.classList.contains('grad-add');

    el.addEventListener('input', ()=> sanitizeGradual(el, !isAdd)); // ADD sin signos
    el.addEventListener('blur',  ()=> validateGradual(el));

    // Bloquear coma siempre; y en ADD bloquear +/-
    el.addEventListener('keydown', (e)=>{
      if (e.key === ',') e.preventDefault();
      if (isAdd && (e.key === '+' || e.key === '-')) e.preventDefault();
    });
  });

  // EJE
  ['od_eje','oi_eje'].forEach(id=>{
    const el = $(id);
    if (!el) return;
    el.addEventListener('input', ()=>{
      sanitizeEje(el);
      checkEjeRequerido(id==='od_eje' ? $('od_cil') : $('oi_cil'), el);
    });
    el.addEventListener('blur',  ()=> validateEje(el));
  });

  // Cuando cambie CIL, revalidar EJE requerido
  ['od_cil','oi_cil'].forEach(id=>{
    const cil = $(id);
    const eje = $(id==='od_cil' ? 'od_eje' : 'oi_eje');
    if (!cil || !eje) return;
    const h = ()=> checkEjeRequerido(cil, eje);
    cil.addEventListener('input', h);
    cil.addEventListener('blur',  h);
  });
}

/* ===== Impresión / Limpieza ===== */
function buildPrintArea(){ try{ (window.__buildPrintArea||(()=>{}))(); }catch{} setTimeout(()=>window.print(),0); }
function limpiarFormulario(){
  const form=$('formulario'); if(!form) return;
  form.reset(); cargarFechaHoy();
  const gal=$('galeria-fotos'); if(gal) gal.innerHTML='';
  recalcularFechaRetiro();
}

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
  cargarFechaHoy();
  setupGraduaciones();                // activa validaciones de graduación

  $$("input[name='entrega']").forEach(r => r.addEventListener('change', recalcularFechaRetiro));
  const fechaEnc = $('fecha'); if(fechaEnc) fechaEnc.addEventListener('change', recalcularFechaRetiro);
  recalcularFechaRetiro();

  const tel = $('telefono');
  if(tel){
    tel.addEventListener('blur', generarNumeroTrabajoDesdeTelefono);
    tel.addEventListener('change', generarNumeroTrabajoDesdeTelefono);
    tel.addEventListener('input', ()=>{ tel.value = tel.value.replace(/[^0-9 +()-]/g,''); });
  }

  const dni=$('dni'), nombre=$('nombre'), telefono=$('telefono'), indi=$('dni-loading');
  if(dni){
    const doDNI = () => buscarNombrePorDNI(dni, nombre, telefono, indi);
    dni.addEventListener('blur', doDNI);
    dni.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); doDNI(); } });
    dni.addEventListener('input', ()=>{ dni.value = dni.value.replace(/\D/g,''); });
  }

  const nAr=$('numero_armazon'), detAr=$('armazon_detalle'), prAr=$('precio_armazon');
  if(nAr){
    const doAr = () => buscarArmazonPorNumero(nAr, detAr, prAr, $('spinner'));
    nAr.addEventListener('blur', doAr);
    nAr.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); doAr(); } });
    nAr.addEventListener('input', ()=>{ nAr.value = nAr.value.replace(/\D/g,'').slice(0,7); });
  }

  const dnp=$('dnp');
  if(dnp){
    const fmt=(v)=> v.replace(/\D/g,'').slice(0,4).replace(/^(\d{0,2})(\d{0,2}).*$/,(_,a,b)=> b?`${a}/${b}`:a);
    dnp.addEventListener('input', ()=> dnp.value = fmt(dnp.value));
  }

  const btnImp=$('btn-imprimir'); if(btnImp) btnImp.addEventListener('click', buildPrintArea);
  const btnClr=$('btn-limpiar'); if(btnClr) btnClr.addEventListener('click', limpiarFormulario);

  const form=$('formulario');
  if(form){
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      if(!validarEjesRequeridos()) return;
      try{ lockForm(); await guardarTrabajo(); } finally { unlockForm(); }
    });
  }
});

export { generarNumeroTrabajoDesdeTelefono, recalcularFechaRetiro };
