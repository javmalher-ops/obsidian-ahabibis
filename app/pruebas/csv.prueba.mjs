import test from 'node:test';
import assert from 'node:assert/strict';
import { parsearCSV, aCSV, mapearColumnas, filasAParadas, normalizarHora } from '../js/csv.js';

test('parsea CSV con comas, comillas y BOM', () => {
  const texto = '﻿guia,destinatario,direccion\n123,"Pérez, Juan","Av. Reforma 100, Piso 2"\n';
  const { encabezados, filas } = parsearCSV(texto);
  assert.deepEqual(encabezados, ['guia', 'destinatario', 'direccion']);
  assert.equal(filas[0].destinatario, 'Pérez, Juan');
  assert.equal(filas[0].direccion, 'Av. Reforma 100, Piso 2');
});

test('detecta punto y coma, que es lo que exporta Excel en español', () => {
  const { filas } = parsearCSV('guia;cp\n43001;06600\n');
  assert.equal(filas[0].guia, '43001');
  assert.equal(filas[0].cp, '06600');
});

test('respeta saltos de línea dentro de un campo entrecomillado', () => {
  const { filas } = parsearCSV('guia,referencias\n1,"Portón negro\nfrente al Oxxo"\n');
  assert.equal(filas.length, 1);
  assert.match(filas[0].referencias, /Oxxo/);
});

test('mapea encabezados reales aunque vengan con otro nombre', () => {
  const mapa = mapearColumnas([
    'Número de Guía', 'Nombre del Comprador', 'Domicilio', 'Col.', 'Alcaldía', 'C.P.', 'Celular',
  ]);
  assert.equal(mapa.guia, 'Número de Guía');
  assert.equal(mapa.destinatario, 'Nombre del Comprador');
  assert.equal(mapa.direccion, 'Domicilio');
  assert.equal(mapa.colonia, 'Col.');
  assert.equal(mapa.municipio, 'Alcaldía');
  assert.equal(mapa.cp, 'C.P.');
  assert.equal(mapa.telefono, 'Celular');
});

test('convierte filas a paradas con piezas y coordenadas saneadas', () => {
  const { encabezados, filas } = parsearCSV(
    'Guia,Domicilio,Piezas,Lat,Lng\n43001,Reforma 100,3,19.4326,-99.1332\n43002,Juárez 5,,999,-99\n',
  );
  const paradas = filasAParadas(filas, encabezados);
  assert.equal(paradas[0].piezas, 3);
  assert.equal(paradas[0].lat, 19.4326);
  assert.equal(paradas[1].piezas, 1, 'sin piezas se asume 1');
  assert.equal(paradas[1].lat, null, 'una latitud imposible se descarta');
});

test('normaliza horarios en los formatos que escribe la gente', () => {
  assert.equal(normalizarHora('9'), '09:00');
  assert.equal(normalizarHora('9:30'), '09:30');
  assert.equal(normalizarHora('2:15 p.m.'), '14:15');
  assert.equal(normalizarHora('12:00 am'), '00:00');
  assert.equal(normalizarHora(''), '');
  assert.equal(normalizarHora('cuando sea'), '');
});

test('ida y vuelta: lo que exporto lo puedo volver a leer', () => {
  const filas = [{ guia: '43001', destinatario: 'Pérez; Juan', notas: 'dice "ya voy"' }];
  const vuelta = parsearCSV(aCSV(filas));
  assert.deepEqual(vuelta.filas[0], filas[0]);
});
