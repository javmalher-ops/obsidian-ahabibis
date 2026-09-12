/**
 * Pruebas del motor de optimización. Sin dependencias: `node --test`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  haversineKm,
  aMinutos,
  aHora,
  matrizDistancias,
  crearContexto,
  evaluar,
  optimizarSecuencia,
  agruparPorBarrido,
  planificar,
  lineaBase,
} from '../js/optimizador.js';

const CEDIS = { lat: 19.4326, lng: -99.1332 }; // Centro CDMX

test('haversine mide distancias reales conocidas', () => {
  const polanco = { lat: 19.4333, lng: -99.1908 };
  const d = haversineKm(CEDIS, polanco);
  assert.ok(d > 5.5 && d < 6.5, `esperaba ~6 km, obtuve ${d}`);
});

test('conversión de horas ida y vuelta', () => {
  assert.equal(aMinutos('09:30'), 570);
  assert.equal(aHora(570), '09:30');
  assert.equal(aMinutos(''), null);
  assert.equal(aMinutos('sin hora'), null);
});

test('la matriz es simétrica y con diagonal cero', () => {
  const puntos = [CEDIS, { lat: 19.5, lng: -99.2 }, { lat: 19.3, lng: -99.0 }];
  const m = matrizDistancias(puntos);
  for (let i = 0; i < 3; i++) {
    assert.equal(m[i][i], 0);
    for (let j = 0; j < 3; j++) assert.equal(m[i][j], m[j][i]);
  }
});

test('2-opt deshace el cruce de una ruta en cuadro', () => {
  // Cuatro esquinas de un cuadrado; el orden 1-3-2-4 se cruza, el óptimo no.
  const paradas = [
    { lat: 19.40, lng: -99.20 },
    { lat: 19.40, lng: -99.10 },
    { lat: 19.50, lng: -99.10 },
    { lat: 19.50, lng: -99.20 },
  ];
  const deposito = { lat: 19.45, lng: -99.15 };
  const matriz = matrizDistancias([deposito, ...paradas]);
  const ctx = crearContexto(paradas, matriz, {});
  const cruzada = evaluar([1, 3, 2, 4], ctx).km;
  const { km } = optimizarSecuencia([1, 2, 3, 4], ctx);
  assert.ok(km < cruzada, `optimizada ${km} debería ser menor que cruzada ${cruzada}`);
});

test('optimizar nunca empeora el orden de llegada de las guías', () => {
  // 40 paradas seudoaleatorias deterministas en el Valle de México.
  let semilla = 42;
  const aleatorio = () => {
    semilla = (semilla * 1103515245 + 12345) % 2147483648;
    return semilla / 2147483648;
  };
  const paradas = Array.from({ length: 40 }, () => ({
    lat: 19.30 + aleatorio() * 0.35,
    lng: -99.30 + aleatorio() * 0.35,
  }));
  const base = lineaBase(paradas, CEDIS, {});
  const plan = planificar(paradas, CEDIS, { unidades: 1 });
  assert.ok(
    plan.resumen.kmTotal <= base.km,
    `optimizada ${plan.resumen.kmTotal} km vs base ${base.km} km`,
  );
  // En una nube aleatoria el ahorro real ronda 50-70%.
  assert.ok(
    plan.resumen.kmTotal < base.km * 0.75,
    `ahorro insuficiente: ${plan.resumen.kmTotal} vs ${base.km}`,
  );
  assert.equal(plan.rutas[0].paradas.length, 40);
});

test('cada parada aparece exactamente una vez en el plan', () => {
  const paradas = Array.from({ length: 25 }, (_, i) => ({
    guia: `ML${i}`,
    lat: 19.35 + (i % 5) * 0.02,
    lng: -99.25 + Math.floor(i / 5) * 0.02,
  }));
  const plan = planificar(paradas, CEDIS, { unidades: 3 });
  const guias = plan.rutas.flatMap((r) => r.paradas.map((p) => p.guia));
  assert.equal(guias.length, 25);
  assert.equal(new Set(guias).size, 25);
});

test('el barrido respeta la capacidad de la unidad', () => {
  const paradas = Array.from({ length: 30 }, (_, i) => ({
    lat: 19.40 + Math.sin(i) * 0.05,
    lng: -99.15 + Math.cos(i) * 0.05,
    piezas: 2,
  }));
  const grupos = agruparPorBarrido(paradas, CEDIS, { unidades: 3, capacidad: 20 });
  assert.equal(grupos.flat().length, 30);
  for (const g of grupos) assert.ok(g.length * 2 <= 20, `grupo con ${g.length * 2} piezas`);
});

test('las ventanas horarias cambian el orden respecto a la ruta más corta', () => {
  const paradas = [
    { guia: 'A', lat: 19.50, lng: -99.10 },                                   // lejos, sin ventana
    { guia: 'B', lat: 19.44, lng: -99.14 },                                   // cerca, sin ventana
    { guia: 'C', lat: 19.52, lng: -99.08, ventanaInicio: '09:00', ventanaFin: '09:45' }, // lejos y urgente
  ];
  const sinVentanas = planificar(
    paradas.map(({ ventanaInicio, ventanaFin, ...r }) => r),
    CEDIS,
    { unidades: 1, salida: '09:00' },
  );
  const conVentanas = planificar(paradas, CEDIS, { unidades: 1, salida: '09:00' });
  const ordenSin = sinVentanas.rutas[0].paradas.map((p) => p.guia).join('');
  const ordenCon = conVentanas.rutas[0].paradas.map((p) => p.guia).join('');
  assert.notEqual(ordenSin, ordenCon);
  assert.equal(ordenCon[0], 'C', `la parada con ventana dura debe ir primero, obtuve ${ordenCon}`);
});

test('las paradas sin coordenadas se separan en vez de romper el plan', () => {
  const paradas = [
    { guia: 'A', lat: 19.44, lng: -99.14 },
    { guia: 'B', direccion: 'Calle sin geocodificar 123' },
    { guia: 'C', lat: 19.46, lng: -99.16 },
  ];
  const plan = planificar(paradas, CEDIS, { unidades: 1 });
  assert.equal(plan.resumen.paradas, 2);
  assert.equal(plan.sinCoordenadas.length, 1);
  assert.equal(plan.sinCoordenadas[0].guia, 'B');
});

test('ruta abierta (sin regreso a CEDIS) es más corta que cerrada', () => {
  const paradas = Array.from({ length: 12 }, (_, i) => ({
    lat: 19.40 + i * 0.01,
    lng: -99.20 + i * 0.01,
  }));
  const cerrada = planificar(paradas, CEDIS, { unidades: 1, abierta: false });
  const abierta = planificar(paradas, CEDIS, { unidades: 1, abierta: true });
  assert.ok(abierta.resumen.kmTotal < cerrada.resumen.kmTotal);
});

test('plan vacío no truena', () => {
  const plan = planificar([], CEDIS, { unidades: 2 });
  assert.equal(plan.rutas.length, 0);
  assert.equal(plan.resumen.kmTotal, 0);
});

test('el ETA avanza de forma monótona dentro de una ruta', () => {
  const paradas = Array.from({ length: 15 }, (_, i) => ({
    lat: 19.38 + (i % 4) * 0.03,
    lng: -99.22 + Math.floor(i / 4) * 0.03,
  }));
  const plan = planificar(paradas, CEDIS, { unidades: 1, salida: '08:00' });
  const etas = plan.rutas[0].paradas.map((p) => p.etaMin);
  for (let i = 1; i < etas.length; i++) assert.ok(etas[i] >= etas[i - 1]);
  assert.ok(etas[0] >= 480, 'la primera entrega no puede ser antes de la hora de salida');
});

test('el reparto entre unidades queda balanceado, no 4 paradas contra 11', () => {
  // Malla irregular: el caso que desbalanceaba al optimizar solo por distancia.
  const paradas = Array.from({ length: 60 }, (_, i) => ({
    lat: 19.36 + ((i * 37) % 23) * 0.006,
    lng: -99.21 + ((i * 53) % 19) * 0.008,
  }));
  const plan = planificar(paradas, CEDIS, { unidades: 4 });
  const conteos = plan.rutas.map((r) => r.paradas.length);
  const promedio = 60 / 4;
  for (const n of conteos) {
    assert.ok(
      n <= Math.ceil(promedio * 1.15),
      `una unidad quedó con ${n} paradas (reparto ${conteos.join('/')})`,
    );
  }
  assert.equal(conteos.reduce((a, b) => a + b, 0), 60);
});

test('la jornada reportada es la de la unidad más lenta, no la suma', () => {
  const paradas = Array.from({ length: 24 }, (_, i) => ({
    lat: 19.38 + (i % 6) * 0.02,
    lng: -99.22 + Math.floor(i / 6) * 0.02,
  }));
  const plan = planificar(paradas, CEDIS, { unidades: 3, salida: '09:00' });
  assert.ok(plan.resumen.jornadaMin <= plan.resumen.minutosTotal);
  assert.equal(
    plan.resumen.jornadaMin,
    Math.max(...plan.rutas.map((r) => r.duracionMin)),
  );
});
