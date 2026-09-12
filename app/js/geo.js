/**
 * Geocodificación de direcciones mexicanas.
 *
 * Dos proveedores: Nominatim (OpenStreetMap, gratis, 1 consulta por segundo) y
 * Google Geocoding (de paga, mucho mejor con colonias y cerradas de México).
 * Todo lo resuelto se guarda en caché local: una dirección se cobra una vez.
 *
 * Cuando ninguno acierta, se cae al centroide del código postal aprendido de
 * las paradas ya resueltas: no sirve para tocar la puerta, pero sí para que la
 * parada entre al ruteo en la zona correcta en vez de quedarse fuera del plan.
 */

import { direccionCompleta } from './almacen.js';

const CLAVE_CACHE = 'ruta-ultima-milla/geocache/v1';
const ESPERA_NOMINATIM_MS = 1100; // su política de uso permite 1 req/s

let cache = {};
try {
  cache = JSON.parse(localStorage.getItem(CLAVE_CACHE) ?? '{}');
} catch {
  cache = {};
}

const normalizar = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function guardarCache() {
  try {
    localStorage.setItem(CLAVE_CACHE, JSON.stringify(cache));
  } catch {
    // Si no cabe, se tira la caché completa antes que perder la ruta del día.
    cache = {};
  }
}

export function tamanoCache() {
  return Object.keys(cache).length;
}

