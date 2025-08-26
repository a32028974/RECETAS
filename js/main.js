// /RECETAS/js/main.js — versión con PROGRESO + cámara inicializada
import { obtenerNumeroTrabajoDesdeTelefono } from './numeroTrabajo.js';
import { cargarFechaHoy } from './fechaHoy.js';
import { buscarNombrePorDNI } from './buscarNombre.js';
import { buscarArmazonPorNumero } from './buscarArmazon.js';
import { guardarTrabajo } from './guardar.js';
import { initPhotoPack } from './fotopack.js';

const $  = (id)  => document.getElementById(id);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

/* ========== PROGRESO ========== */
const PROGRESS_STEPS = [
  'Validando datos',
  'Guardando en planilla',
  'Generando PDF',
  'Subiendo fotos',
  'Guardando link del PDF',
  'Enviando por Telegram',
  'Listo'
];

// Garantiza que el overlay tenga la clase correcta y existe
function getOverlayHost() {
  let host = $('spinner');
  if (!host) {
    host = document.createElement('div');
    host.id = 'spinner';
    document.body.appendChild(host);
  }
  host.classList.add('spinner');            // usa tu CSS .spinner
  host.classList.remove('spinner-screen');  // por si quedó viejo
  return host;
}

function createProgressPanel(steps = PROGRESS_STEPS) {
  const host = getOverlayHost();
  // guardo el HTML anterior para restaurar igualito
  if (!host.dataset.prevHTML) host.dataset.prevHTML = host.innerHTML;
  host.style.display = 'flex';
  host.innerHTML = `
    <div class="progress-panel" role="dialog" aria-label="Guardando">
      <div class="progress-title">Guardando…</div>
      <ul class="progress-list">
        ${steps.map((t,i)=>`<li data-status="${i===0?'run':'todo'}" data-step="${t}">
            <span class="icon"></span><span class="txt">${t}</span>
          </li>`).join('')}
      </ul>
      <div class="progress-note">No cierres esta ventana.</div>
    </div>
  `;
  return host.querySelector('.progress-panel');
}
function hideProgressPanel() {
  const host = getOverlayHost();
  host.style.display = 'none';
  // restaurar el HTML anterior (loader + texto)
  if (host.dataset.prevHTML !== undefined) {
    host.innerHTML = host.dataset.prevHTML;
    delete host.dataset.prevHTML;
  } else {
    host.innerHTML = '';
  }
}
function progressAPI(steps = PROGRESS_STEPS) {
  createProgressPanel(steps);
  const lis = Array.from(document.querySelectorAll('.progress-list li'));
  let idx = 0;
  let timer = null;

  const setStatus = (i, status) => { const li = lis[i]; if (li) li.setAttribute('data-status', status); };
  const next = () => {
    setStatus(idx, 'done');
    idx = Math.min(idx + 1, lis.length - 1);
    if (lis[idx].getAttribute('data-status') === 'todo') setStatus(idx, 'run');
  };
  const mark = (textOrIndex, status='done') => {
    const i = typeof textOrIndex === 'number'
      ? textOrIndex
      : lis.findIndex(li => li.dataset.step === textOrIndex);
    if (i < 0) return;
    setStatus(i, status);
    if (status === 'done' && i === idx) next();
  };
  const autoAdvance = (msPerStep = 6000) => {
    clearInterval(timer);
    timer = setInterval(() => {
      if (idx >= lis.length - 1) { clearInterval(timer); return; }
      next();
    }, msPerStep);
  };
  const complete = () => { clearInterval(timer); for (let i=0;i<lis.length;i++) setStatus(i,'done'); };
  const fail = (msg) => {
    clearInterval(timer);
    setStatus(idx, 'error');
    if (window.Swal) Swal.fire('Error', msg || 'No se pudo guardar', 'error');
  };
  const doneAndHide = (delay=800) => { complete(); setTimeout(hideProgressPanel, delay); };

  return { next, mark, autoAdvance, complete, fail, doneAndHide };
}
/* ========== /PROGRESO ========== */

// (quedan por compatibilidad; otras partes podrían llamarlos)
function lockForm(){ const sp = getOverlayHost(); sp.style.display = 'flex'; }
function unlockForm(){ const sp = getOverlayHost(); sp.style.display = 'none'; }

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

