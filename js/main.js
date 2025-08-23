// main.js – Consolidado y funcional (mockup listo)
// Orquesta fechas, entrega, DNI, armazón, visión segmentada, combos OD/OI,
// totales, cámara/galería, imprimir/limpiar/guardar y Nº de trabajo.

import { cargarFechaHoy } from './fechaHoy.js';
import { buscarNombrePorDNI } from './buscarNombre.js';
import { buscarArmazonPorNumero } from './buscarArmazon.js';
import { configurarCalculoPrecios } from './calculos.js';
import { guardarTrabajo } from './guardar.js';
import { cargarCristales } from './sugerencias.js';
import { initPhotoPack } from './fotoPack.js';

/* ========= Helpers DOM ========= */
const $  = (id) => document.getElementById(id);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function lockForm(){ const sp = $("spinner"); if (sp) sp.style.display = 'flex'; }
function unlockForm(){ const sp = $("spinner"); if (sp) sp.style.display = 'none'; }

/* ========= Fechas ========= */
function parseFechaDDMMYY(str){
  if(!str) return new Date();
  const [d,m,a] = str.split('/');
  let y = parseInt(a,10); if(a?.length===2) y = 2000 + y;
  return new Date(y, parseInt(m,10)-1, parseInt(d,10));
}
function fmtISO(d){ const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const da=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${da}`; }
function sumarDias(base, dias){ const d=new Date(base.getTime()); d.setDate(d.getDate() + (parseInt(dias,10)||0)); return d; }
function recalcularFechaRetiro(){
  const enc = $('fecha'); const out = $('fecha_retira');
  const radio = document.querySelector("input[name='entrega']:checked");
  if(!enc || !out) return;
  const base = parseFechaDDMMYY(enc.value);
  const dias = radio?.value ? parseInt(radio.value,10) : 7;
  out.value = fmtISO(sumarDias(base, dias));
}

/* ========= Nº de trabajo desde teléfono ========= */
function generarNumeroTrabajoDesdeTelefono(){
  const tel = $('telefono'); const out = $('numero_trabajo');
  if(!tel || !out) return;
  const dig = (tel.value || '').replace(/\D+/g,'');
  if(dig.length < 4){ out.value=''; return; }
  const ult4 = dig.slice(-4);
  const now = new Date();
  const anio = String(now.getFullYear()).slice(-1);
  const mes  = String(now.getMonth()+1).padStart(2,'0');
  const dia  = String(now.getDate()).padStart(2,'0');
  const hora = String(now.getHours()).padStart(2,'0');
  out.value = `${ult4}${dia}${mes}${hora}${anio}`;
}

/* ========= Graduaciones (combos) ========= */
function agregarPlaceholder(select, texto){ const opt=document.createElement('option'); opt.value=''; opt.textContent=texto; select.appendChild(opt); }
function opcion(select, valor){ const o=document.createElement('option'); o.value=valor; o.textContent=valor; select.appendChild(o); }
function rangoDecimales(inicio, fin, paso){ const vals=[]; for(let v=inicio; v<=fin+1e-9; v+=paso){ vals.push((Math.round(v*100)/100).toFixed(2)); } return vals; }
function cargarOpcionesGraduacion(){
  const ids = ['od_esf','oi_esf','od_cil','oi_cil'];
  ids.forEach(id => { const s=$(id); if(s) s.innerHTML=''; });
  const esfVals = [...rangoDecimales(-20, 20, 0.25)];
  const cilVals = [...rangoDecimales(-8, 0, 0.25)]; // cil suele ser 0 o negativo
  const map = { od_esf:esfVals, oi_esf:esfVals, od_cil:cilVals, oi_cil:cilVals };
  Object.entries(map).forEach(([id,vals])=>{
    const s=$(id); if(!s) return;
    agregarPlaceholder(s, id.includes('esf')?'ESF': 'CIL');
    vals.forEach(v=> opcion(s, v));
  });
}

/* ========= Validaciones de EJE ========= */
function styleEje(inp, ok){ if(!inp) return; inp.style.borderColor = ok? '#CFD6E4' : '#ef4444'; }
function checkEjeRequerido(selCil, inpEje){
  const cil = parseFloat(selCil?.value || '');
  const eje = parseInt(inpEje?.value || '',10);
  const requerido = !isNaN(cil) && cil!==0; // solo si hay CIL distinto de 0
  let ok = true;
  if(requerido){ ok = (eje>=0 && eje<=180); }
  styleEje(inpEje, ok);
  return !requerido || ok;
}
function configurarValidacionesEje(){
  const pairs = [ ['od_cil','od_eje'], ['oi_cil','oi_eje'] ];
  for(const [idC, idE] of pairs){
    const sel = $(idC); const inp = $(idE);
    if(!sel || !inp) continue;
    const h = ()=> checkEjeRequerido(sel, inp);
    sel.addEventListener('change', h);
    inp.addEventListener('input', ()=>{ inp.value = inp.value.replace(/\D+/g,'').slice(0,3); h(); });
  }
}
function validarEjesRequeridos(){
  const ok1 = checkEjeRequerido($('od_cil'), $('od_eje'));
  const ok2 = checkEjeRequerido($('oi_cil'), $('oi_eje'));
  if(!(ok1 && ok2)){
    if(window.Swal){ Swal.fire({icon:'warning', title:'Revisá los EJE', text:'Si hay CIL distinto de 0, el EJE debe estar entre 0 y 180.', timer:2500, showConfirmButton:false, toast:true, position:'top-end'}); }
  }
  return ok1 && ok2;
}

/* ========= Impresión y limpieza ========= */
function buildPrintArea(){ try{ (window.__buildPrintArea||(()=>{}))(); }catch{} setTimeout(()=>window.print(),0); }
function limpiarFormulario(){ const form=$('formulario'); if(!form) return; form.reset(); cargarFechaHoy(); if(Array.isArray(window.__FOTOS)) window.__FOTOS=[]; const gal=document.getElementById('galeria-fotos'); if(gal) gal.innerHTML=''; recalcularFechaRetiro(); }

/* ========= Visión segmentada ========= */
function initSegmentedVision(){
  const segBtns = $$('.seg-btn'); const inputDesc = $('descripcion');
  if(!segBtns.length || !inputDesc) return;
  const selectSeg = (btn)=>{ segBtns.forEach(b=>b.classList.remove('active')); btn.classList.add('active'); inputDesc.value = btn.dataset.value || btn.textContent.trim(); };
  segBtns.forEach(b => b.addEventListener('click', ()=> selectSeg(b)));
  // estado inicial si ya había valor
  const initV = (inputDesc.value||'').trim(); if(initV){ const found = segBtns.find(b => (b.dataset.value||b.textContent.trim())===initV); if(found) selectSeg(found); }
}

/* ========= Init ========= */
document.addEventListener('DOMContentLoaded', async () => {
  // Base
  cargarFechaHoy();
  cargarOpcionesGraduacion();
  configurarValidacionesEje();
  configurarCalculoPrecios();
  await cargarCristales();
  initPhotoPack();
  initSegmentedVision();

  // Entrega → recalcula fecha estimada
  $$("input[name='entrega']").forEach(r => r.addEventListener('change', recalcularFechaRetiro));
  const fechaEnc = $('fecha'); if(fechaEnc) fechaEnc.addEventListener('change', recalcularFechaRetiro);
  recalcularFechaRetiro();

  // Teléfono → Nº de trabajo
  const tel = $('telefono'); if(tel){ tel.addEventListener('blur', generarNumeroTrabajoDesdeTelefono); tel.addEventListener('change', generarNumeroTrabajoDesdeTelefono); }

  // DNI → nombre/teléfono
  const dni = $('dni'), nombre=$('nombre'), telefono=$('telefono'), indi=$('dni-loading');
  if(dni){ const h=()=> buscarNombrePorDNI(dni, nombre, telefono, indi); dni.addEventListener('change', h); dni.addEventListener('blur', h); }

  // Armazón → detalle/precio
  const nAr=$('numero_armazon'), detAr=$('armazon_detalle'), prAr=$('precio_armazon');
  if(nAr){ nAr.addEventListener('input', ()=>{ nAr.value = nAr.value.replace(/\D/g,'').slice(0,7); });
    const h=()=> buscarArmazonPorNumero(nAr, detAr, prAr, $('spinner'));
    nAr.addEventListener('blur', h); nAr.addEventListener('change', h); }

  // DNP formato 12/34
  const dnp=$('dnp'); if(dnp){ const fmt=(v)=> v.replace(/\D/g,'').slice(0,4).replace(/^(\d{0,2})(\d{0,2}).*$/, (_,a,b)=> b?`${a}/${b}`:a); dnp.addEventListener('input', ()=> dnp.value = fmt(dnp.value)); }

  // Acciones inferiores
  const btnImp=$('btn-imprimir'); if(btnImp) btnImp.addEventListener('click', buildPrintArea);
  const btnClr=$('btn-limpiar'); if(btnClr) btnClr.addEventListener('click', limpiarFormulario);

  // Guardar
  const form=$('formulario');
  if(form){ form.addEventListener('submit', async (e)=>{ e.preventDefault(); if(!validarEjesRequeridos()) return; try{ lockForm(); await guardarTrabajo(); } finally { unlockForm(); } }); }
});

export { generarNumeroTrabajoDesdeTelefono };
