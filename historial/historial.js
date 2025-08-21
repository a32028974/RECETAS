// historial.js
// Importa tu API_URL. Si preferís, podés pegarla a mano aquí.
import { API_URL as BASE } from '../js/api.js';
const API_URL = BASE; // mismo Apps Script que ya usás

// ====== helpers UI ======
const $  = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function setSpin(on){ const sp = $('#spinner'); if (sp) sp.hidden = !on; }
function setStatus(msg){ const el = $('#status'); if (el) el.innerHTML = msg || ''; }
function showEmpty(on){ const el = $('#empty'); if (el) el.hidden = !on; }

// ====== estado ======
let ALL_ROWS = [];     // crudo del server
let FILTERED = [];     // con filtros cliente
const PAGE_SIZE = 50;
let page = 1;

// ====== render ======
function renderPage(){
  const tbody = $('#tbody');
  tbody.innerHTML = '';

  if (!FILTERED.length){
    showEmpty(false); // mostramos cartel
    $('#pager').hidden = true;
    $('#pageInfo').textContent = '';
    return;
  }
  showEmpty(true);

  const totalPages = Math.max(1, Math.ceil(FILTERED.length / PAGE_SIZE));
  page = Math.min(Math.max(1, page), totalPages);

  const start = (page-1)*PAGE_SIZE;
  const slice = FILTERED.slice(start, start + PAGE_SIZE);

  const frag = document.createDocumentFragment();
  slice.forEach(r=>{
    const pdf = r.pdf ? `<a href="${r.pdf}" target="_blank" rel="noopener">Abrir PDF</a>` : '<span style="opacity:.6">—</span>';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.numero ?? ''}</td>
      <td>${r.fecha ?? ''}</td>
      <td>${r.nombre ?? ''}</td>
      <td>${r.dni ?? ''}</td>
      <td>${r.telefono ?? ''}</td>
      <td>${pdf}</td>
      <td class="row" style="gap:6px">
        <button class="btn-secondary" ${r.pdf?'':'disabled'} data-act="open" data-pdf="${r.pdf||''}">Abrir</button>
        <button class="btn-secondary" ${r.pdf?'':'disabled'} data-act="print" data-pdf="${r.pdf||''}">Imprimir</button>
        <button class="btn-secondary" ${r.pdf?'':'disabled'} data-act="copy" data-pdf="${r.pdf||''}">Copiar link</button>
      </td>
    `;
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);

  // pager
  $('#pager').hidden = (totalPages <= 1);
  $('#pageInfo').textContent = `Página ${page} de ${totalPages} — ${FILTERED.length} resultado${FILTERED.length!==1?'s':''}`;

  // acciones por fila
  tbody.querySelectorAll('button[data-act]').forEach(btn=>{
    btn.addEventListener('click', (ev)=>{
      const pdf = btn.getAttribute('data-pdf');
      const act = btn.getAttribute('data-act');
      if (!pdf) return;

      if (act==='open'){
        window.open(pdf, '_blank', 'noopener');
      } else if (act==='print'){
        const w = window.open(pdf, '_blank', 'noopener');
        if (!w) return;
        const tryPrint = () => { try { w.focus(); w.print(); } catch(_){} };
        w.onload = tryPrint;
        // fallback por si onload no dispara
        setTimeout(tryPrint, 1200);
      } else if (act==='copy'){
        navigator.clipboard.writeText(pdf).then(()=>{
          if (window.Swal) Swal.fire({toast:true, position:'top', timer:1200, showConfirmButton:false, icon:'success', title:'Link copiado'});
        });
      }
    });
  });
}

// ====== filtros cliente ======
function applyFilters(){
  const pdfOnly = $('#pdfOnly').checked;

  FILTERED = ALL_ROWS.filter(r=>{
    if (pdfOnly && !r.pdf) return false;
    return true;
  });

  page = 1;
  renderPage();
}

// ====== buscar al servidor ======
async function buscar(){
  const q = $('#q').value.trim();
  if (!q){
    setStatus('Escribí algo para buscar…');
    ALL_ROWS = [];
    applyFilters();
    return;
  }

  setSpin(true);
  setStatus('');
  try{
    const url = `${API_URL}?buscar=1&q=${encodeURIComponent(q)}&limit=500`;
    const res = await fetch(url, { method:'GET' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();

    const rows = Array.isArray(json?.rows) ? json.rows : [];
    ALL_ROWS = rows.map(r=>({
      numero: r.numero || '',
      fecha:  r.fecha || '',
      nombre: r.nombre || '',
      dni:    r.dni || '',
      telefono: r.telefono || '',
      pdf:    r.pdf || ''
    }));

    const updated = json?.updatedAt ? ` · Actualizado: ${json.updatedAt}` : '';
    setStatus(`<b>${ALL_ROWS.length}</b> resultado${ALL_ROWS.length!==1?'s':''}${updated}`);
    applyFilters();

  }catch(err){
    console.error(err);
    setStatus('<span style="color:#d33">Error al buscar</span>');
    ALL_ROWS = [];
    applyFilters();
  }finally{
    setSpin(false);
  }
}

// ====== eventos ======
function attach(){
  $('#btnBuscar')?.addEventListener('click', buscar);
  $('#btnLimpiar')?.addEventListener('click', ()=>{
    $('#q').value = '';
    setStatus('');
    ALL_ROWS = [];
    applyFilters();
  });
  $('#q')?.addEventListener('keydown', (e)=>{ if (e.key === 'Enter') buscar(); });

  $('#pdfOnly')?.addEventListener('change', applyFilters);

  $('#prev')?.addEventListener('click', ()=>{ page--; renderPage(); });
  $('#next')?.addEventListener('click', ()=>{ page++; renderPage(); });
}

attach();

// Búsqueda inicial opcional si viene ?q= en la URL
const params = new URLSearchParams(location.search);
if (params.get('q')) {
  $('#q').value = params.get('q');
  buscar();
}
