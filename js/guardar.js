// js/guardar.js
import { API_URL, withParams, apiGet } from "./api.js";

// Apps Script que genera el PDF + Telegram (dejalo como lo tenés)
const PACK_URL = "https://script.google.com/macros/s/AKfycbyAc51qga-xnN3319jcVmAWwz7NTlNH-Lht3IwRIt8PT0MAy_ZKpcGJiohQZIFPfIONsA/exec";

/* ===== Helpers ===== */
const $ = (id) => document.getElementById(id);
const V = (id) => (document.getElementById(id)?.value ?? "").toString().trim();
const U = (v) => (v ?? "").toString().trim().toUpperCase();

function entregaTxt() {
  const r = document.querySelector("input[name='entrega']:checked");
  return r?.value === "3" ? "URGENTE" : r?.value === "15" ? "LABORATORIO" : "NORMAL";
}

async function prepararImpresion() {
  try { if (typeof window.__buildPrintArea === "function") window.__buildPrintArea(); } catch {}
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
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
export async function guardarTrabajo() {
  const spinner = $("spinner");
  const msgEl = $("mensaje");
  const setMsg = (t, c="inherit") => { if (msgEl) { msgEl.textContent = t; msgEl.style.color = c; } };

  try {
    if (spinner) spinner.style.display = "block";
    setMsg("");

    // Validaciones básicas
    if (!V("numero_trabajo")) throw new Error("Ingresá el número de trabajo");
    if (!V("dni"))            throw new Error("Ingresá el DNI");
    if (!V("nombre"))         throw new Error("Ingresá el nombre");

    // 1) Guardar en la planilla (POST x-www-form-urlencoded)
const formEl = document.getElementById("formulario");
const body = new URLSearchParams(new FormData(formEl));

// ✅ Agregar manualmente campos que estén fuera del <form>
body.set("numero_trabajo", document.getElementById("numero_trabajo")?.value || "");

// (opcional) si querés asegurarte:
body.set("dni",    document.getElementById("dni")?.value || body.get("dni") || "");
body.set("nombre", document.getElementById("nombre")?.value || body.get("nombre") || "");

// Hacemos el POST y verificamos el JSON {ok:true}
const postRes = await fetch(API_URL, { method: "POST", body });
const postRaw = await postRes.text();
if (!postRes.ok) throw new Error(postRaw || "Error HTTP al guardar en la planilla");

let postJson = null; 
try { postJson = JSON.parse(postRaw); } catch {}
if (!postJson?.ok) {
  const msg = postJson?.error || "La planilla no confirmó el guardado";
  throw new Error(msg);
}


    // 2) Generar PDF + Telegram (PACK_URL)
    const payload = {
      numero_trabajo: V("numero_trabajo"),
      dni: V("dni"),
      nombre: U(V("nombre")),
      resumen: resumenPack(),
      imagenesBase64: fotosBase64()
    };

    let packUrl = "";
    {
      const packRes = await fetch(PACK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: new URLSearchParams({ genPack: "1", payload: JSON.stringify(payload) })
      });

      const raw = await packRes.text();
      if (!packRes.ok) throw new Error(`Error PACK (${packRes.status})`);

      let j; try { j = JSON.parse(raw); } catch { j = null; }
      if (!j?.ok) throw new Error("No se pudo crear/enviar el PDF");
      packUrl = j.url || j.pdf || "";
    }

    // 2.b) Guardar packUrl en hidden (opcional)
    const hidden = $("pack_url");
    if (hidden) hidden.value = packUrl;

    // 2.c) Actualizar columna PDF por número de trabajo (setPdf en API_URL)
    try {
      const n = V("numero_trabajo");
      if (n && packUrl) {
        const setUrl = withParams(API_URL, { setPdf: 1, numero: n, url: packUrl });
        await apiGet(setUrl);
      }
    } catch {}

    // 3) Imprimir
    if (window.Swal) {
      const r = await Swal.fire({
        title: "Guardado y PDF enviado",
        text: "¿Imprimir ahora?",
        icon: "success",
        showCancelButton: true,
        confirmButtonText: "Imprimir",
        cancelButtonText: "Cerrar"
      });
      if (r.isConfirmed) {
        await prepararImpresion();
        window.print();
      }
    } else {
      if (confirm("Guardado y PDF enviado.\n¿Imprimir ahora?")) {
        await prepararImpresion();
        window.print();
      }
    }

    setMsg("✅ Guardado correctamente", "green");
  } catch (err) {
    console.error(err);
    const m = err?.message || "Error inesperado";
    setMsg("❌ " + m, "red");
    if (window.Swal) Swal.fire("Error", m, "error");
  } finally {
    if (spinner) spinner.style.display = "none";
  }
}
