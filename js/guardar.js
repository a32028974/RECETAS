// js/guardar.js
import { API_URL } from './api.js';
const PACK_URL = "https://script.google.com/macros/s/AKfycbwt5zXhLvmq8y3F1--b_njEkpOgicI4clWbU1O1wjetVkRGS69tv59bo_tjJ8fHHPiAwQ/exec";

const $ = (id) => document.getElementById(id);
// lector seguro (si no existe el elemento, devuelve "")
const V = (id) => (document.getElementById(id)?.value ?? "").toString().trim();
const U = (v) => (v ?? "").toString().trim().toUpperCase();

function entregaTxt() {
  const r = document.querySelector("input[name='entrega']:checked");
  return r?.value === "3" ? "URGENTE" : r?.value === "15" ? "LABORATORIO" : "NORMAL";
}

// Expuesta para imprimir desde otros módulos
function buildPrintArea() {
  if (typeof window.__buildPrintArea === "function") return window.__buildPrintArea();
}

function fotosBase64(){
  const a = Array.isArray(window.__FOTOS) ? window.__FOTOS : [];
  return a.map(d => (d.split(",")[1] || "").trim()).filter(Boolean);
}
function resumenPack(){
  const money = v => (v ? `$ ${v}` : "");
  return {
    "Fecha": V("fecha"),
    "Retira (estimada)": V("fecha_retira"),
    "N° trabajo": V("numero_trabajo"),
    "DNI": V("dni"),
    "Cliente": V("nombre"),
    "Teléfono": V("telefono"),
    "DR (oculista)": V("dr"),
    "Cristal": `${V("cristal")} ${money(V("precio_cristal"))}`,
    "Armazón": `${V("numero_armazon")} ${V("armazon_detalle")} ${money(V("precio_armazon"))}`,
    "Otro": `${V("otro_concepto")} ${money(V("precio_otro"))}`,
    "OD": `ESF ${V("od_esf")}  |  CIL ${V("od_cil")}  |  EJE ${V("od_eje")}`,
    "OI": `ESF ${V("oi_esf")}  |  CIL ${V("oi_cil")}  |  EJE ${V("oi_eje")}`,
    "ADD": V("add"),
    "TOTAL": money(V("total")),
    "SEÑA": money(V("sena")),
    "SALDO": money(V("saldo")),
    "Vendedor": V("vendedor"),
    "Forma de pago": V("forma_pago"),
    "Entrega": entregaTxt()
  };
}

export async function guardarTrabajo() {
  const spinner = document.getElementById("spinner");
  try {
    if (spinner) spinner.style.display = "block";

    // Validaciones seguras
    if (!V('numero_trabajo')) throw new Error("Ingresá el número de trabajo");
    if (!V('dni'))            throw new Error("Ingresá el DNI");
    if (!V('nombre'))         throw new Error("Ingresá el nombre");

    // 1) Guardar en planilla (tu endpoint actual)
    const formEl = document.getElementById('formulario');
    const body = new URLSearchParams(new FormData(formEl));
    const res = await fetch(API_URL, { method: "POST", body });
    const txt = await res.text();
    if (!res.ok) throw new Error(txt || "Error al guardar");

    // 2) Generar PACK + Telegram (Apps Script)
    const payload = {
      numero_trabajo: V('numero_trabajo'),
      dni: V('dni'),
      nombre: U(V('nombre')),
      resumen: resumenPack(),
      imagenesBase64: fotosBase64()
    };

    const packRes = await fetch(PACK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams({ genPack: "1", payload: JSON.stringify(payload) })
    });

    const raw = await packRes.text();
    let ok=false, packUrl="";
    try { const j = JSON.parse(raw); ok = !!j.ok; packUrl = j.url || ""; } catch { ok=false; }
    if (!ok) throw new Error("No se pudo crear/enviar el PDF (respuesta: " + raw + ")");

    const hidden = document.getElementById('pack_url');
    if (hidden) hidden.value = packUrl;

    // 3) Ofrecer imprimir
    if (window.Swal) {
      await Swal.fire({
        title:"Guardado y PDF enviado",
        text:"¿Imprimir ahora?",
        icon:"success",
        showCancelButton:true,
        confirmButtonText:"Imprimir",
        cancelButtonText:"Cerrar"
      }).then(r=>{ if (r.isConfirmed) { buildPrintArea(); window.print(); } });
    } else {
      if (confirm("Guardado y PDF enviado.\n¿Imprimir ahora?")) { buildPrintArea(); window.print(); }
    }

  } catch (err) {
    console.error(err);
    const msg = (err && err.message) ? err.message : "Error inesperado";
    const p = document.getElementById('mensaje');
    if (p) { p.textContent = "❌ " + msg; p.style.color = "red"; }
    if (window.Swal) Swal.fire("Error", msg, "error");
  } finally {
    if (spinner) spinner.style.display = "none";
  }
}
