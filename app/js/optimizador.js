/**
 * Motor de optimización de rutas de última milla.
 *
 * Módulo puro: no toca el DOM ni la red, para poder ejecutarlo igual desde el
 * navegador (PWA) que desde Node (pruebas).
 *
 * Estrategia: construcción con vecino más cercano + mejora local con 2-opt y
 * Or-opt. Para varias unidades: barrido polar (sweep) alrededor del CEDIS y
 * después una pasada de reubicación entre rutas.
 *
 * Todas las distancias en kilómetros, todos los tiempos en minutos.
 */

/** Velocidad promedio puerta a puerta en zona urbana mexicana (CDMX/ZMG/ZMM). */
export const VELOCIDAD_URBANA_KMH = 18;
/** Minutos promedio por parada: estacionar, caminar, entregar, capturar. */
export const MINUTOS_SERVICIO = 4;
/**
 * Factor de ruteo: convierte distancia en línea recta a distancia por calle.
 * 1.35 es el valor observado en traza urbana reticular mexicana.
 */
export const FACTOR_RUTEO = 1.35;

const RADIO_TIERRA_KM = 6371.0088;

const rad = (g) => (g * Math.PI) / 180;

/** Distancia en línea recta entre dos coordenadas {lat, lng}. */
export function haversineKm(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * Matriz simétrica de distancias por calle (estimada).
 * El índice 0 debe ser el CEDIS / punto de salida.
 */
export function matrizDistancias(puntos, factorRuteo = FACTOR_RUTEO) {
  const n = puntos.length;
  const m = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = haversineKm(puntos[i], puntos[j]) * factorRuteo;
      m[i][j] = d;
      m[j][i] = d;
    }
  }
  return m;
}

