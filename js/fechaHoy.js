// fechaHoy.js
// Pone la fecha de hoy en #fecha con formato dd/mm/aa y la devuelve
export function cargarFechaHoy() {
  const hoy = new Date();
  const dia  = String(hoy.getDate()).padStart(2, '0');
  const mes  = String(hoy.getMonth() + 1).padStart(2, '0');
  const anio = String(hoy.getFullYear()).slice(-2);
  const str  = `${dia}/${mes}/${anio}`;

  const input = document.getElementById("fecha"); // existe en tu index:contentReference[oaicite:3]{index=3}
  if (input) input.value = str;

  return { date: hoy, str };
}
