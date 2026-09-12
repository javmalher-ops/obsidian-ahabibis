/**
 * Estado de la operación del día, persistido en el navegador.
 *
 * Todo vive en localStorage: la app tiene que funcionar completa dentro de una
 * unidad sin señal. Nada sale del teléfono salvo que el usuario exporte.
 */

const CLAVE = 'ruta-ultima-milla/v1';

/** Estados por los que pasa una guía, en orden operativo. */
export const ESTATUS = {
  inducida: 'Inducida',       // escaneada al recibirla del CEDIS
  en_ruta: 'En ruta',         // cargada a la unidad
  entregado: 'Entregado',
  no_entregado: 'No entregado',
  reprogramado: 'Reprogramado',
  devuelto: 'Devuelto a CEDIS',
};

/** Motivos tipificados de no entrega. Sin campo libre: así los KPIs sirven. */
export const MOTIVOS_NO_ENTREGA = [
  'Destinatario ausente',
  'Domicilio no localizado',
  'Domicilio incorrecto o incompleto',
  'Rechazado por el destinatario',
  'Sin acceso (privada, coto, torre)',
  'Zona de riesgo',
  'Fuera de horario permitido',
  'Paquete dañado',
  'Reprogramado por el cliente',
];

const ESTADO_INICIAL = () => ({
  version: 1,
  fecha: hoy(),
  cedis: {
    nombre: 'CEDIS',
    direccion: '',
    lat: null,
    lng: null,
  },
  config: {
    unidades: 1,
    capacidad: 150,
    salida: '09:00',
    abierta: false,
    velocidadKmh: 18,
    minutosServicio: 4,
    factorRuteo: 1.35,
    geocodificador: 'nominatim',
    claveGoogle: '',
  },
  paradas: [],
  plan: null,
  planCalculadoEn: null,
});

export function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

let estado = ESTADO_INICIAL();
const suscriptores = new Set();

export function cargar() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (crudo) {
      const guardado = JSON.parse(crudo);
      estado = { ...ESTADO_INICIAL(), ...guardado };
      estado.config = { ...ESTADO_INICIAL().config, ...(guardado.config ?? {}) };
      estado.cedis = { ...ESTADO_INICIAL().cedis, ...(guardado.cedis ?? {}) };
    }
  } catch (e) {
    console.warn('No se pudo leer el estado guardado, se empieza limpio.', e);
  }
  return estado;
}

export function obtener() {
  return estado;
}

/** Aplica un cambio, persiste y avisa a la interfaz. */
export function actualizar(cambio) {
  estado = typeof cambio === 'function' ? cambio(estado) : { ...estado, ...cambio };
  guardar();
  for (const fn of suscriptores) fn(estado);
  return estado;
}

export function suscribir(fn) {
  suscriptores.add(fn);
  return () => suscriptores.delete(fn);
}

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado));
  } catch (e) {
    // Cuota llena: es preferible avisar que perder la captura del día en silencio.
    console.error('No se pudo guardar el estado.', e);
    alert(
      'No hay espacio para guardar más datos en este dispositivo. ' +
        'Exporta el cierre del día y cierra la ruta antes de seguir escaneando.',
    );
  }
}

let contador = 0;
const nuevoId = () => `p${Date.now().toString(36)}${(contador++).toString(36)}`;

/**
 * Normaliza lo que devuelve un escáner. La etiqueta de Mercado Libre trae el
 * número impreso, un Code128 y un QR que a veces contiene una URL completa.
 */
export function normalizarGuia(crudo) {
  let t = String(crudo ?? '').trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) {
    try {
      const url = new URL(t);
      const porParametro = url.searchParams.get('id') || url.searchParams.get('shipping_id');
      t = porParametro || url.pathname.split('/').filter(Boolean).pop() || t;
    } catch {
      /* si no parsea, seguimos con el texto crudo */
    }
  }
  // Dentro de un QR con varios campos, la guía es la corrida de dígitos más larga.
  const digitos = t.match(/\d{8,}/g);
  if (digitos) t = digitos.sort((a, b) => b.length - a.length)[0];
  return t.toUpperCase().replace(/\s+/g, '');
}

/** Texto de una dirección para geocodificar o mostrar. */
export function direccionCompleta(p) {
  return [p.direccion, p.colonia, p.municipio, p.estado, p.cp, 'México']
    .map((x) => String(x ?? '').trim())
    .filter(Boolean)
    .join(', ');
}

