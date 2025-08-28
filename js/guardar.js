// js/guardar.js
import { API_URL, withParams, apiGet } from "./api.js";

// Apps Script que genera el PDF + Telegram (el tuyo)
const PACK_URL = "https://script.google.com/macros/s/AKfycbyAc51qga-xnN3319jcVmAWwz7NTlNH-Lht3IwRIt8PT0MAy_ZKpcGJiohQZIFPfIONsA/exec";

/* ===== Helpers ===== */
const $ = (id) => document.getElementById(id);
const V = (id) => (document.getElementById(id)?.value ?? "").toString().trim();
const U = (v) => (v ?? "").toString().trim().toUpperCase();

function entregaTxt() {
  const r = document.querySelector("input[name='entrega']:checked");
  return r?.value === "3" ? "URGENTE" : r?.value === "15" ? "LABORATORIO" : "NORMAL";
}
function fotosBase64() {
  const a = Array.isArray(window.__FOTOS) ? window.__FOTOS : [];
  return a.map(d => (d.split(",")[1] || "").trim()).filter(Boolean);
}
function resumenPack() {
  const money = (v) => (v ? `$ ${v}` : "");
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
    "DNP (OD/OI)": V("dnp"),
    "ADD": V("add"),
    "TOTAL": money(V("total")),
    "SEÑA": money(V("sena")),
    "SALDO": money(V("saldo")),
    "Vendedor": V("vendedor"),
    "Forma de pago": V("forma_pago"),
    "Entrega": entregaTxt()
  };
}

/* ===== Flujo principal ===== */
// 👉 acepta { progress } y marca cada paso
export async function guardarTrabajo({ progress } = {}) {
  const spinner = $("spinner");
  const setStep = (label, status='done') => { try { progress?.mark?.(label, status); } catch {} };

  try {
    spinner && (spinner.style.display = "block");

    // Validaciones
    setStep('Validando datos', 'run');
    if (!V("numero_trabajo")) throw new Error("Ingresá el número de trabajo");
    if (!V("dni"))            throw new Error("Ingresá el DNI");
    if (!V("nombre"))         throw new Error("Ingresá el nombre");
    setStep('Validando datos', 'done');

    // 1) Guardar en planilla
    setStep('Guardando en planilla', 'run');
    const formEl = $("formulario");
    const body = new URLSearchParams(new FormData(formEl));
    const res = await fetch(API_URL, { method: "POST", body });
    const rawPost = await res.text();
    if (!res.ok) throw new Error(rawPost || "Error al guardar en la planilla");
    setStep('Guardando en planilla', 'done');

    // 2) Generar PDF
    setStep('Generando PDF', 'run');
    const payload = {
      numero_trabajo: V("numero_trabajo"),
      dni: V("dni"),
      nombre: U(V("nombre")),
      resumen: resumenPack(),
      imagenesBase64: fotosBase64()
    };

    const packRes = await fetch(PACK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams({ genPack: "1", payload: JSON.stringify(payload) })
    });
    const raw = await packRes.text();
    if (!packRes.ok) throw new Error(`Error PACK (${packRes.status})`);
    let j; try { j = JSON.parse(raw); } catch { j = null; }
    if (!j?.ok) throw new Error("No se pudo crear/enviar el PDF");
    const packUrl = j.url || j.pdf || "";
    setStep('Generando PDF', 'done');

    // 2.b) Guardar link del PDF en hidden
    const hidden = $("pack_url"); if (hidden) hidden.value = packUrl;

    // 2.c) Actualizar columna PDF
    if (packUrl) {
      setStep('Guardando link del PDF', 'run');
      try {
        const setUrl = withParams(API_URL, { setPdf: 1, numero: V("numero_trabajo"), url: packUrl });
        await apiGet(setUrl);
      } catch {}
      setStep('Guardando link del PDF', 'done');
    }

    // 3) (Opcional) Enviando por Telegram ya lo hizo el PACK. Lo marcamos igual.
    setStep('Enviando por Telegram', 'done');
    setStep('Listo', 'done');

    // Cerrar overlay ANTES del diálogo (sensación de “no colgado”)
    try { progress?.complete?.(); } catch {}

    // Confirmar impresión
    if (window.Swal) {
      const r = await Swal.fire({
        title: "Guardado y PDF enviado",
        text: "¿Imprimir ahora?",
        icon: "success",
        showCancelButton: true,
        confirmButtonText: "Imprimir",
        cancelButtonText: "Cerrar"
      });
      if (r.isConfirmed) window.print();
    } else {
      if (confirm("Guardado y PDF enviado.\n¿Imprimir ahora?")) window.print();
    }

  } catch (err) {
    try { progress?.fail?.(err?.message || 'Error al guardar'); } catch {}
    if (window.Swal) Swal.fire("Error", err?.message || "Error inesperado", "error");
    throw err;
  } finally {
    spinner && (spinner.style.display = "none");
  }
}
