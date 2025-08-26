// js/api.js
// 1) ENDPOINT GENERAL (DNI, ARMAZÓN, HISTORIAL, setPdf)
export const API_URL  = "https://script.google.com/macros/s/AKfycbxGOdR-h2Or5GOBA9dORolfupfVnKaeLE0JlbRSRecoNr6dgli_hJkZlHqORF8qkufklA/exec";

// 2) ENDPOINT DE PACK/TELEGRAM (el tuyo que ya funcionaba)
export const PACK_URL = "https://script.google.com/macros/s/AKfycb4yAcS1qga-xnN3319jcVvANwZ7N1MN-Lht13Wi8TiPBTEMAy_2KpcG2Ih0qQZFPIF0lNSA/exec";

// Helpers comunes
export function withParams(base, params = {}) {
  const u = new URL(base);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, v);
  });
  return u.toString();
}

export async function apiGet(url) {
  const r = await fetch(url, { method: 'GET', cache: 'no-store' });
  if (!r.ok) {
    const txt = await r.text().catch(()=> '');
    throw new Error(`HTTP ${r.status} – ${txt.slice(0,200)}`);
  }
  return r.json();
}