export function buscarPorGuia(guia) {
  const g = normalizarGuia(guia);
  return estado.paradas.find((p) => p.guia === g) ?? null;
}

/**
 * Da de alta una guía escaneada. Si ya existe, no duplica: devuelve la
 * existente marcada como repetida, que es lo que el operador necesita saber.
 */
export function inducirGuia(guiaCruda, datos = {}) {
  const guia = normalizarGuia(guiaCruda);
  if (!guia) return { ok: false, motivo: 'Lectura vacía' };
  const existente = buscarPorGuia(guia);
  if (existente) return { ok: false, motivo: 'Guía repetida', parada: existente };

  const parada = {
    id: nuevoId(),
    guia,
    destinatario: '',
    direccion: '',
    colonia: '',
    municipio: '',
    estado: '',
    cp: '',
    telefono: '',
    referencias: '',
    piezas: 1,
    ventanaInicio: '',
    ventanaFin: '',
    lat: null,
    lng: null,
    geoFuente: '',
    estatus: 'inducida',
    motivo: '',
    recibio: '',
    unidad: null,
    inducidaEn: new Date().toISOString(),
    entregadaEn: null,
    gps: null,
    ...datos,
  };
  actualizar((e) => ({ ...e, paradas: [...e.paradas, parada], plan: null }));
  return { ok: true, parada };
}

/** Alta masiva desde CSV. Devuelve cuántas entraron y cuántas venían repetidas. */
export function importarParadas(nuevas) {
  const vistas = new Set(estado.paradas.map((p) => p.guia));
  const agregadas = [];
  let repetidas = 0;
  for (const n of nuevas) {
    const guia = normalizarGuia(n.guia);
    if (!guia) continue;
    if (vistas.has(guia)) {
      repetidas++;
      continue;
    }
    vistas.add(guia);
    agregadas.push({
      id: nuevoId(),
      geoFuente: n.lat != null ? 'archivo' : '',
      estatus: 'inducida',
      motivo: '',
      recibio: '',
      unidad: null,
      inducidaEn: new Date().toISOString(),
      entregadaEn: null,
      gps: null,
      ...n,
      guia,
    });
  }
  if (agregadas.length) {
    actualizar((e) => ({ ...e, paradas: [...e.paradas, ...agregadas], plan: null }));
  }
  return { agregadas: agregadas.length, repetidas };
}

export function actualizarParada(id, cambios) {
  actualizar((e) => ({
    ...e,
    paradas: e.paradas.map((p) => (p.id === id ? { ...p, ...cambios } : p)),
  }));
}

export function eliminarParada(id) {
  actualizar((e) => ({ ...e, paradas: e.paradas.filter((p) => p.id !== id), plan: null }));
}

/** Cierra una parada con su resultado y sella hora y GPS si hay permiso. */
export function cerrarParada(id, { estatus, motivo = '', recibio = '', gps = null }) {
  actualizarParada(id, {
    estatus,
    motivo,
    recibio,
    gps,
    entregadaEn: new Date().toISOString(),
  });
}

/** Indicadores de cierre del día. */
export function kpis() {
  const p = estado.paradas;
  const total = p.length;
  const entregadas = p.filter((x) => x.estatus === 'entregado').length;
  const noEntregadas = p.filter((x) => x.estatus === 'no_entregado').length;
  const pendientes = p.filter((x) => x.estatus === 'inducida' || x.estatus === 'en_ruta').length;
  const kmPlan = estado.plan?.resumen?.kmTotal ?? 0;
  const motivos = {};
  for (const x of p) if (x.estatus === 'no_entregado' && x.motivo) motivos[x.motivo] = (motivos[x.motivo] ?? 0) + 1;

  return {
    total,
    entregadas,
    noEntregadas,
    pendientes,
    efectividad: total ? Number(((entregadas / total) * 100).toFixed(1)) : 0,
    kmPlan,
    kmPorEntrega: entregadas ? Number((kmPlan / entregadas).toFixed(2)) : 0,
    motivos: Object.entries(motivos).sort((a, b) => b[1] - a[1]),
  };
}

/** Vacía el día dejando la configuración y el CEDIS. */
export function cerrarDia() {
  actualizar((e) => ({
    ...ESTADO_INICIAL(),
    cedis: e.cedis,
    config: e.config,
    fecha: hoy(),
  }));
}
