// /modules/main.js — versión integrada

import { API_URL } from './api.js';                   // ✅ para op=getTrabajo
import { initPhotoPack } from './fotoPack.js';
import { cargarFechaHoy } from './fechaHoy.js';
import { buscarNombrePorDNI } from './buscarNombre.js';
import { buscarArmazonPorNumero } from './buscarArmazon.js';
import { guardarTrabajo } from './guardar.js';
import { obtenerNumeroTrabajoDesdeTelefono } from './numeroTrabajo.js';
import { configurarCalculoPrecios } from './calculos.js';
import { cargarCristales } from './sugerencias.js';

const $ = (id) => document.getElementById(id);

// ======================
// Fecha de Retiro (ETA)
// ======================
function addDays(dateStr, days) {
  // dateStr: dd/MM/yy
  const [dd, mm, yy] = String(dateStr || '').split('/');
  const y = 2000 + parseInt(yy || '0', 10);
  const d = new Date(y, (parseInt(mm,10)-1)||0, parseInt(dd,10)||1);
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + (parseInt(days,10)||0));
  const dd2 = String(d.getDate()).padStart(2,'0');
  const mm2 = String(d.getMonth()+1).padStart(2,'0');
  const yy2 = String(d.getFullYear()).slice(-2);
  return `${dd2}/${mm2}/${yy2}`;
}

function recalcularFechaRetiro() {
  const entregaSel = $('entrega-select');
  const fecha = $('fecha');
  const out = $('fecha_retira');
  if (!entregaSel || !fecha || !out) return;
  const dias = entregaSel.value || '7'; // 7=Stock, 3=Urgente, 15=Lab
  out.value = addDays(fecha.value, dias);
}

// =====================================
// Historial → cargar formulario por Nº
// =====================================
const keyNorm = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

/** Busca dentro del objeto usando varias claves alternativas */
function pick(o, ...alts){
  const keys = Object.keys(o||{});
  const map = {};
  keys.forEach(k => map[keyNorm(k)] = k);
  for (const a of alts){
    const k = map[keyNorm(a)];
    if (k && o[k] != null) return String(o[k]);
  }
  return '';
}

/** Setea valor de input + dispara eventos para recalcular */
function setVal(id, v){
  const el = document.getElementById(id);
  if (!el) return;
  el.value = String(v ?? '');
  el.dispatchEvent(new Event('input',  { bubbles:true }));
  el.dispatchEvent(new Event('change', { bubbles:true }));
}

/** Llena el formulario a partir del objeto devuelto por op=getTrabajo */
function llenarFormulario(obj){
  if (!obj) return;

  setVal('numero_trabajo', pick(obj, 'numero_trabajo','n','sobre','numero','n° trabajo'));
  setVal('fecha',          pick(obj, 'fecha'));
  setVal('fecha_retira',   pick(obj, 'fecha retira','retira','fecha que retira'));

  setVal('dni',            pick(obj, 'dni','documento'));
  setVal('nombre',         pick(obj, 'apellido y nombre','nombre','cliente'));
  setVal('telefono',       pick(obj, 'telefono','tel'));

  setVal('dr',             pick(obj, 'dr','oculista'));

  setVal('cristal',            pick(obj, 'cristal','tipo de cristal'));
  setVal('precio_cristal',     pick(obj, 'precio cristal','$ cristal','precio de cristal'));

  setVal('obra_social',        pick(obj, 'obra social','obra'));
  setVal('importe_obra_social',pick(obj, 'precio obra social','importe obra social','$ obra social','cobertura'));

  setVal('distancia_focal',    pick(obj, 'distancia focal','distancia'));

  setVal('numero_armazon',     pick(obj, 'numero armazon','n° armazon','n armazon','n° ar','codigo','código'));
  setVal('armazon_detalle',    pick(obj, 'detalle armazon','modelo armazon','armazon','modelo de armazon','descripcion','descripción'));
  setVal('precio_armazon',     pick(obj, 'precio armazon','$ armazon','precio de armazon'));

  setVal('otro_concepto',      pick(obj, 'otro concepto','otro'));
  setVal('precio_otro',        pick(obj, 'precio otro','$ otro','precio de otro'));

  setVal('od_esf', pick(obj, 'od esf'));
  setVal('od_cil', pick(obj, 'od cil'));
  setVal('od_eje', pick(obj, 'od eje','od eje (0-180)'));
  setVal('oi_esf', pick(obj, 'oi esf'));
  setVal('oi_cil', pick(obj, 'oi cil'));
  setVal('oi_eje', pick(obj, 'oi eje','oi eje (0-180)'));

  setVal('dnp',  pick(obj, 'dnp','dnp (od/oi)'));
  setVal('add',  pick(obj, 'add'));

  setVal('total', pick(obj, 'total'));
  setVal('sena',  pick(obj, 'seña','sena'));
  setVal('saldo', pick(obj, 'saldo'));

  setVal('vendedor',   pick(obj, 'vendedor','nombre del vendedor'));
  setVal('forma_pago', pick(obj, 'forma de pago','pago'));

  // Entrega (select 7/3/15) a partir de texto
  const entregaTxt = keyNorm(pick(obj,'entrega','tipo de vision','tipo'));
  const sel = document.getElementById('entrega-select');
  if (sel){
    if (entregaTxt.includes('urgente')) sel.value = '3';
    else if (entregaTxt.includes('laboratorio')) sel.value = '15';
    else sel.value = '7';
    sel.dispatchEvent(new Event('change', { bubbles:true }));
  }
}

