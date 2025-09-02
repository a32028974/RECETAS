// sugerencias.js
import { API_URL } from './api.js';

export async function cargarCristales(datalistId = 'lista-cristales') {
  const dl    = document.getElementById(datalistId);
  const input = document.getElementById('cristal');
  if (!dl || !input) return;

  try {
    const res  = await fetch(`${API_URL}?listaCristales=1`);
    const data = await res.json();

    if (data && data.ok && Array.isArray(data.items)) {
      dl.innerHTML = '';
      data.items.slice(0, 100).forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        dl.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Error cargando lista de cristales:', err);
  }
}