/** Convierte "09:30" a minutos desde medianoche. Devuelve null si viene vacío. */
export function aMinutos(hhmm) {
  if (hhmm == null || hhmm === '') return null;
  if (typeof hhmm === 'number') return hhmm;
  const m = String(hhmm).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Convierte minutos desde medianoche a "HH:MM". */
export function aHora(minutos) {
  const t = Math.max(0, Math.round(minutos));
  const h = Math.floor(t / 60) % 24;
  const m = t % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Contexto de evaluación. `paradas` son las paradas SIN el CEDIS; el índice i
 * de una secuencia apunta a paradas[i - 1] (el 0 está reservado al CEDIS).
 */
export function crearContexto(paradas, matriz, opciones = {}) {
  const {
    abierta = false,
    salida = '09:00',
    velocidadKmh = VELOCIDAD_URBANA_KMH,
    minutosServicio = MINUTOS_SERVICIO,
    penalizacionRetrasoKmPorMin = 0.5,
    penalizacionEsperaKmPorMin = 0.05,
    radio = 25,
  } = opciones;

  const ventanas = paradas.map((p) => ({
    inicio: aMinutos(p.ventanaInicio),
    fin: aMinutos(p.ventanaFin),
    servicio: Number.isFinite(p.minutosServicio) ? p.minutosServicio : minutosServicio,
  }));

  return {
    matriz,
    ventanas,
    abierta,
    salidaMin: aMinutos(salida) ?? 540,
    velocidadKmh,
    minutosServicio,
    penalizacionRetrasoKmPorMin,
    penalizacionEsperaKmPorMin,
    radio,
    hayVentanas: ventanas.some((v) => v.inicio != null || v.fin != null),
  };
}

/**
 * Evalúa una secuencia completa: kilómetros, duración, retraso y espera.
 * `costo` es la función objetivo (km + penalizaciones) que guía la búsqueda.
 */
export function evaluar(secuencia, ctx) {
  const { matriz, ventanas, abierta, velocidadKmh } = ctx;
  let km = 0;
  let reloj = ctx.salidaMin;
  let retraso = 0;
  let espera = 0;
  let previo = 0;
  const llegadas = new Array(secuencia.length);

  for (let k = 0; k < secuencia.length; k++) {
    const i = secuencia[k];
    const d = matriz[previo][i];
    km += d;
    reloj += (d / velocidadKmh) * 60;
    const v = ventanas[i - 1];
    if (v.inicio != null && reloj < v.inicio) {
      espera += v.inicio - reloj;
      reloj = v.inicio;
    }
    llegadas[k] = reloj;
    if (v.fin != null && reloj > v.fin) retraso += reloj - v.fin;
    reloj += v.servicio;
    previo = i;
  }

  if (!abierta && secuencia.length) {
    const d = matriz[previo][0];
    km += d;
    reloj += (d / velocidadKmh) * 60;
  }

  const costo =
    km +
    retraso * ctx.penalizacionRetrasoKmPorMin +
    espera * ctx.penalizacionEsperaKmPorMin;

  return {
    km,
    costo,
    llegadas,
    retrasoMin: retraso,
    esperaMin: espera,
    regresoMin: reloj,
    duracionMin: reloj - ctx.salidaMin,
  };
}

/** Solo kilómetros, sin penalizaciones (para el camino rápido sin ventanas). */
function kmDe(secuencia, ctx) {
  const { matriz, abierta } = ctx;
  let km = 0;
  let previo = 0;
  for (const i of secuencia) {
    km += matriz[previo][i];
    previo = i;
  }
  if (!abierta && secuencia.length) km += matriz[previo][0];
  return km;
}

const objetivo = (secuencia, ctx) =>
  ctx.hayVentanas ? evaluar(secuencia, ctx).costo : kmDe(secuencia, ctx);

/** Construcción golosa: desde el CEDIS, siempre a la parada pendiente más cercana. */
export function vecinoMasCercano(indices, ctx) {
  const pendientes = new Set(indices);
  const secuencia = [];
  let actual = 0;
  while (pendientes.size) {
    let mejor = -1;
    let mejorD = Infinity;
    for (const i of pendientes) {
      const d = ctx.matriz[actual][i];
      if (d < mejorD) {
        mejorD = d;
        mejor = i;
      }
    }
    secuencia.push(mejor);
    pendientes.delete(mejor);
    actual = mejor;
  }
  return secuencia;
}

/**
 * Construcción golosa respetando ventanas horarias: en cada paso elige la
 * parada que menos costo agrega considerando el reloj (regla "más temprano
 * que cierre, más cerca").
 */
export function insercionPorVentana(indices, ctx) {
  const pendientes = new Set(indices);
  const secuencia = [];
  let actual = 0;
  let reloj = ctx.salidaMin;
  while (pendientes.size) {
    let mejor = -1;
    let mejorCosto = Infinity;
    for (const i of pendientes) {
      const d = ctx.matriz[actual][i];
      let llegada = reloj + (d / ctx.velocidadKmh) * 60;
      const v = ctx.ventanas[i - 1];
      let extra = 0;
      if (v.inicio != null && llegada < v.inicio) {
        extra += (v.inicio - llegada) * ctx.penalizacionEsperaKmPorMin;
        llegada = v.inicio;
      }
      if (v.fin != null && llegada > v.fin) {
        extra += (llegada - v.fin) * ctx.penalizacionRetrasoKmPorMin;
      }
      const costo = d + extra;
      if (costo < mejorCosto) {
        mejorCosto = costo;
        mejor = i;
      }
    }
    const d = ctx.matriz[actual][mejor];
    reloj += (d / ctx.velocidadKmh) * 60;
    const v = ctx.ventanas[mejor - 1];
    if (v.inicio != null && reloj < v.inicio) reloj = v.inicio;
    reloj += v.servicio;
    secuencia.push(mejor);
    pendientes.delete(mejor);
    actual = mejor;
  }
  return secuencia;
}

/**
 * 2-opt: invierte tramos para deshacer cruces de la ruta.
 * Sin ventanas usa delta O(1); con ventanas reevalúa completo (más caro pero
 * es lo único correcto cuando el orden afecta la hora de llegada).
 */
export function mejorar2opt(secuencia, ctx, maxPasadas = 40) {
  const s = secuencia.slice();
  const n = s.length;
  if (n < 3) return s;
  const { matriz, abierta, hayVentanas } = ctx;
  const nodo = (k) => (k < 0 ? 0 : k >= n ? 0 : s[k]);
  // Con ventanas el costo depende del reloj, así que lo llevamos de la mano en
  // vez de recalcularlo para cada movimiento candidato.
  let costoActual = hayVentanas ? objetivo(s, ctx) : 0;

  for (let pasada = 0; pasada < maxPasadas; pasada++) {
    let mejoro = false;
    for (let i = 0; i < n - 1; i++) {
      const jMax = hayVentanas ? Math.min(n - 1, i + ctx.radio) : n - 1;
      for (let j = i + 1; j <= jMax; j++) {
        if (hayVentanas) {
          // Invertir la cola sí cambia las horas de llegada: no se descarta.
          const prueba = s.slice();
          invertir(prueba, i, j);
          const costo = objetivo(prueba, ctx);
          if (costo < costoActual - 1e-9) {
            invertir(s, i, j);
            costoActual = costo;
            mejoro = true;
          }
        } else {
          // En ruta abierta invertir hasta el final no cambia los kilómetros.
          if (abierta && j === n - 1) continue;
          const a = nodo(i - 1);
          const b = s[i];
          const c = s[j];
          const d = nodo(j + 1);
          const antes = matriz[a][b] + matriz[c][d];
          const despues = matriz[a][c] + matriz[b][d];
          if (despues < antes - 1e-9) {
            invertir(s, i, j);
            mejoro = true;
          }
        }
      }
    }
    if (!mejoro) break;
  }
  return s;
}

function invertir(arr, i, j) {
  while (i < j) {
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
    i++;
    j--;
  }
}

/**
 * Or-opt: mueve segmentos de 1 a 3 paradas a otra posición de la ruta.
 * Rescata los casos que 2-opt no alcanza (una parada "colgada" lejos del resto).
 */
export function mejorarOrOpt(secuencia, ctx, maxPasadas = 200) {
  let s = secuencia.slice();
  if (s.length < 3) return s;
  // En manifiestos grandes los segmentos de 3 aportan poco y cuestan mucho.
  const largoMax = s.length > 120 ? 2 : 3;

  for (let pasada = 0; pasada < maxPasadas; pasada++) {
    const siguiente = ctx.hayVentanas
      ? pasadaOrOptConVentanas(s, ctx, largoMax)
      : pasadaOrOptPorDistancia(s, ctx, largoMax);
    if (!siguiente) break;
    s = siguiente;
  }
  return s;
}

/**
 * Una pasada de Or-opt evaluando solo el delta de kilómetros: quitar el
 * segmento ahorra unos tramos y reinsertarlo cuesta otros. O(1) por candidato.
 * Devuelve la secuencia mejorada, o null si ya no hay mejora.
 */
function pasadaOrOptPorDistancia(s, ctx, largoMax) {
  const { matriz, abierta } = ctx;
  const n = s.length;
  // -1 representa "fin de ruta abierta": llegar ahí no cuesta nada.
  const D = (x, y) => (x < 0 || y < 0 ? 0 : matriz[x][y]);
  const finDeRuta = abierta ? -1 : 0;

  for (let largo = 1; largo <= largoMax && largo < n; largo++) {
    for (let i = 0; i + largo <= n; i++) {
      const j = i + largo - 1;
      const cabeza = s[i];
      const cola = s[j];
      const previo = i === 0 ? 0 : s[i - 1];
      const posterior = j === n - 1 ? finDeRuta : s[j + 1];
      const ahorro = D(previo, cabeza) + D(cola, posterior) - D(previo, posterior);
      if (ahorro <= 1e-9) continue;

      const resto = s.slice(0, i).concat(s.slice(j + 1));
      for (let k = 0; k <= resto.length; k++) {
        if (k === i) continue; // volver al mismo lugar
        const u = k === 0 ? 0 : resto[k - 1];
        const v = k === resto.length ? finDeRuta : resto[k];
        const base = D(u, v);
        const derecho = D(u, cabeza) + D(cola, v) - base;
        const inverso = D(u, cola) + D(cabeza, v) - base;
        if (Math.min(derecho, inverso) < ahorro - 1e-9) {
          const segmento = s.slice(i, j + 1);
          if (inverso < derecho) segmento.reverse();
          return resto.slice(0, k).concat(segmento, resto.slice(k));
        }
      }
    }
  }
  return null;
}

/**
 * Con ventanas horarias el delta no basta (mover una parada corre las horas de
 * llegada de todas las siguientes), así que se reevalúa completo pero solo
 * cerca de la posición original, que es donde están las mejoras que importan.
 */
function pasadaOrOptConVentanas(s, ctx, largoMax) {
  const n = s.length;
  const costoBase = objetivo(s, ctx);

  for (let largo = 1; largo <= largoMax && largo < n; largo++) {
    for (let i = 0; i + largo <= n; i++) {
      const segmento = s.slice(i, i + largo);
      const resto = s.slice(0, i).concat(s.slice(i + largo));
      const desde = Math.max(0, i - ctx.radio);
      const hasta = Math.min(resto.length, i + ctx.radio);
      for (let k = desde; k <= hasta; k++) {
        if (k === i) continue;
        const prueba = resto.slice(0, k).concat(segmento, resto.slice(k));
        if (objetivo(prueba, ctx) < costoBase - 1e-9) return prueba;
      }
    }
  }
  return null;
}

/** Optimiza una sola ruta (un repartidor) sobre los índices dados. */
export function optimizarSecuencia(indices, ctx) {
  if (!indices.length) return { secuencia: [], ...evaluar([], ctx) };
  const inicial = ctx.hayVentanas
    ? insercionPorVentana(indices, ctx)
    : vecinoMasCercano(indices, ctx);
  let s = mejorar2opt(inicial, ctx);
  s = mejorarOrOpt(s, ctx);
  s = mejorar2opt(s, ctx);
  return { secuencia: s, ...evaluar(s, ctx) };
}

/**
 * Barrido polar: ordena las paradas por ángulo respecto al CEDIS y las corta
 * en tantos grupos como unidades haya, respetando capacidad de paquetes.
 * Es el reparto de zonas que haría un jefe de patio, pero sin sesgo.
 */
export function agruparPorBarrido(
  paradas,
  deposito,
  { unidades = 1, capacidad = Infinity, maxParadas = Infinity } = {},
) {
  const conAngulo = paradas.map((p, i) => ({
    i: i + 1,
    piezas: Number.isFinite(p.piezas) ? p.piezas : 1,
    angulo: Math.atan2(p.lat - deposito.lat, p.lng - deposito.lng),
  }));
  conAngulo.sort((a, b) => a.angulo - b.angulo);

  const totalPiezas = conAngulo.reduce((s, p) => s + p.piezas, 0);
  const metaPorUnidad = Math.min(capacidad, Math.ceil(totalPiezas / unidades));

  const grupos = Array.from({ length: unidades }, () => []);
  let g = 0;
  let carga = 0;
  for (const p of conAngulo) {
    const llena = carga + p.piezas > metaPorUnidad || grupos[g].length >= maxParadas;
    if (llena && g < unidades - 1) {
      g++;
      carga = 0;
    }
    grupos[g].push(p.i);
    carga += p.piezas;
  }
  return grupos;
}

/**
 * Reubicación entre rutas: intenta mover cada parada a otra unidad cuando eso
 * baja los kilómetros totales, respetando capacidad. Se evalúa por delta
 * (quitar de aquí ahorra X, meter allá cuesta Y), y cuando hay ventanas
 * horarias se verifica además que el cambio no empeore el costo con
 * penalizaciones antes de aceptarlo.
 */
function mejorarEntreRutas(
  grupos,
  ctx,
  capacidad,
  piezasPorParada,
  maxParadas = Infinity,
  maxPasadas = 4,
) {
  const { matriz, abierta } = ctx;
  const D = (x, y) => (x < 0 || y < 0 ? 0 : matriz[x][y]);
  const finDeRuta = abierta ? -1 : 0;

  let rutas = grupos.map((g) => optimizarSecuencia(g, ctx).secuencia);
  const cargas = rutas.map((r) => r.reduce((t, i) => t + piezasPorParada[i - 1], 0));

  const costoInsercion = (ruta, parada) => {
    let mejor = Infinity;
    let posicion = 0;
    for (let k = 0; k <= ruta.length; k++) {
      const u = k === 0 ? 0 : ruta[k - 1];
      const v = k === ruta.length ? finDeRuta : ruta[k];
      const costo = D(u, parada) + D(parada, v) - D(u, v);
      if (costo < mejor) {
        mejor = costo;
        posicion = k;
      }
    }
    return { costo: mejor, posicion };
  };

  for (let pasada = 0; pasada < maxPasadas; pasada++) {
    let mejoro = false;

    for (let a = 0; a < rutas.length; a++) {
      for (let idx = rutas[a].length - 1; idx >= 0; idx--) {
        const ruta = rutas[a];
        const parada = ruta[idx];
        const piezas = piezasPorParada[parada - 1];
        const previo = idx === 0 ? 0 : ruta[idx - 1];
        const posterior = idx === ruta.length - 1 ? finDeRuta : ruta[idx + 1];
        const ahorro = D(previo, parada) + D(parada, posterior) - D(previo, posterior);

        let mejorB = -1;
        let mejorCosto = ahorro - 1e-9;
        let mejorPos = 0;
        for (let b = 0; b < rutas.length; b++) {
          if (a === b) continue;
          if (cargas[b] + piezas > capacidad) continue;
          if (rutas[b].length >= maxParadas) continue;
          const { costo, posicion } = costoInsercion(rutas[b], parada);
          if (costo < mejorCosto) {
            mejorCosto = costo;
            mejorB = b;
            mejorPos = posicion;
          }
        }
        if (mejorB < 0) continue;

        const sinParada = ruta.slice(0, idx).concat(ruta.slice(idx + 1));
        const conParada = rutas[mejorB]
          .slice(0, mejorPos)
          .concat(parada, rutas[mejorB].slice(mejorPos));

        // Con ventanas, menos kilómetros puede significar más retrasos: se
        // confirma contra la función objetivo completa antes de aceptar.
        if (ctx.hayVentanas) {
          const antes = objetivo(ruta, ctx) + objetivo(rutas[mejorB], ctx);
          const despues = objetivo(sinParada, ctx) + objetivo(conParada, ctx);
          if (despues >= antes - 1e-9) continue;
        }

        rutas[a] = sinParada;
        rutas[mejorB] = conParada;
        cargas[a] -= piezas;
        cargas[mejorB] += piezas;
        mejoro = true;
      }
    }

    if (!mejoro) break;
    rutas = rutas.map((r) => optimizarSecuencia(r, ctx).secuencia);
  }

  return rutas.map((r) => optimizarSecuencia(r, ctx));
}

/**
 * Plan completo del día.
 *
 * @param {Array} paradas  Paradas con {lat, lng, piezas?, ventanaInicio?, ventanaFin?}
 * @param {Object} deposito CEDIS {lat, lng}
 * @param {Object} opciones {unidades, capacidad, salida, abierta, velocidadKmh,
 *                           minutosServicio, factorRuteo, balancear}
 * @returns {{rutas: Array, resumen: Object}}
 */
export function planificar(paradas, deposito, opciones = {}) {
  const {
    unidades = 1,
    capacidad = Infinity,
    balancear = true,
    factorRuteo = FACTOR_RUTEO,
    // Cuánto puede una unidad cargar por encima del promedio antes de que el
    // reparto se sienta injusto en el patio. 0.15 = hasta 15% más paradas.
    toleranciaDesbalance = 0.15,
  } = opciones;

  const geolocalizadas = [];
  const sinCoordenadas = [];
  paradas.forEach((p, idx) => {
    if (Number.isFinite(p.lat) && Number.isFinite(p.lng)) geolocalizadas.push({ ...p, _origen: idx });
    else sinCoordenadas.push({ ...p, _origen: idx });
  });

  if (!geolocalizadas.length) {
    return {
      rutas: [],
      sinCoordenadas,
      resumen: { paradas: 0, kmTotal: 0, minutosTotal: 0, unidades: 0, retrasoMin: 0 },
    };
  }

  const matriz = matrizDistancias([deposito, ...geolocalizadas], factorRuteo);
  const ctx = crearContexto(geolocalizadas, matriz, opciones);
  const piezasPorParada = geolocalizadas.map((p) => (Number.isFinite(p.piezas) ? p.piezas : 1));

  const nUnidades = Math.max(1, Math.min(unidades, geolocalizadas.length));
  let resultados;
  if (nUnidades === 1) {
    resultados = [optimizarSecuencia(geolocalizadas.map((_, i) => i + 1), ctx)];
  } else {
    const maxParadas = Math.max(
      1,
      Math.ceil((geolocalizadas.length / nUnidades) * (1 + toleranciaDesbalance)),
    );
    const grupos = agruparPorBarrido(geolocalizadas, deposito, {
      unidades: nUnidades,
      capacidad,
      maxParadas,
    });
    resultados = balancear
      ? mejorarEntreRutas(grupos, ctx, capacidad, piezasPorParada, maxParadas)
      : grupos.map((g) => optimizarSecuencia(g, ctx));
  }

  const rutas = resultados.map((r, n) => ({
    unidad: n + 1,
    distanciaKm: Number(r.km.toFixed(2)),
    duracionMin: Math.round(r.duracionMin),
    retrasoMin: Math.round(r.retrasoMin),
    esperaMin: Math.round(r.esperaMin),
    horaRegreso: aHora(r.regresoMin),
    piezas: r.secuencia.reduce((t, i) => t + piezasPorParada[i - 1], 0),
    paradas: r.secuencia.map((i, k) => ({
      ...geolocalizadas[i - 1],
      orden: k + 1,
      etaMin: Math.round(r.llegadas[k]),
      eta: aHora(r.llegadas[k]),
      distanciaDesdeAnteriorKm: Number(
        matriz[k === 0 ? 0 : r.secuencia[k - 1]][i].toFixed(2),
      ),
    })),
  }));

  const kmTotal = rutas.reduce((t, r) => t + r.distanciaKm, 0);
  return {
    rutas,
    sinCoordenadas,
    resumen: {
      paradas: geolocalizadas.length,
      sinCoordenadas: sinCoordenadas.length,
      unidades: rutas.length,
      kmTotal: Number(kmTotal.toFixed(2)),
      minutosTotal: rutas.reduce((t, r) => t + r.duracionMin, 0),
      // Lo que dura el día para el repartidor que más tarda: eso define el turno.
      jornadaMin: rutas.reduce((t, r) => Math.max(t, r.duracionMin), 0),
      paradasMin: rutas.reduce((t, r) => Math.min(t, r.paradas.length), Infinity),
      paradasMax: rutas.reduce((t, r) => Math.max(t, r.paradas.length), 0),
      retrasoMin: rutas.reduce((t, r) => t + r.retrasoMin, 0),
      kmPorParada: Number((kmTotal / geolocalizadas.length).toFixed(2)),
    },
  };
}

/**
 * Costo de una ruta en el orden en que llegaron las guías (sin optimizar).
 * Sirve como línea base para mostrar el ahorro real al operador.
 */
export function lineaBase(paradas, deposito, opciones = {}) {
  const geo = paradas.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (!geo.length) return { km: 0, duracionMin: 0 };
  const matriz = matrizDistancias([deposito, ...geo], opciones.factorRuteo ?? FACTOR_RUTEO);
  const ctx = crearContexto(geo, matriz, opciones);
  const secuencia = geo.map((_, i) => i + 1);
  const e = evaluar(secuencia, ctx);
  return { km: Number(e.km.toFixed(2)), duracionMin: Math.round(e.duracionMin) };
}
