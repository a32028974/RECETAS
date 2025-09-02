// /historial/historial.js — v Hist→Form
import { API_URL } from './api.js';

const $  = (sel) => document.querySelector(sel);

function setSpin(on){ const sp = $('#hist-spinner'); if (sp) sp.hidden = !on; }
function setStatus(msg){ const el = $('#hist-status'); if (el) el.innerHTML = msg || ''; }

function renderRows(rows){
  const tbody = $('#hist-body');
  const empty = $('#hist-empty');
  tbody.innerHTML = '';
  if (!rows || !rows.length){
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;

  const frag = document.createDocumentFragment();
  rows.forEach(r=>{
    const tr = document.createElement('tr');
    tr.dataset.numero = r.numero || '';
    const pdf = r.pdf ? `<a href="${r.pdf}" target="_blank" rel="noopener">Abrir PDF</a>` : '<span style="opacity:.6">—</span>';
    tr.innerHTML = `
      <td>${r.numero ?? ''}</td>
      <td>${r.fecha ?? ''}</td>
      <td>${r.nombre ?? ''}</td>
      <td>${r.dni ?? ''}</td>
      <td>${r.telefono ?? ''}</td>
      <td>${pdf}</td>
    `;
    // 👉 click → ir al form con ?n=<numero>
    tr.addEventListener('click', ()=>{
      const n = tr.dataset.numero || '';
      if (n) window.location.href = `../index.html?n=${encodeURIComponent(n)}`;
    });
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);
}

async function buscar(){
  const qraw = $('#hist-q').value.trim();
  setStatus('');
  setSpin(true);
  try{
    const url = `${API_URL}?histBuscar=1&q=${encodeURIComponent(qraw)}&limit=100`; // ← usa histBuscar
    const res = await fetch(url, { method:'GET' });
    if (!res.ok) throw new Error('HTTP '+res.status);
    const rows = await res.json(); // ← devuelve array directo
    renderRows(rows);
    setStatus(rows.length ? `<b>${rows.length}</b> resultado(s)` : 'Sin resultados');
  }catch(e){
    console.error('historial buscar error:', e);
    setStatus('<span style="color:#d33">Error al buscar</span>');
    renderRows([]);
  }finally{
    setSpin(false);
  }
}

function clear(){
  $('#hist-q').value = '';
  renderRows([]);
  setStatus('');
}

(function attach(){
  $('#hist-search')?.addEventListener('click', buscar);
  $('#hist-clear')?.addEventListener('click', clear);
  $('#hist-q')?.addEventListener('keydown', e=>{ if (e.key === 'Enter') buscar(); });
})();
