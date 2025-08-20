// js/fotoPack.js
let stream = null;
const $ = s => document.querySelector(s);

// almacenamiento de fotos en memoria (dataURL)
window.__FOTOS = window.__FOTOS || [];

export function initPhotoPack() {
  const modal       = $("#cam-modal");
  const video       = $("#cam-video");
  const btnOpen     = $("#btn-foto");
  const btnTomar    = $("#cam-tomar");
  const btnUsar     = $("#cam-usar");
  const btnCancelar = $("#cam-cancelar");
  const canvas      = $("#cam-shot");
  const previewWrap = $("#cam-preview");
  const btnCloseX   = $("#cam-close-x");

  if (!modal || !video || !btnOpen || !btnTomar || !btnUsar || !btnCancelar || !canvas || !previewWrap) {
    console.warn("Faltan elementos del modal de cámara.");
    return;
  }

  function stopStream() {
    try { if (video.srcObject) video.srcObject.getTracks().forEach(t => t.stop()); } catch {}
    if (stream) { try { stream.getTracks().forEach(t => t.stop()); } catch {} }
    video.srcObject = null;
    stream = null;
  }
  function closeModal() {
    modal.setAttribute("hidden", "");
    document.body.classList.remove("cam-open");
    stopStream();
    btnUsar.disabled = true;
    previewWrap.style.display = "none";
  }

  async function openCamera() {
    try {
      stopStream();
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      video.srcObject = stream;
      await video.play();
      modal.removeAttribute("hidden");
      document.body.classList.add("cam-open");
      btnUsar.disabled = true;
      previewWrap.style.display = "none";
    } catch (err) {
      console.error("getUserMedia error:", err);
      alert(
        "No se pudo abrir la cámara (" + (err.name || "Error") + ").\n\n" +
        "Probá:\n• Permiso de CÁMARA del sistema para Chrome/Firefox\n" +
        "• Cerrar apps que usen la cámara (WhatsApp/Meet/Zoom)\n" +
        "• Probar en otro navegador"
      );
      // Fallback: cámara nativa
      const file = document.createElement("input");
      file.type = "file";
      file.accept = "image/*";
      file.capture = "environment";
      file.onchange = () => {
        if (file.files && file.files[0]) {
          const imgURL = URL.createObjectURL(file.files[0]);
          const img = new Image();
          img.onload = () => {
            const ctx = canvas.getContext("2d");
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            previewWrap.style.display = "block";
            btnUsar.disabled = false;
            modal.removeAttribute("hidden");
            document.body.classList.add("cam-open");
          };
          img.src = imgURL;
        }
      };
      file.click();
    }
  }

  btnOpen.addEventListener("click", openCamera);
  btnCancelar.addEventListener("click", closeModal);
  if (btnCloseX) btnCloseX.addEventListener("click", closeModal);
  modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });

  btnTomar.addEventListener("click", () => {
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(video, 0, 0, w, h);
    previewWrap.style.display = "block";
    btnUsar.disabled = false;
  });

  btnUsar.addEventListener("click", () => {
    const dataURL = canvas.toDataURL("image/jpeg", 0.85); // comprimida
    // guardar en memoria
    window.__FOTOS.push(dataURL);
    // miniatura en la galería
    const gal = document.querySelector("#galeria-fotos") || document.querySelector(".galeria");
    if (gal) {
      const img = document.createElement("img");
      img.src = dataURL;
      img.className = "thumb";
      gal.appendChild(img);
    }
    closeModal();
  });

  // limpiar galería y memoria cuando se toca "Limpiar"
  const btnLimpiar = document.getElementById("btn-limpiar");
  if (btnLimpiar) {
    btnLimpiar.addEventListener("click", () => {
      window.__FOTOS.length = 0;
      const gal = document.querySelector("#galeria-fotos") || document.querySelector(".galeria");
      if (gal) gal.innerHTML = "";
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hasAttribute("hidden")) closeModal();
  });
}