/** GET a tu Apps Script: op=getTrabajo&n=<numero> */
async function cargarTrabajoPorNumero(n){
  if (!n) return null;
  const url = `${API_URL}?op=getTrabajo&n=${encodeURIComponent(n)}`;
  const res = await fetch(url, { method:'GET' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const j = await res.json();
  if (!j?.ok) throw new Error(j?.error || 'No encontrado');
  return j.row; // objeto con claves = headers en minúsculas
}

// ======================
// App init
// ======================
document.addEventListener('DOMContentLoaded', () => {
  // Cámara + galería
  initPhotoPack();

  // Fechas
  cargarFechaHoy();
  $('entrega-select')?.addEventListener('change', recalcularFechaRetiro);
  $('fecha')?.addEventListener('change', recalcularFechaRetiro);
  recalcularFechaRetiro();

  // Sugerencias de cristales + cálculos automáticos
  cargarCristales();
  configurarCalculoPrecios();

  // Teléfono → Nº de trabajo
  const tel = $('telefono');
  const ntrab = $('numero_trabajo');
  const syncNT = () => { if (ntrab) ntrab.value = obtenerNumeroTrabajoDesdeTelefono(tel?.value || ''); };
  tel?.addEventListener('blur', syncNT);
  tel?.addEventListener('change', syncNT);
  tel?.addEventListener('input', () => { tel.value = tel.value.replace(/[^0-9 +()-]/g,''); });

  // DNI → nombre/teléfono
  const dni=$('dni'), nombre=$('nombre'), indi=$('dni-loading');
  if (dni) {
    const doDNI = async () => {
      await buscarNombrePorDNI(dni, nombre, tel, indi);
      syncNT(); // por si cambia el teléfono desde historial
    };
    dni.addEventListener('blur', doDNI);
    dni.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); doDNI(); } });
    dni.addEventListener('input', ()=>{ dni.value = dni.value.replace(/\D/g,''); });
  }

  // Armazón → detalle + precio
  const nAr=$('numero_armazon'), detAr=$('armazon_detalle'), prAr=$('precio_armazon');
  if (nAr) {
    const doAr = async () => {
      await buscarArmazonPorNumero(nAr, detAr, prAr);
      prAr?.dispatchEvent(new Event('input',  { bubbles:true }));
    };
    nAr.addEventListener('blur', doAr);
    nAr.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); doAr(); } });
    nAr.addEventListener('input', ()=>{ nAr.value = nAr.value.toUpperCase().replace(/\s+/g,'').replace(/[^A-Z0-9\-]/g,''); });
  }

  // Submit del formulario
  const form = $('formulario');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await guardarTrabajo(); // guarda → genera PDF → setPdf → imprime
    } catch (err) {
      console.error(err);
    }
  });

  // Botones extra
  $('btn-limpiar')?.addEventListener('click', () => form?.reset());
  $('btn-imprimir')?.addEventListener('click', () => window.print());

  // ===== Cargar por URL ?n=...
  const params = new URLSearchParams(location.search);
  const n = params.get('n');
  if (n) {
    cargarTrabajoPorNumero(n)
      .then(llenarFormulario)
      .catch(err => console.error('Error cargando trabajo', err));
  }
});
