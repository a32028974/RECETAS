// numeroTrabajo.js
export function obtenerNumeroTrabajo() {
  const telefonoInput = document.getElementById("fecha");
  const numeroTrabajoInput = document.getElementById("numero_trabajo");

  const telefono = telefonoInput.value.trim();
  if (!telefono || telefono.length < 4) {
    alert("Por favor, ingresá el número de celular antes.");
    return;
  }

  const fecha = new Date();
  const dia = fecha.getDate().toString().padStart(2, '0');
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
  const hora = fecha.getHours().toString().padStart(2, '0');
  const anio = fecha.getFullYear().toString().slice(-1);

  const ultimos4 = telefono.slice(-4);
  const numeroTrabajo = `${ultimos4}${dia}${mes}${hora}${anio}`;

  numeroTrabajoInput.value = numeroTrabajo;
}
