/**
 * Lectura de guías.
 *
 * Tres caminos, porque en patio se usan los tres:
 *  1. Cámara con BarcodeDetector nativo (Chrome en Android): lo más rápido.
 *  2. Cámara con ZXing como respaldo (iPhone y navegadores viejos).
 *  3. Lector físico de anillo o pistola Bluetooth, que se comporta como
 *     teclado. Es lo que más se usa para inducir cientos de guías seguidas.
 */

const FORMATOS = ['code_128', 'code_39', 'qr_code', 'ean_13', 'itf', 'pdf417', 'data_matrix'];
const ZXING_CDN = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';

export function soportaCamaraNativa() {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

async function cargarZXing() {
  if (window.ZXing) return window.ZXing;
  await new Promise((resolver, rechazar) => {
    const s = document.createElement('script');
    s.src = ZXING_CDN;
    s.onload = resolver;
    s.onerror = () => rechazar(new Error('No se pudo cargar el lector de respaldo'));
    document.head.appendChild(s);
  });
  return window.ZXing;
}

/**
 * Enciende la cámara y llama a `alLeer(texto)` cada vez que reconoce un código.
 * Devuelve una función para apagarla.
 */
export async function iniciarCamara(video, alLeer, alError) {
  let flujo;
  try {
    flujo = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 } },
    });
  } catch (e) {
    alError?.(
      e.name === 'NotAllowedError'
        ? 'Falta permiso de cámara. Actívalo en el candado de la barra de direcciones.'
        : 'No se pudo abrir la cámara: ' + e.message,
    );
    return () => {};
  }

  video.srcObject = flujo;
  video.setAttribute('playsinline', '');
  await video.play().catch(() => {});

  let activo = true;
  const apagar = () => {
    activo = false;
    for (const t of flujo.getTracks()) t.stop();
    video.srcObject = null;
  };

  // Antirrebote: un código bajo la cámara se lee muchas veces por segundo.
  let ultima = '';
  let ultimaEn = 0;
  const emitir = (texto) => {
    const ahora = Date.now();
    if (texto === ultima && ahora - ultimaEn < 2500) return;
    ultima = texto;
    ultimaEn = ahora;
    alLeer(texto);
  };

  if (soportaCamaraNativa()) {
    const detector = new window.BarcodeDetector({ formats: FORMATOS });
    const revisar = async () => {
      if (!activo) return;
      try {
        const codigos = await detector.detect(video);
        for (const c of codigos) if (c.rawValue) emitir(c.rawValue);
      } catch {
        /* un cuadro ilegible no es un error: se intenta con el siguiente */
      }
      if (activo) requestAnimationFrame(revisar);
    };
    requestAnimationFrame(revisar);
    return apagar;
  }

  try {
    const ZXing = await cargarZXing();
    const lector = new ZXing.BrowserMultiFormatReader();
    lector.decodeFromStream(flujo, video, (resultado) => {
      if (resultado && activo) emitir(resultado.getText());
    });
    return () => {
      lector.reset();
      apagar();
    };
  } catch (e) {
    alError?.(
      'Este navegador no puede leer códigos con la cámara y no hay señal para ' +
        'cargar el respaldo. Usa el lector Bluetooth o captura la guía a mano.',
    );
    apagar();
    return () => {};
  }
}

/**
 * Escucha un lector físico: teclea rápido y termina con Enter. Se distingue de
 * una persona escribiendo por la velocidad entre teclas.
 */
export function escucharLectorFisico(alLeer, { msEntreTeclas = 40, minimo = 4 } = {}) {
  let buffer = '';
  let ultimaTecla = 0;

  const manejar = (ev) => {
    const objetivo = ev.target;
    // Si el foco está en un campo de texto, es una persona escribiendo.
    if (objetivo && /^(INPUT|TEXTAREA|SELECT)$/.test(objetivo.tagName) && !objetivo.dataset.lector) {
      return;
    }
    const ahora = Date.now();
    if (ahora - ultimaTecla > 300) buffer = '';
    ultimaTecla = ahora;

    if (ev.key === 'Enter') {
      if (buffer.length >= minimo) {
        alLeer(buffer);
        ev.preventDefault();
      }
      buffer = '';
      return;
    }
    if (ev.key.length === 1) buffer += ev.key;
  };

  document.addEventListener('keydown', manejar);
  return () => document.removeEventListener('keydown', manejar);
}

/** Pitido corto de confirmación: en patio con ruido, la vibración no basta. */
export function retroalimentar(exito = true) {
  try {
    navigator.vibrate?.(exito ? 60 : [80, 60, 80]);
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gan = ctx.createGain();
    osc.frequency.value = exito ? 1180 : 320;
    gan.gain.value = 0.08;
    osc.connect(gan).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (exito ? 0.09 : 0.22));
    osc.onended = () => ctx.close();
  } catch {
    /* sin audio no pasa nada, la vibración y el color ya avisaron */
  }
}
