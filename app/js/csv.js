/**
 * Lectura y escritura de CSV tolerante a lo que sale de Excel en México:
 * separador coma o punto y coma, BOM de UTF-8, campos entrecomillados con
 * comas y saltos de línea dentro.
 */

/** Detecta el separador mirando la primera línea fuera de comillas. */
function detectarSeparador(texto) {
  const linea = texto.split(/\r?\n/, 1)[0] ?? '';
  const conteo = { ',': 0, ';': 0, '\t': 0, '|': 0 };
  let dentroDeComillas = false;
  for (const c of linea) {
    if (c === '"') dentroDeComillas = !dentroDeComillas;
    else if (!dentroDeComillas && c in conteo) conteo[c]++;
  }
  return Object.entries(conteo).sort((a, b) => b[1] - a[1])[0][0];
}

/** Parsea un CSV completo a {encabezados, filas} donde cada fila es un objeto. */
export function parsearCSV(texto, separador) {
  const limpio = texto.replace(/^﻿/, '');
  const sep = separador ?? detectarSeparador(limpio);
  const celdas = [];
  let fila = [];
  let campo = '';
  let dentroDeComillas = false;

  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];
    if (dentroDeComillas) {
      if (c === '"') {
        if (limpio[i + 1] === '"') {
          campo += '"';
          i++;
        } else dentroDeComillas = false;
      } else campo += c;
      continue;
    }
    if (c === '"') dentroDeComillas = true;
    else if (c === sep) {
      fila.push(campo);
      campo = '';
    } else if (c === '\n') {
      fila.push(campo);
      celdas.push(fila);
      fila = [];
      campo = '';
    } else if (c !== '\r') campo += c;
  }
  if (campo !== '' || fila.length) {
    fila.push(campo);
    celdas.push(fila);
  }

  const noVacias = celdas.filter((f) => f.some((c) => c.trim() !== ''));
  if (!noVacias.length) return { encabezados: [], filas: [] };

  const encabezados = noVacias[0].map((h) => h.trim());
  const filas = noVacias.slice(1).map((f) => {
    const obj = {};
    encabezados.forEach((h, i) => {
      obj[h] = (f[i] ?? '').trim();
    });
    return obj;
  });
  return { encabezados, filas };
}

/** Serializa filas (array de objetos) a CSV con BOM, para que Excel no rompa acentos. */
export function aCSV(filas, columnas, separador = ',') {
  const cols = columnas ?? [...new Set(filas.flatMap((f) => Object.keys(f)))];
  const escapar = (v) => {
    const s = v == null ? '' : String(v);
    return /["\n\r]|[,;\t|]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lineas = [cols.join(separador)];
  for (const f of filas) lineas.push(cols.map((c) => escapar(f[c])).join(separador));
  return '﻿' + lineas.join('\r\n');
}

const sinAcentos = (s) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/**
 * Diccionario de sinónimos de encabezado. Los manifiestos de Mercado Libre, de
 * un seller o de una hoja hecha a mano nunca traen los mismos nombres.
 */
const SINONIMOS = {
  guia: [/^gu[ií]a/, /tracking/, /shipment/, /^id.?env/, /n[uú]mero.?de.?gu/, /^folio/, /^env[ií]o/],
  destinatario: [/destinatario/, /receptor/, /^nombre/, /^cliente/, /comprador/, /buyer/],
  direccion: [/direcci/, /domicilio/, /^calle/, /street/, /address/],
  colonia: [/colonia/, /^col\b/, /barrio/, /neighborhood/],
  municipio: [/municipio/, /alcald/, /delegaci/, /^ciudad/, /^city/, /localidad/],
  estado: [/^estado/, /entidad/, /^state/, /provincia/],
  cp: [/^cp$/, /c\.?\s?p\.?/, /postal/, /^zip/],
  telefono: [/tel[eé]fono/, /^tel/, /phone/, /celular/, /m[oó]vil/, /whats/],
  referencias: [/referencia/, /entre.?calles/, /indicaci/, /^nota/, /observ/],
  piezas: [/piezas/, /bultos/, /cantidad/, /^qty/, /paquetes/, /^pzas/],
  ventanaInicio: [/ventana.?inicio/, /horario.?desde/, /^desde/, /hora.?inicio/, /^de\b/],
  ventanaFin: [/ventana.?fin/, /horario.?hasta/, /^hasta/, /hora.?fin/, /^a\b/],
  lat: [/^lat/, /latitud/],
  lng: [/^lng/, /^lon/, /longitud/],
  peso: [/^peso/, /^kg/, /weight/],
};

/** Adivina qué columna del archivo corresponde a cada campo de una parada. */
export function mapearColumnas(encabezados) {
  const mapa = {};
  const usados = new Set();
  for (const [campo, patrones] of Object.entries(SINONIMOS)) {
    for (const patron of patrones) {
      const hit = encabezados.find((h) => !usados.has(h) && patron.test(sinAcentos(h)));
      if (hit) {
        mapa[campo] = hit;
        usados.add(hit);
        break;
      }
    }
  }
  return mapa;
}

const numero = (v) => {
  const n = Number(String(v ?? '').replace(/[^\d.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
};

/** Convierte las filas crudas del archivo en paradas listas para el planificador. */
export function filasAParadas(filas, encabezados, mapaManual) {
  const mapa = mapaManual ?? mapearColumnas(encabezados);
  const valor = (f, campo) => (mapa[campo] ? f[mapa[campo]] : '') || '';
  return filas.map((f) => {
    const piezas = numero(valor(f, 'piezas'));
    const lat = numero(valor(f, 'lat'));
    const lng = numero(valor(f, 'lng'));
    return {
      guia: valor(f, 'guia'),
      destinatario: valor(f, 'destinatario'),
      direccion: valor(f, 'direccion'),
      colonia: valor(f, 'colonia'),
      municipio: valor(f, 'municipio'),
      estado: valor(f, 'estado'),
      cp: valor(f, 'cp'),
      telefono: valor(f, 'telefono'),
      referencias: valor(f, 'referencias'),
      piezas: piezas && piezas > 0 ? piezas : 1,
      ventanaInicio: normalizarHora(valor(f, 'ventanaInicio')),
      ventanaFin: normalizarHora(valor(f, 'ventanaFin')),
      lat: lat != null && Math.abs(lat) <= 90 ? lat : null,
      lng: lng != null && Math.abs(lng) <= 180 ? lng : null,
    };
  });
}

/** Acepta "9", "9:00", "09:00 a.m.", "14:30" y devuelve "HH:MM" o ''. */
export function normalizarHora(v) {
  const s = String(v ?? '').trim();
  if (!s) return '';
  const m = s.match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i);
  if (!m) return '';
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  const sufijo = (m[3] ?? '').toLowerCase().replace(/\./g, '');
  if (sufijo === 'pm' && h < 12) h += 12;
  if (sufijo === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return '';
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}
