// main.js – versión consolidada según mockup
// Integra: fechas, entrega, DNI→Nombre/Teléfono, Armazón, Totales, Fotos y Guardado
// No rompe tus módulos existentes. Sólo orquesta eventos y pequeñas validaciones.

import { cargarFechaHoy } from './fechaHoy.js';
import { buscarNombrePorDNI } from './buscarNombre.js';
import { buscarArmazonPorNumero } from './buscarArmazon.js';
import { configurarCalculoPrecios } from './calculos.js';
import { guardarTrabajo } from './guardar.js';
import { cargarCristales } from './sugerencias.js';
import { initPhotoPack } from './fotoPack.js';

/********************
 * Utilidades de UI
 ********************/
const $  = (id) => document.getElementById(id);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function lockForm(){ const sp = $("spinner"); if (sp) sp.style.display = 'flex'; }
function unlockForm(){ const sp = $("spinner"); if (sp) sp.style.display = 'none'; }

/********************
 * Fecha de retiro (estimada)
 ********************/
function sumarDias(fecha, dias){
  const d = new Date(fecha.getTime());
  d.setDate(d.getDate() + (parseInt(dias,10) || 0));
  return d;
}
function fmtISO(d){ // para <input type="date">
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function recalcularFechaRetiro(){
  const encarga = $("fecha"); // dd/mm/aa en tu UI
  const retira  = $("fecha_retira"); // input type=date
  if(!encarga || !retira) return;

  const radios = document.querySelector("input[name='entrega']:checked");
  const dias = radios?.value ? parseInt(radios.value,10) : 7; // 7=Stock, 3=Urgente, 15=Lab

  // La fecha que encarga NO debe cambiar automáticamente; tomamos su valor actual
  // Parseo dd/mm/aa
  const [dd,mm,yy] = (encarga.value || '').split('/');
  const base = new Date(`20${yy}-${mm}-${dd}T00:00:00`);
  if(isNaN(base.getTime())) return;

  const estimada = sumarDias(base, dias);
  retira.value = fmtISO(estimada);
}

/********************
 * Número de trabajo por teléfono
 ********************/
function generarNumeroTrabajoDesdeTelefono(){
  const telInput = $("telefono");
  const out = $("numero_trabajo");
  if(!telInput || !out) return;

  const dig = (telInput.value || '').replace(/\D+/g,'');
  if(dig.length < 4){ out.value = ''; return; }
  const ult4 = dig.slice(-4);
  const now  = new Date();
  const anio = now.getFullYear().toString().slice(-1);
  const mes  = String(now.getMonth()+1).padStart(2,'0');
  const dia  = String(now.getDate()).padStart(2,'0');
  const hora = String(now.getHours()).padStart(2,'0');
  out.value = `${ult4}${dia}${mes}${hora}${anio}`;
}

/********************
 * Impresión simple (área), limpieza y helpers
 ********************/
function buildPrintArea(){
  // Si ya tenés uno más completo en otro módulo, este es el mínimo seguro
  window.print();
}
function limpiarFormulario(){
  const form = $("formulario");
  if(!form) return;
  form.reset();
  // Mantener fecha de hoy en "Fecha que encarga"
  cargarFechaHoy();
  // Limpiar previews de fotos en memoria si existieran
  if(Array.isArray(window.__FOTOS)) window.__FOTOS = [];
  const gal = document.querySelector('.galeria');
  if(gal) gal.innerHTML = '';
}

/********************
 * Inicio
 ********************/
document.addEventListener('DOMContentLoaded', async () => {
  // 1) Base visual (hoy + lista cristales + totales)
  cargarFechaHoy();
  await cargarCristales();
  configurarCalculoPrecios();

  // 2) Cámara / Galería
  initPhotoPack();

  // 3) Eventos de entrega → fecha estimada
  $$("input[name='entrega']").forEach(r => r.addEventListener('change', recalcularFechaRetiro));
  const fechaEncarga = $("fecha");
  if (fechaEncarga) fechaEncarga.addEventListener('change', recalcularFechaRetiro);
  recalcularFechaRetiro(); // cálculo inicial

  // 4) Teléfono → N° trabajo automático (al salir del campo o cambiar)
  const tel = $("telefono");
  if (tel){
    tel.addEventListener('blur', generarNumeroTrabajoDesdeTelefono);
    tel.addEventListener('change', generarNumeroTrabajoDesdeTelefono);
  }

  // 5) DNI → (Nombre, Teléfono) con indicador inline
  const dni = $("dni"), nombre = $("nombre"), telefono = $("telefono"), load = $("dni-loading");
  if (dni){
    const handler = () => buscarNombrePorDNI(dni, nombre, telefono, load);
    dni.addEventListener('change', handler);
    dni.addEventListener('blur', handler);
  }

  // 6) N° Armazón → detalle y precio + estado visual
  const nAr = $("numero_armazon"), detAr = $("armazon_detalle"), precioAr = $("precio_armazon");
  if (nAr){
    const h = () => buscarArmazonPorNumero(nAr, detAr, precioAr, $("spinner"));
    nAr.addEventListener('change', h);
    nAr.addEventListener('blur', h);
  }

  // 7) Botones de fotos y PDF pack (los maneja fotoPack/generar desde guardar.js)
  const btnGen = $("btn-generar-pack");
  if (btnGen){
    btnGen.addEventListener('click', () => {
      // La generación de PDF está resuelta en guardar.js con el flujo nuevo.
      // Aquí sólo mostramos un recordatorio si falta N° de trabajo.
      const n = $("numero_trabajo")?.value || '';
      if(!n) alert('Ingresá teléfono para autogenerar el número de trabajo antes de generar el PDF.');
    });
  }

  // 8) Acciones inferiores
  const btnImp = $("btn-imprimir");
  if (btnImp) btnImp.addEventListener('click', buildPrintArea);
  const btnLimp = $("btn-limpiar");
  if (btnLimp) btnLimp.addEventListener('click', limpiarFormulario);

  // 9) Envío/Guardar
  const form = $("formulario");
  if (form){
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      try{
        lockForm();
        await guardarTrabajo();
      } finally {
        unlockForm();
      }
    });
  }
});

// Exporto por si otro módulo quiere reusar la generación del número
export { generarNumeroTrabajoDesdeTelefono };
