// js/guardar.js
import { API_URL } from "./api.js";

// Si usás un Apps Script aparte para el pack, dejalo aquí:
const PACK_URL =
  "https://script.google.com/macros/s/AKfycbyAc51qga-xnN3319jcVmAWwz7NTlNH-Lht3IwRIt8PT0MAy_ZKpcGJiohQZIFPfIONsA/exec";

/* ---------- Helpers UI ---------- */
const $ = (id) => document.getElementById(id);
const V = (id) => (document.getElementById(id)?.value ?? "").toString().trim();
const U = (v) => (v ?? "").toString().trim().toUpperCase();

/* Entrega: radios con name="entrega" → texto */
function entregaTxt() {
  const r = document.querySelector("input[name='entrega']:checked");
  return r?.value === "3" ? "URGENTE" : r?.value === "15" ? "LABORATORIO" : "NORMAL";
}

/* Construye el área imprimible (si tu app lo define) y espera 2 RAF para evitar hoja en blanco */
async function prepararImpresion() {
  try {
    if (typeof window.__buildPrintArea === "function") window.__buildPrintArea();
  } catch {}
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}

/* Fotos en base64 (solo la parte después de la coma) si existieran */
function fotosBase64() {
  const a = Array.isArray(window.__FOTOS) ? window.__FOTOS : [];
  return a
    .map((d) => (d.split(",")[1] || "").trim())
    .filter(Boolean);
}

/* Resumen que viaja al generador de PACK (PDF + Telegram) */
function resumenPack() {
  const money = (v) => (v ? `$ ${v}` : "");
  return {
    Fecha: V("fecha"),
    "Retira (estimada)": V("fecha_retira"),
    "N° trabajo": V("numero_trabajo"),
    DNI: V("dni"),
    Cliente: V("nombre"),
    Teléfono: V("telefono"),
    "DR (oculista)": V("dr"),
    Cristal: `${V("cristal")} ${money(V("precio_cristal"))}`,
    "Armazón": `${V("numero_armazon")} ${V("armazon_detalle")} ${money(V("precio_armazon"))}`,
    Otro: `${V("otro_concepto")} ${money(V("precio_otro"))}`,
    OD: `ESF ${V("od_esf")}  |  CIL ${V("od_cil")}  |  EJE ${V("od_eje")}`,
    OI: `ESF ${V("oi_esf")}  |  CIL ${V("oi_cil")}  |  EJE ${V("oi_eje")}`,
    ADD: V("add"),
    TOTAL: money(V("total")),
    SEÑA: money(V("sena")),
    SALDO: money(V("saldo")),
    Vendedor: V("vendedor"),
    "Forma de pago": V("forma_pago"),
    Entrega: entregaTxt(),
  };
}

/* ---------- Flujo principal ---------- */
export async function guardarTrabajo() {
  const spinner = $("spinner");
  const msgEl = $("mensaje");

  const setMsg = (text, color = "inherit") => {
    if (msgEl) {
      msgEl.textContent = text;
      msgEl.style.color = color;
    }
  };

  try {
    if (spinner) spinner.style.display = "block";
    setMsg("");

    /* Validaciones mínimas (coinciden con tus requeridos) */
    if (!V("numero_trabajo")) throw new Error("Ingresá el número de trabajo");
    if (!V("dni")) throw new Error("Ingresá el DNI");
    if (!V("nombre")) throw new Error("Ingresá el nombre");

    /* 1) Guardar en la planilla (POST al Apps Script unificado) */
    const formEl = $("formulario");
    const body = new URLSearchParams(new FormData(formEl));
    const res = await fetch(API_URL, { method: "POST", body });
    const rawPost = await res.text();
    if (!res.ok) throw new Error(rawPost || "Error al guardar en la planilla");

    /* 2) Generar PACK + Telegram en segundo endpoint (si usás PACK_URL aparte) */
    const payload = {
      numero_trabajo: V("numero_trabajo"),
      dni: V("dni"),
      nombre: U(V("nombre")),
      resumen: resumenPack(),
      imagenesBase64: fotosBase64(),
    };

    let packUrl = "";
    try {
      const packRes = await fetch(PACK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: new URLSearchParams({ genPack: "1", payload: JSON.stringify(payload) }),
      });
      const raw = await packRes.text();
      const j = JSON.parse(raw);
      if (!j?.ok) throw new Error(raw);
      packUrl = j.url || "";
    } catch (e) {
      throw new Error("No se pudo crear/enviar el PDF");
    }

    /* Guardar el link en el hidden para que quede en el form */
    const hidden = $("pack_url");
    if (hidden) hidden.value = packUrl;

    /* 2.b) Avisar a la API que setee el PDF en la fila del número de trabajo */
    try {
      const n = V("numero_trabajo");
      if (n && packUrl) {
        await fetch(
          `${API_URL}?setPdf=1&numero=${encodeURIComponent(n)}&url=${encodeURIComponent(packUrl)}`
        );
      }
    } catch {}

    /* 3) Ofrecer imprimir (con timing seguro) */
    if (window.Swal) {
      const r = await Swal.fire({
        title: "Guardado y PDF enviado",
        text: "¿Imprimir ahora?",
        icon: "success",
        showCancelButton: true,
        confirmButtonText: "Imprimir",
        cancelButtonText: "Cerrar",
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
