// /RECETAS/js/main.js — versión final
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
function generarNumeroTrabajoDesdeTelefono(){
  const tel = $('telefono'), out = $('numero_trabajo'); if(!tel || !out) return;
  const dig = (tel.value || '').replace(/\D+/g,'');
  if(dig.length < 4){ out.value=''; return; }
  const ult4 = dig.slice(-4), now = new Date();
  const anio = String(now.getFullYear()).slice(-1), mes=String(now.getMonth()+1).padStart(2,'0'),
        dia=String(now.getDate()).padStart(2,'0'), hora=String(now.getHours()).padStart(2,'0');
  out.value = `${anio}${dia}${mes}${hora}${ult4}`;
}

/* ===== Graduaciones ===== */
function agregarPlaceholder(select, texto){ const opt=document.createElement('option'); opt.value=''; opt.textContent=texto; select.appendChild(opt); }
function opcion(select, valor){ const o=document.createElement('option'); o.value=valor; o.textContent=valor; select.appendChild(o); }
function rangoDecimales(inicio, fin, paso){ const vals=[]; for(let v=inicio; v<=fin+1e-9; v+=paso){ vals.push((Math.round(v*100)/100).toFixed(2)); } return vals; }
function cargarOpcionesGraduacion(){
  const ids = ['od_esf','oi_esf','od_cil','oi_cil']; ids.forEach(id => { const s=$(id); if(s) s.innerHTML=''; });
  const esfVals = rangoDecimales(-20, 20, 0.25), cilVals = rangoDecimales(-8, 0, 0.25);
  const map = { od_esf:esfVals, oi_esf:esfVals, od_cil:cilVals, oi_cil:cilVals };
  Object.entries(map).forEach(([id,vals])=>{ const s=$(id); if(!s) return; agregarPlaceholder(s, id.includes('esf')?'ESF': 'CIL'); vals.forEach(v=> opcion(s, v)); });
}

/* ===== Validación EJE si hay CIL ≠ 0 ===== */
function styleEje(inp, ok){ if(!inp) return; inp.style.borderColor = ok? '#e5e7eb' : '#ef4444'; }
function checkEjeRequerido(selCil, inpEje){
  const cil = parseFloat(selCil?.value || ''), eje = parseInt(inpEje?.value || '',10);
  const requerido = !isNaN(cil) && cil!==0; let ok = true; if(requerido){ ok = (eje>=0 && eje<=180); }
  styleEje(inpEje, ok); return !requerido || ok;
}
function configurarValidacionesEje(){
  [['od_cil','od_eje'], ['oi_cil','oi_eje']].forEach(([idC,idE])=>{
    const sel=$(idC), inp=$(idE); if(!sel || !inp) return;
    const h = ()=> checkEjeRequerido(sel, inp);
    sel.addEventListener('change', h);
    inp.addEventListener('input', ()=>{ inp.value = inp.value.replace(/\D+/g,'').slice(0,3); h(); });
  });
}
function validarEjesRequeridos(){
  const ok1 = checkEjeRequerido($('od_cil'), $('od_eje')), ok2 = checkEjeRequerido($('oi_cil'), $('oi_eje'));
  if(!(ok1 && ok2) && window.Swal){
    Swal.fire({icon:'warning', title:'Revisá los EJE', text:'Si hay CIL distinto de 0, el EJE debe estar entre 0 y 180.', timer:2500, showConfirmButton:false, toast:true, position:'top-end'});
  }
  return ok1 && ok2;
}

/* ===== Impresión / Limpieza ===== */
function buildPrintArea(){ try{ (window.__buildPrintArea||(()=>{}))(); }catch{} setTimeout(()=>window.print(),0); }
function limpiarFormulario(){ const form=$('formulario'); if(!form) return; form.reset(); cargarFechaHoy(); const gal=$('galeria-fotos'); if(gal) gal.innerHTML=''; recalcularFechaRetiro(); }

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
  cargarFechaHoy();
  cargarOpcionesGraduacion();
  configurarValidacionesEje();

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

  const dnp=$('dnp'); if(dnp){ const fmt=(v)=> v.replace(/\D/g,'').slice(0,4).replace(/^(\d{0,2})(\d{0,2}).*$/,(_,a,b)=> b?`${a}/${b}`:a); dnp.addEventListener('input', ()=> dnp.value = fmt(dnp.value)); }

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