export function limpiarCache() {
  cache = {};
  guardarCache();
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function consultarNominatim(consulta) {
  const url =
    'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=mx&q=' +
    encodeURIComponent(consulta);
  const r = await fetch(url, { headers: { 'Accept-Language': 'es-MX' } });
  if (!r.ok) throw new Error(`Nominatim respondió ${r.status}`);
  const datos = await r.json();
  if (!datos.length) return null;
  return {
    lat: Number(datos[0].lat),
    lng: Number(datos[0].lon),
    precision: datos[0].type ?? 'desconocida',
    fuente: 'nominatim',
  };
}

async function consultarGoogle(consulta, clave) {
  const url =
    'https://maps.googleapis.com/maps/api/geocode/json?region=mx&language=es&address=' +
    encodeURIComponent(consulta) +
    '&key=' +
    encodeURIComponent(clave);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Google respondió ${r.status}`);
  const datos = await r.json();
  if (datos.status === 'REQUEST_DENIED') throw new Error(datos.error_message || 'Clave rechazada');
  if (datos.status !== 'OK' || !datos.results.length) return null;
  const g = datos.results[0];
  return {
    lat: g.geometry.location.lat,
    lng: g.geometry.location.lng,
    precision: g.geometry.location_type ?? 'desconocida',
    fuente: 'google',
  };
}

/**
 * Resuelve una dirección. Intenta primero la dirección completa y, si falla,
 * solo colonia + municipio + CP, que en México acierta mucho más seguido.
 */
export async function geocodificar(parada, config = {}) {
  const completa = direccionCompleta(parada);
  const clave = normalizar(completa);
  if (!clave) return null;
  if (cache[clave]) return cache[clave];

  const aproximada = [parada.colonia, parada.municipio, parada.estado, parada.cp, 'México']
    .filter(Boolean)
    .join(', ');

  const intentos = [completa];
  if (aproximada && normalizar(aproximada) !== clave) intentos.push(aproximada);

  const usaGoogle = config.geocodificador === 'google' && config.claveGoogle;

  for (let i = 0; i < intentos.length; i++) {
    const consulta = intentos[i];
    let resultado = null;
    try {
      resultado = usaGoogle
        ? await consultarGoogle(consulta, config.claveGoogle)
        : await consultarNominatim(consulta);
    } catch (e) {
      // Un error de red no debe tirar el lote completo: se reporta y se sigue.
      return { error: e.message };
    }
    if (resultado) {
      if (i > 0) resultado.precision = 'aproximada-colonia';
      cache[clave] = resultado;
      guardarCache();
      return resultado;
    }
    if (!usaGoogle) await esperar(ESPERA_NOMINATIM_MS);
  }

  return null;
}

/**
 * Geocodifica un lote reportando avance. Respeta el límite de Nominatim.
 * `alAvanzar(hechas, total, parada, resultado)` se llama en cada paso.
 */
export async function geocodificarLote(paradas, config, alAvanzar, debeParar = () => false) {
  const pendientes = paradas.filter((p) => !Number.isFinite(p.lat) || !Number.isFinite(p.lng));
  const resultados = [];
  const usaGoogle = config.geocodificador === 'google' && config.claveGoogle;

  for (let i = 0; i < pendientes.length; i++) {
    if (debeParar()) break;
    const p = pendientes[i];
    const r = await geocodificar(p, config);
    resultados.push({ parada: p, resultado: r });
    alAvanzar?.(i + 1, pendientes.length, p, r);
    // Con Nominatim hay que respetar 1 req/s; con Google el límite es el plan contratado.
    if (!usaGoogle && i < pendientes.length - 1) await esperar(ESPERA_NOMINATIM_MS);
  }
  return resultados;
}

/**
 * Centroides de código postal aprendidos de las paradas ya resueltas.
 * Permite colocar en el mapa una dirección que ningún geocodificador reconoció.
 */
export function centroidesPorCP(paradas) {
  const acumulado = {};
  for (const p of paradas) {
    if (!p.cp || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
    (acumulado[p.cp] ??= []).push(p);
  }
  const centroides = {};
  for (const [cp, lista] of Object.entries(acumulado)) {
    centroides[cp] = {
      lat: lista.reduce((t, p) => t + p.lat, 0) / lista.length,
      lng: lista.reduce((t, p) => t + p.lng, 0) / lista.length,
      muestras: lista.length,
    };
  }
  return centroides;
}

/** Rellena por CP las paradas que quedaron sin coordenada. */
export function rellenarPorCP(paradas) {
  const centroides = centroidesPorCP(paradas);
  const rellenadas = [];
  for (const p of paradas) {
    if (Number.isFinite(p.lat) && Number.isFinite(p.lng)) continue;
    const c = centroides[p.cp];
    if (!c) continue;
    rellenadas.push({ id: p.id, lat: c.lat, lng: c.lng, geoFuente: `cp (${c.muestras} vecinas)` });
  }
  return rellenadas;
}

/** Posición actual del dispositivo, para sellar entregas y centrar el mapa. */
export function posicionActual(opciones = {}) {
  return new Promise((resolver) => {
    if (!navigator.geolocation) return resolver(null);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolver({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          precisionM: Math.round(pos.coords.accuracy),
        }),
      () => resolver(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000, ...opciones },
    );
  });
}

/** Enlaces de navegación hacia una parada. Waze y Google Maps en la misma app. */
export function enlacesNavegacion(parada) {
  const tieneCoords = Number.isFinite(parada.lat) && Number.isFinite(parada.lng);
  const destino = tieneCoords
    ? `${parada.lat},${parada.lng}`
    : encodeURIComponent(direccionCompleta(parada));
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${destino}&travelmode=driving`,
    waze: tieneCoords
      ? `https://waze.com/ul?ll=${parada.lat},${parada.lng}&navigate=yes`
      : `https://waze.com/ul?q=${destino}`,
  };
}

/**
 * Google Maps acepta como máximo 10 puntos por enlace (origen + 8 escalas +
 * destino), así que una ruta larga se parte en tramos navegables.
 */
export function tramosNavegables(paradas, cedis, porTramo = 9) {
  const conCoords = paradas.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  const tramos = [];
  for (let i = 0; i < conCoords.length; i += porTramo) {
    const bloque = conCoords.slice(i, i + porTramo);
    const origen =
      i === 0 ? `${cedis.lat},${cedis.lng}` : `${conCoords[i - 1].lat},${conCoords[i - 1].lng}`;
    const destino = `${bloque[bloque.length - 1].lat},${bloque[bloque.length - 1].lng}`;
    const escalas = bloque.slice(0, -1).map((p) => `${p.lat},${p.lng}`).join('|');
    tramos.push({
      desde: i + 1,
      hasta: i + bloque.length,
      url:
        `https://www.google.com/maps/dir/?api=1&origin=${origen}&destination=${destino}` +
        (escalas ? `&waypoints=${encodeURIComponent(escalas)}` : '') +
        '&travelmode=driving',
    });
  }
  return tramos;
}