/* ===== Graduaciones ===== */
function clamp(n, min, max){ return Math.min(Math.max(n, min), max); }
function snapToStep(n, step){ return Math.round(n / step) * step; }
function sanitizeGradual(el, allowSigns = true){
  let v = el.value;
  v = v.replace(/,/g, '');
  v = v.replace(/[^\d+.\-]/g, '');
  if (!allowSigns) { v = v.replace(/[+-]/g, ''); }
  else { v = v.replace(/(?!^)[+-]/g, ''); }
  const parts = v.split('.');
  if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
  el.value = v;
}
function validateGradual(el){
  const min  = parseFloat(el.dataset.min);
  const max  = parseFloat(el.dataset.max);
  const step = parseFloat(el.dataset.step);
  let v = el.value.trim();
  if (!v) return;
  v = v.replace(/,/g, '.');
  const num = parseFloat(v);
  if (isNaN(num)) { el.value = ''; return; }
  let val = clamp(snapToStep(num, step), min, max);
  el.value = val.toFixed(2);
}
function sanitizeEje(el){ el.value = el.value.replace(/\D/g, '').slice(0,3); }
function validateEje(el){
  if (!el.value) return;
  let n = parseInt(el.value, 10);
  if (isNaN(n)) { el.value=''; return; }
  n = clamp(n, 0, 180);
  el.value = String(n);
}
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
function setupGraduaciones(){
  document.querySelectorAll('input.grad').forEach(el=>{
    const isAdd = el.classList.contains('grad-add');
    el.addEventListener('input', ()=> sanitizeGradual(el, !isAdd));
    el.addEventListener('blur',  ()=> validateGradual(el));
    el.addEventListener('keydown', (e)=>{
      if (e.key === ',') e.preventDefault();
      if (isAdd && (e.key === '+' || e.key === '-')) e.preventDefault();
    });
  });
  ['od_eje','oi_eje'].forEach(id=>{
    const el = $(id);
    if (!el) return;
    el.addEventListener('input', ()=>{
      sanitizeEje(el);
      checkEjeRequerido(id==='od_eje' ? $('od_cil') : $('oi_cil'), el);
    });
    el.addEventListener('blur',  ()=> validateEje(el));
  });
  ['od_cil','oi_cil'].forEach(id=>{
    const cil = $(id);
    const eje = $(id==='od_cil' ? 'od_eje' : 'oi_eje');
    if (!cil || !eje) return;
    const h = ()=> checkEjeRequerido(cil, eje);
    cil.addEventListener('input', h);
    cil.addEventListener('blur',  h);
  });
}

/* ===== Dinero ===== */
function parseMoney(v){
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return isNaN(n) ? 0 : n;
}
function sanitizePrice(el){ el.value = el.value.replace(/[^\d]/g,''); }
function setupCalculos(){
  const pc = $('precio_cristal');
  const pa = $('precio_armazon');
  const po = $('precio_otro');
  const se = $('sena');
  const tot = $('total');
  const sal = $('saldo');

  function updateTotals(){
    const total = parseMoney(pc?.value) + parseMoney(pa?.value) + parseMoney(po?.value);
    if (tot) tot.value = String(total);
    const saldo = total - parseMoney(se?.value);
    if (sal) sal.value = String(saldo);
  }

  [pc, pa, po, se].forEach(el=>{
    if(!el) return;
    el.addEventListener('input', ()=>{ sanitizePrice(el); updateTotals(); });
    el.addEventListener('change', updateTotals);
  });
  updateTotals();
}

/* ===== Impresión / Limpieza ===== */
function buildPrintArea(){ try{ (window.__buildPrintArea||(()=>{}))(); }catch{} setTimeout(()=>window.print(),0); }
function limpiarFormulario(){
  const form=$('formulario'); if(!form) return;
  form.reset(); cargarFechaHoy();
  const gal=$('galeria-fotos'); if(gal) gal.innerHTML='';
  // borro memoria de fotos si existe
  if (Array.isArray(window.__FOTOS)) window.__FOTOS.length = 0;
  recalcularFechaRetiro();
}

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
  // Cámara + Galería
  initPhotoPack();

  cargarFechaHoy();
  setupGraduaciones();
  setupCalculos();

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

  // Nº armazón alfanumérico
  const nAr=$('numero_armazon'), detAr=$('armazon_detalle'), prAr=$('precio_armazon');
  if(nAr){
    const doAr = () => buscarArmazonPorNumero(nAr, detAr, prAr);
    nAr.addEventListener('blur', doAr);
    nAr.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); doAr(); } });
    nAr.addEventListener('input', ()=>{
      nAr.value = nAr.value
        .toUpperCase()
        .replace(/\s+/g, '')
        .replace(/[^A-Z0-9\-]/g, '');
    });
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

      // PROGRESO (auto avanza para que veas “ticks” mientras espera)
      const progress = progressAPI(PROGRESS_STEPS);
      progress.autoAdvance(6000);

      try{
        await guardarTrabajo({ progress }); // si tu guardar.js ignora el arg, no pasa nada
        progress.doneAndHide(800);
      } catch (err){
        console.error(err);
        progress.fail(err?.message || 'Error al guardar');
      }
    });
  }
});

export { generarNumeroTrabajoDesdeTelefono, recalcularFechaRetiro };
