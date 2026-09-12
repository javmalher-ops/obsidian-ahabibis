/**
 * Interfaz de la app. Conecta el almacén, el escáner, la geocodificación y el
 * optimizador. Toda la lógica que se puede probar sin navegador vive en los
 * otros módulos; aquí solo queda el pegamento y el DOM.
 */

import {
  cargar, obtener, actualizar, suscribir, ESTATUS, MOTIVOS_NO_ENTREGA,
  inducirGuia, importarParadas, actualizarParada, eliminarParada, cerrarParada,
  buscarPorGuia, direccionCompleta, normalizarGuia, kpis, cerrarDia, hoy,
} from './almacen.js';
import { parsearCSV, filasAParadas, aCSV } from './csv.js';
import {
  geocodificar, geocodificarLote, rellenarPorCP, posicionActual,
  enlacesNavegacion, tramosNavegables, tamanoCache, limpiarCache,
} from './geo.js';
import { iniciarCamara, escucharLectorFisico, retroalimentar } from './escaneo.js';
import { planificar, lineaBase } from './optimizador.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

let vistaActual = 'induccion';
let apagarCamara = null;
let detenerGeo = false;
let mapa = null;
let capaMapa = null;
const leidasRecientes = [];

// ----------------------------------------------------------------- utilidades

function avisar(texto, tipo = 'ok', contenedor = '#aviso-escaneo') {
  const caja = $(contenedor);
  if (!caja) return;
  caja.innerHTML = `<div class="aviso ${tipo}">${texto}</div>`;
  clearTimeout(caja._reloj);
  caja._reloj = setTimeout(() => (caja.innerHTML = ''), 4500);
}

function descargar(nombre, contenido, tipo = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const escapar = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const tieneCoords = (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng);

// ---------------------------------------------------------------- navegación

function mostrar(vista) {
  vistaActual = vista;
  $$('.vista').forEach((s) => (s.hidden = s.id !== `vista-${vista}`));
  $$('nav.barra button').forEach((b) =>
    b.setAttribute('aria-current', b.dataset.vista === vista ? 'page' : 'false'));
  if (vista !== 'induccion' && apagarCamara) apagarCamaraYa();
  render();
}

// ------------------------------------------------------------------- escaneo

function procesarLectura(crudo) {
  const guia = normalizarGuia(crudo);
  if (!guia) return;
  const modo = $('#modo-escaneo').value;

  if (modo === 'carga') {
    const parada = buscarPorGuia(guia);
    if (!parada) {
      retroalimentar(false);
      avisar(`⛔ ${escapar(guia)} no está en el manifiesto de hoy. No la subas.`, 'mal');
      return;
    }
    if (parada.estatus === 'en_ruta') {
      retroalimentar(false);
      avisar(`⚠️ ${escapar(guia)} ya estaba cargada.`, 'ojo');
      return;
    }
    actualizarParada(parada.id, { estatus: 'en_ruta' });
    retroalimentar(true);
    avisar(`✅ Cargada · ${escapar(parada.destinatario || guia)}`, 'ok');
    registrarReciente(guia, 'Cargada a unidad');
    return;
  }

  const r = inducirGuia(guia);
  if (!r.ok) {
    retroalimentar(false);
    avisar(`⚠️ ${escapar(guia)}: ${escapar(r.motivo)}`, 'ojo');
    return;
  }
  retroalimentar(true);
  avisar(`✅ Inducida ${escapar(guia)}`, 'ok');
  registrarReciente(guia, 'Inducida');
}

function registrarReciente(guia, accion) {
  leidasRecientes.unshift({ guia, accion, hora: new Date().toLocaleTimeString('es-MX') });
  leidasRecientes.length = Math.min(leidasRecientes.length, 25);
  renderLeidas();
}

function renderLeidas() {
  const ul = $('#lista-leidas');
  $('#conteo-leidas').textContent = `· ${obtener().paradas.length} en el día`;
  if (!leidasRecientes.length) {
    ul.innerHTML = '<li class="vacio-msg">Aún no escaneas ninguna guía.</li>';
    return;
  }
  ul.innerHTML = leidasRecientes
    .map((l) => `<li><div class="crece-li"><div class="guia">${escapar(l.guia)}</div>
      <div class="sub">${escapar(l.accion)} · ${escapar(l.hora)}</div></div></li>`)
    .join('');
}

async function encenderCamara() {
  $('#caja-camara').hidden = false;
  $('#btn-camara').disabled = true;
  apagarCamara = await iniciarCamara(
    $('#video'),
    procesarLectura,
    (msg) => {
      avisar(escapar(msg), 'mal');
      apagarCamaraYa();
    },
  );
}

function apagarCamaraYa() {
  apagarCamara?.();
  apagarCamara = null;
  $('#caja-camara').hidden = true;
  $('#btn-camara').disabled = false;
}

// ---------------------------------------------------------------- manifiesto

async function cargarArchivo(archivo) {
  const texto = await archivo.text();
  const { encabezados, filas } = parsearCSV(texto);
  if (!filas.length) {
    avisar('El archivo no trae filas legibles.', 'mal', '#resumen-geo');
    return;
  }
  const paradas = filasAParadas(filas, encabezados);
  const conGuia = paradas.filter((p) => p.guia);
  if (!conGuia.length) {
    alert(
      'No encontré una columna de guía en el archivo.\n\nEncabezados leídos:\n' +
        encabezados.join(', '),
    );
    return;
  }
  const { agregadas, repetidas } = importarParadas(conGuia);
  alert(
    `Manifiesto cargado.\n\n${agregadas} guías nuevas` +
      (repetidas ? `\n${repetidas} repetidas (ignoradas)` : '') +
      (paradas.length - conGuia.length ? `\n${paradas.length - conGuia.length} filas sin guía` : ''),
  );
  render();
}

async function correrGeocodificacion() {
  const e = obtener();
  const pendientes = e.paradas.filter((p) => !tieneCoords(p));
  if (!pendientes.length) {
    avisar('Todas las paradas ya tienen ubicación.', 'ok', '#resumen-geo');
    return;
  }
  if (e.config.geocodificador === 'nominatim' && pendientes.length > 40) {
    const seguir = confirm(
      `Son ${pendientes.length} direcciones y OpenStreetMap permite una por segundo: ` +
        `unos ${Math.ceil(pendientes.length * 1.1 / 60)} minutos.\n\n` +
        'Para volumen diario conviene configurar una clave de Google en la pestaña Cierre.\n\n¿Continuar?',
    );
    if (!seguir) return;
  }

  detenerGeo = false;
  $('#btn-geo').disabled = true;
  $('#btn-geo-parar').hidden = false;
  $('#barra-geo').hidden = false;
  let fallidas = 0;

  await geocodificarLote(
    pendientes,
    e.config,
    (hechas, total, parada, resultado) => {
      $('#barra-geo i').style.width = `${(hechas / total) * 100}%`;
      $('#resumen-geo').textContent = `Ubicando ${hechas} de ${total}…`;
      if (resultado && !resultado.error) {
        actualizarParada(parada.id, {
          lat: resultado.lat,
          lng: resultado.lng,
          geoFuente: resultado.fuente + (resultado.precision === 'aproximada-colonia' ? ' (colonia)' : ''),
        });
      } else {
        fallidas++;
      }
    },
    () => detenerGeo,
  );

  $('#btn-geo').disabled = false;
  $('#btn-geo-parar').hidden = true;
  $('#barra-geo').hidden = true;
  avisar(
    fallidas
      ? `Listo, pero ${fallidas} direcciones no se pudieron ubicar. Usa "Rellenar por CP" o corrígelas a mano.`
      : 'Todas las direcciones quedaron ubicadas.',
    fallidas ? 'ojo' : 'ok',
    '#resumen-geo',
  );
  render();
}

function rellenarCP() {
  const rellenadas = rellenarPorCP(obtener().paradas);
  for (const r of rellenadas) actualizarParada(r.id, r);
  avisar(
    rellenadas.length
      ? `${rellenadas.length} paradas colocadas en el centro de su CP. Sirven para rutear, no para tocar la puerta.`
      : 'No hay CPs con vecinas ya ubicadas para estimar.',
    rellenadas.length ? 'ojo' : 'mal',
    '#resumen-geo',
  );
  render();
}

function renderManifiesto() {
  const e = obtener();
  const filtro = ($('#buscar-parada')?.value ?? '').toLowerCase().trim();
  const visibles = filtro
    ? e.paradas.filter((p) =>
        [p.guia, p.destinatario, p.colonia, p.cp, p.municipio]
          .join(' ').toLowerCase().includes(filtro))
    : e.paradas;

  $('#conteo-paradas').textContent = `· ${visibles.length} de ${e.paradas.length}`;
  const sinUbicar = e.paradas.filter((p) => !tieneCoords(p)).length;
  $('#resumen-geo').textContent = e.paradas.length
    ? `${e.paradas.length - sinUbicar} ubicadas · ${sinUbicar} sin ubicar`
    : 'Carga un manifiesto o escanea guías para empezar.';

  const cuerpo = $('#tabla-paradas tbody');
  if (!visibles.length) {
    cuerpo.innerHTML = '<tr><td colspan="9" class="vacio-msg">Sin paradas.</td></tr>';
    return;
  }
  cuerpo.innerHTML = visibles
    .map((p) => {
      const ventana = p.ventanaInicio || p.ventanaFin ? `${p.ventanaInicio || '—'}→${p.ventanaFin || '—'}` : '—';
      const ubic = tieneCoords(p)
        ? `<span class="etiqueta e-entregado">${escapar(p.geoFuente || 'sí')}</span>`
        : '<span class="etiqueta e-no_entregado">falta</span>';
      return `<tr data-id="${p.id}">
        <td class="guia">${escapar(p.guia)}</td>
        <td>${escapar(p.destinatario) || '—'}</td>
        <td>${escapar(p.direccion) || '—'}</td>
        <td>${escapar(p.colonia) || '—'}</td>
        <td>${escapar(p.cp) || '—'}</td>
        <td>${escapar(ventana)}</td>
        <td>${ubic}</td>
        <td><span class="etiqueta e-${p.estatus}">${escapar(ESTATUS[p.estatus] ?? p.estatus)}</span></td>
        <td><button class="editar" data-id="${p.id}" style="min-height:32px;padding:4px 9px">✏️</button></td>
      </tr>`;
    })
    .join('');
}

function editarParada(id) {
  const p = obtener().paradas.find((x) => x.id === id);
  if (!p) return;
  const campos = [
    ['destinatario', 'Destinatario'], ['direccion', 'Calle y número'], ['colonia', 'Colonia'],
    ['municipio', 'Municipio o alcaldía'], ['cp', 'Código postal'], ['telefono', 'Teléfono'],
    ['ventanaInicio', 'Ventana desde (HH:MM)'], ['ventanaFin', 'Ventana hasta (HH:MM)'],
  ];
  const cambios = {};
  for (const [campo, etiqueta] of campos) {
    const v = prompt(`${etiqueta}:`, p[campo] ?? '');
    if (v === null) return;
    cambios[campo] = v.trim();
  }
  // Si cambió la dirección, la coordenada anterior ya no vale.
  if (cambios.direccion !== p.direccion || cambios.cp !== p.cp) {
    cambios.lat = null;
    cambios.lng = null;
    cambios.geoFuente = '';
  }
  actualizarParada(id, cambios);
  render();
}

// --------------------------------------------------------------------- ruta

function leerConfigDeFormulario() {
  const num = (sel, porDefecto) => {
    const v = Number($(sel).value);
    return Number.isFinite(v) && v > 0 ? v : porDefecto;
  };
  actualizar((e) => ({
    ...e,
    cedis: {
      ...e.cedis,
      direccion: $('#cedis-direccion').value.trim(),
      lat: Number($('#cedis-lat').value) || null,
      lng: Number($('#cedis-lng').value) || null,
    },
    config: {
      ...e.config,
      unidades: num('#cfg-unidades', 1),
      capacidad: num('#cfg-capacidad', 150),
      salida: $('#cfg-salida').value || '09:00',
      velocidadKmh: num('#cfg-velocidad', 18),
      minutosServicio: num('#cfg-servicio', 4),
      abierta: $('#cfg-abierta').value === 'true',
    },
  }));
}

function optimizar() {
  leerConfigDeFormulario();
  const e = obtener();
  if (!Number.isFinite(e.cedis.lat) || !Number.isFinite(e.cedis.lng)) {
    alert('Primero fija el CEDIS: busca la dirección o usa tu ubicación actual.');
    return;
  }
  // Solo se rutea lo que sigue vivo: entregadas y devueltas ya no ocupan al repartidor.
  const aRutear = e.paradas.filter((p) => p.estatus === 'inducida' || p.estatus === 'en_ruta');
  if (!aRutear.length) {
    alert('No hay paradas pendientes que rutear.');
    return;
  }

  $('#estado-optimizacion').textContent = 'Calculando…';
  // Un respiro para que el navegador pinte el mensaje antes de bloquear el hilo.
  setTimeout(() => {
    const t0 = performance.now();
    const opciones = {
      unidades: e.config.unidades,
      capacidad: e.config.capacidad,
      salida: e.config.salida,
      abierta: e.config.abierta,
      velocidadKmh: e.config.velocidadKmh,
      minutosServicio: e.config.minutosServicio,
      factorRuteo: e.config.factorRuteo,
    };
    const base = lineaBase(aRutear, e.cedis, opciones);
    const plan = planificar(aRutear, e.cedis, opciones);
    plan.lineaBase = base;
    plan.ms = Math.round(performance.now() - t0);

    // La unidad asignada se guarda en cada parada para la vista de entrega.
    // En una sola escritura: con 1,500 guías, hacerlo una por una serializaría
    // el estado completo 1,500 veces y congelaría el teléfono.
    const unidadPorId = new Map();
    for (const ruta of plan.rutas) {
      for (const parada of ruta.paradas) unidadPorId.set(parada.id, ruta.unidad);
    }
    actualizar((est) => ({
      ...est,
      paradas: est.paradas.map((p) =>
        unidadPorId.has(p.id) ? { ...p, unidad: unidadPorId.get(p.id) } : p),
      plan,
      planCalculadoEn: new Date().toISOString(),
    }));
    $('#estado-optimizacion').textContent =
      `Calculado en ${plan.ms} ms · ${plan.resumen.paradas} paradas en ${plan.resumen.unidades} unidad(es).`;
    render();
  }, 30);
}

function renderRuta() {
  const e = obtener();
  $('#cedis-direccion').value = e.cedis.direccion ?? '';
  $('#cedis-lat').value = e.cedis.lat ?? '';
  $('#cedis-lng').value = e.cedis.lng ?? '';
  $('#cfg-unidades').value = e.config.unidades;
  $('#cfg-capacidad').value = e.config.capacidad;
  $('#cfg-salida').value = e.config.salida;
  $('#cfg-velocidad').value = e.config.velocidadKmh;
  $('#cfg-servicio').value = e.config.minutosServicio;
  $('#cfg-abierta').value = String(e.config.abierta);

  const plan = e.plan;
  $('#caja-resultado').hidden = !plan;
  if (!plan) return;

  const ahorro = plan.lineaBase?.km
    ? Math.round((1 - plan.resumen.kmTotal / plan.lineaBase.km) * 100)
    : 0;
  $('#kpis-ruta').innerHTML = `
    <div class="kpi"><div class="n">${plan.resumen.kmTotal}</div><div class="t">km totales</div></div>
    <div class="kpi"><div class="n">${plan.resumen.paradas}</div><div class="t">paradas</div></div>
    <div class="kpi"><div class="n">${plan.resumen.kmPorParada}</div><div class="t">km por parada</div></div>
    <div class="kpi"><div class="n">${(plan.resumen.jornadaMin / 60).toFixed(1)} h</div><div class="t">jornada más larga</div></div>
    <div class="kpi"><div class="n">${ahorro}%</div><div class="t">menos km que sin ordenar</div></div>
    ${plan.resumen.unidades > 1 ? `<div class="kpi"><div class="n">${plan.resumen.paradasMin}–${plan.resumen.paradasMax}</div><div class="t">paradas por unidad</div></div>` : ''}
    ${plan.resumen.retrasoMin ? `<div class="kpi"><div class="n">${plan.resumen.retrasoMin}</div><div class="t">min fuera de ventana</div></div>` : ''}`;

  const sel = $('#sel-unidad');
  const elegida = sel.value || '1';
  sel.innerHTML = plan.rutas
    .map((r) => `<option value="${r.unidad}">Unidad ${r.unidad} · ${r.paradas.length} paradas · ${r.distanciaKm} km · regresa ${r.horaRegreso}</option>`)
    .join('');
  sel.value = plan.rutas.some((r) => String(r.unidad) === elegida) ? elegida : '1';

  const ruta = plan.rutas.find((r) => String(r.unidad) === sel.value) ?? plan.rutas[0];
  $('#lista-ruta').innerHTML = ruta.paradas
    .map((p) => `<li>
      <div class="orden">${p.orden}</div>
      <div class="crece-li">
        <div class="guia">${escapar(p.guia)} <span class="tenue">· ${p.eta}</span></div>
        <div class="sub">${escapar(p.destinatario || 'Sin nombre')} — ${escapar(p.direccion || direccionCompleta(p))}</div>
        <div class="sub">${escapar(p.colonia || '')} ${escapar(p.cp || '')} · ${p.distanciaDesdeAnteriorKm} km del anterior</div>
      </div>
      <a class="boton" style="min-height:36px;padding:6px 10px" target="_blank" rel="noopener"
         href="${enlacesNavegacion(p).google}">🧭</a>
    </li>`)
    .join('');

  const sinUbicar = plan.sinCoordenadas ?? [];
  $('#sin-ubicar').innerHTML = sinUbicar.length
    ? `<div class="aviso ojo" style="margin-top:10px">${sinUbicar.length} guías quedaron fuera de la ruta por no tener ubicación:
       ${sinUbicar.slice(0, 8).map((p) => escapar(p.guia)).join(', ')}${sinUbicar.length > 8 ? '…' : ''}</div>`
    : '';

  dibujarMapa(ruta, e.cedis);
}

function dibujarMapa(ruta, cedis) {
  const caja = $('#mapa');
  if (!window.L) {
    caja.classList.add('vacio');
    caja.textContent = 'El mapa necesita conexión. La lista de abajo funciona sin señal.';
    return;
  }
  caja.classList.remove('vacio');
  if (!mapa) {
    mapa = L.map('mapa');
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(mapa);
  }
  capaMapa?.remove();
  capaMapa = L.layerGroup().addTo(mapa);

  const puntos = ruta.paradas.filter(tieneCoords);
  L.marker([cedis.lat, cedis.lng], { title: 'CEDIS' })
    .bindPopup('CEDIS · salida').addTo(capaMapa);
  for (const p of puntos) {
    L.circleMarker([p.lat, p.lng], {
      radius: 9, color: '#13161b', weight: 1, fillColor: '#ffe600', fillOpacity: 0.95,
    })
      .bindTooltip(String(p.orden), { permanent: true, direction: 'center', className: 'etq-orden' })
      .bindPopup(`<b>${escapar(p.guia)}</b><br>${escapar(p.destinatario || '')}<br>${escapar(direccionCompleta(p))}<br>ETA ${p.eta}`)
      .addTo(capaMapa);
  }
  const linea = [[cedis.lat, cedis.lng], ...puntos.map((p) => [p.lat, p.lng])];
  if (!obtener().config.abierta) linea.push([cedis.lat, cedis.lng]);
  L.polyline(linea, { color: '#4c9aff', weight: 3, opacity: 0.75 }).addTo(capaMapa);
  mapa.fitBounds(L.latLngBounds(linea).pad(0.12));
  setTimeout(() => mapa.invalidateSize(), 60);
}

// ------------------------------------------------------------------ entrega

function renderEntrega() {
  const e = obtener();
  const plan = e.plan;
  const sel = $('#sel-unidad-entrega');
  if (!plan) {
    $('#parada-actual').innerHTML = '<p class="vacio-msg">Primero calcula la ruta en la pestaña Ruta.</p>';
    $('#lista-pendientes').innerHTML = '';
    sel.innerHTML = '';
    return;
  }
  const previa = sel.value || '1';
  sel.innerHTML = plan.rutas.map((r) => `<option value="${r.unidad}">Unidad ${r.unidad}</option>`).join('');
  sel.value = plan.rutas.some((r) => String(r.unidad) === previa) ? previa : '1';

  const ruta = plan.rutas.find((r) => String(r.unidad) === sel.value) ?? plan.rutas[0];
  const vivas = ruta.paradas
    .map((p) => ({ ...p, ...(e.paradas.find((x) => x.id === p.id) ?? {}), orden: p.orden, eta: p.eta }))
    .filter((p) => p.estatus === 'inducida' || p.estatus === 'en_ruta');

  const actual = vivas[0];
  if (!actual) {
    $('#parada-actual').innerHTML = '<p class="vacio-msg">🎉 Unidad sin pendientes. Todo cerrado.</p>';
    $('#lista-pendientes').innerHTML = '';
    return;
  }

  const enlaces = enlacesNavegacion(actual);
  $('#parada-actual').innerHTML = `
    <div style="font-size:12px;color:var(--texto-tenue)">Parada ${actual.orden} de ${ruta.paradas.length} · ETA ${actual.eta}</div>
    <div style="font-size:19px;font-weight:800;margin:4px 0">${escapar(actual.destinatario || 'Sin nombre')}</div>
    <div class="guia">${escapar(actual.guia)}</div>
    <div style="margin:8px 0">${escapar(direccionCompleta(actual))}</div>
    ${actual.referencias ? `<div class="tenue">📌 ${escapar(actual.referencias)}</div>` : ''}
    ${actual.ventanaInicio || actual.ventanaFin ? `<div class="tenue">🕐 Ventana ${escapar(actual.ventanaInicio || '—')} a ${escapar(actual.ventanaFin || '—')}</div>` : ''}
    <div class="fila" style="margin-top:12px">
      <a class="boton primario" target="_blank" rel="noopener" href="${enlaces.google}">🧭 Navegar</a>
      <a class="boton" target="_blank" rel="noopener" href="${enlaces.waze}">Waze</a>
      ${actual.telefono ? `<a class="boton" href="tel:${escapar(actual.telefono)}">📞 Llamar</a>` : ''}
    </div>
    <div class="fila" style="margin-top:8px">
      <button class="primario cerrar-parada" data-id="${actual.id}">Registrar resultado</button>
    </div>`;

  $('#lista-pendientes').innerHTML = vivas
    .slice(1)
    .map((p) => `<li>
      <div class="orden">${p.orden}</div>
      <div class="crece-li">
        <div class="guia">${escapar(p.guia)} <span class="tenue">· ${p.eta}</span></div>
        <div class="sub">${escapar(p.destinatario || '')} — ${escapar(p.colonia || p.direccion || '')}</div>
      </div>
      <button class="cerrar-parada" data-id="${p.id}" style="min-height:36px;padding:6px 10px">✓</button>
    </li>`)
    .join('') || '<li class="vacio-msg">Es la última de la unidad.</li>';
}

let paradaEnDialogo = null;

function abrirDialogo(id) {
  const p = obtener().paradas.find((x) => x.id === id);
  if (!p) return;
  paradaEnDialogo = p;
  $('#dlg-guia').textContent = `${p.guia} · ${p.destinatario || 'Sin nombre'}`;
  $('#dlg-estatus').value = 'entregado';
  $('#dlg-recibio').value = '';
  $('#dlg-motivo').innerHTML = MOTIVOS_NO_ENTREGA.map((m) => `<option>${m}</option>`).join('');
  sincronizarDialogo();
  $('#dialogo-resultado').showModal();
}

function sincronizarDialogo() {
  const entregado = $('#dlg-estatus').value === 'entregado';
  $('#caja-motivo').hidden = entregado;
  $('#caja-recibio').hidden = !entregado;
}

async function guardarDialogo() {
  if (!paradaEnDialogo) return;
  const estatus = $('#dlg-estatus').value;
  const gps = await posicionActual();
  cerrarParada(paradaEnDialogo.id, {
    estatus,
    motivo: estatus === 'entregado' ? '' : $('#dlg-motivo').value,
    recibio: estatus === 'entregado' ? $('#dlg-recibio').value.trim() : '',
    gps,
  });
  retroalimentar(estatus === 'entregado');
  $('#dialogo-resultado').close();
  paradaEnDialogo = null;
  render();
}

// ------------------------------------------------------------------- cierre

const COLUMNAS_CIERRE = [
  'Fecha', 'Guia', 'Destinatario', 'Direccion', 'Colonia', 'Municipio', 'Estado', 'CP',
  'Telefono', 'Piezas', 'Unidad', 'Orden', 'ETA', 'Estatus', 'Motivo', 'Recibio',
  'Hora_Cierre', 'Lat', 'Lng', 'GPS_Entrega',
];

function filasCierre(soloFallidas = false) {
  const e = obtener();
  const orden = new Map();
  for (const r of e.plan?.rutas ?? []) {
    for (const p of r.paradas) orden.set(p.id, { orden: p.orden, eta: p.eta });
  }
  return e.paradas
    .filter((p) => (soloFallidas ? p.estatus === 'no_entregado' || p.estatus === 'reprogramado' : true))
    .map((p) => ({
      Fecha: e.fecha,
      Guia: p.guia,
      Destinatario: p.destinatario,
      Direccion: p.direccion,
      Colonia: p.colonia,
      Municipio: p.municipio,
      Estado: p.estado,
      CP: p.cp,
      Telefono: p.telefono,
      Piezas: p.piezas,
      Unidad: p.unidad ?? '',
      Orden: orden.get(p.id)?.orden ?? '',
      ETA: orden.get(p.id)?.eta ?? '',
      Estatus: ESTATUS[p.estatus] ?? p.estatus,
      Motivo: p.motivo,
      Recibio: p.recibio,
      Hora_Cierre: p.entregadaEn ? new Date(p.entregadaEn).toLocaleString('es-MX') : '',
      Lat: p.lat ?? '',
      Lng: p.lng ?? '',
      GPS_Entrega: p.gps ? `${p.gps.lat},${p.gps.lng} (±${p.gps.precisionM}m)` : '',
    }));
}

function renderCierre() {
  const k = kpis();
  const e = obtener();
  $('#kpis-cierre').innerHTML = `
    <div class="kpi"><div class="n">${k.total}</div><div class="t">guías del día</div></div>
    <div class="kpi"><div class="n">${k.entregadas}</div><div class="t">entregadas</div></div>
    <div class="kpi"><div class="n">${k.noEntregadas}</div><div class="t">no entregadas</div></div>
    <div class="kpi"><div class="n">${k.pendientes}</div><div class="t">pendientes</div></div>
    <div class="kpi"><div class="n">${k.efectividad}%</div><div class="t">efectividad</div></div>
    <div class="kpi"><div class="n">${k.kmPorEntrega}</div><div class="t">km por entrega</div></div>`;

  $('#lista-motivos').innerHTML = k.motivos.length
    ? k.motivos
        .map(([m, n]) => `<li><div class="crece-li">${escapar(m)}</div><div class="orden">${n}</div></li>`)
        .join('')
    : '<li class="vacio-msg">Sin no-entregas registradas.</li>';

  $('#cfg-geocodificador').value = e.config.geocodificador;
  $('#cfg-clave-google').value = e.config.claveGoogle ?? '';
  $('#caja-clave-google').hidden = e.config.geocodificador !== 'google';
  $('#info-cache').textContent = `${tamanoCache()} direcciones en caché local.`;
}

// ------------------------------------------------------------------- render

function render() {
  const e = obtener();
  const pendientes = e.paradas.filter((p) => p.estatus === 'inducida' || p.estatus === 'en_ruta').length;
  $('#estado-dia').innerHTML = `${e.fecha}<br>${e.paradas.length} guías · ${pendientes} pendientes`;

  if (vistaActual === 'induccion') renderLeidas();
  if (vistaActual === 'manifiesto') renderManifiesto();
  if (vistaActual === 'ruta') renderRuta();
  if (vistaActual === 'entrega') renderEntrega();
  if (vistaActual === 'cierre') renderCierre();
}

// -------------------------------------------------------------------- inicio

function conectarEventos() {
  $$('nav.barra button').forEach((b) => b.addEventListener('click', () => mostrar(b.dataset.vista)));

  // Escaneo
  $('#btn-camara').addEventListener('click', encenderCamara);
  $('#btn-apagar-camara').addEventListener('click', apagarCamaraYa);
  $('#btn-manual').addEventListener('click', () => {
    const v = prompt('Número de guía:');
    if (v) procesarLectura(v);
  });
  escucharLectorFisico((texto) => {
    if (vistaActual === 'induccion') procesarLectura(texto);
  });

  // Manifiesto
  $('#archivo-csv').addEventListener('change', (ev) => {
    const f = ev.target.files?.[0];
    if (f) cargarArchivo(f);
    ev.target.value = '';
  });
  $('#btn-ejemplo').addEventListener('click', async () => {
    try {
      const r = await fetch('datos/ejemplo-manifiesto.csv');
      const texto = await r.text();
      await cargarArchivo(new File([texto], 'ejemplo.csv', { type: 'text/csv' }));
    } catch {
      alert('No se pudo leer el archivo de ejemplo (¿estás sin conexión y sin caché?).');
    }
  });
  $('#btn-exportar-manifiesto').addEventListener('click', () =>
    descargar(`manifiesto-${hoy()}.csv`, aCSV(filasCierre(), COLUMNAS_CIERRE)));
  $('#btn-geo').addEventListener('click', correrGeocodificacion);
  $('#btn-geo-parar').addEventListener('click', () => { detenerGeo = true; });
  $('#btn-geo-cp').addEventListener('click', rellenarCP);
  $('#buscar-parada').addEventListener('input', renderManifiesto);
  $('#tabla-paradas').addEventListener('click', (ev) => {
    const b = ev.target.closest('.editar');
    if (b) editarParada(b.dataset.id);
  });

  // Ruta
  $('#btn-optimizar').addEventListener('click', optimizar);
  $('#sel-unidad').addEventListener('change', renderRuta);
  $('#btn-cedis-gps').addEventListener('click', async () => {
    const pos = await posicionActual();
    if (!pos) return alert('No se pudo leer el GPS. Revisa los permisos de ubicación.');
    $('#cedis-lat').value = pos.lat.toFixed(6);
    $('#cedis-lng').value = pos.lng.toFixed(6);
    leerConfigDeFormulario();
  });
  $('#btn-cedis-buscar').addEventListener('click', async () => {
    const direccion = $('#cedis-direccion').value.trim();
    if (!direccion) return alert('Escribe la dirección del CEDIS.');
    const r = await geocodificar({ direccion }, obtener().config);
    if (!r || r.error) return alert('No encontré esa dirección. Captura latitud y longitud a mano.');
    $('#cedis-lat').value = r.lat.toFixed(6);
    $('#cedis-lng').value = r.lng.toFixed(6);
    leerConfigDeFormulario();
  });
  $('#btn-navegar-todo').addEventListener('click', () => {
    const e = obtener();
    const ruta = e.plan?.rutas.find((r) => String(r.unidad) === $('#sel-unidad').value);
    if (!ruta) return;
    const tramos = tramosNavegables(ruta.paradas, e.cedis);
    if (!tramos.length) return alert('Esta unidad no tiene paradas ubicadas.');
    const cual = tramos.length === 1
      ? 1
      : Number(prompt(
          `Google Maps acepta 10 puntos por enlace, así que la ruta va en ${tramos.length} tramos:\n` +
            tramos.map((t, i) => `${i + 1}) paradas ${t.desde} a ${t.hasta}`).join('\n') +
            '\n\n¿Cuál abro?', '1'));
    const t = tramos[(cual || 1) - 1];
    if (t) window.open(t.url, '_blank', 'noopener');
  });
  $('#btn-exportar-ruta').addEventListener('click', () =>
    descargar(`ruta-${hoy()}.csv`, aCSV(filasCierre(), COLUMNAS_CIERRE)));

  // Entrega
  $('#sel-unidad-entrega').addEventListener('change', renderEntrega);
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('.cerrar-parada');
    if (b) abrirDialogo(b.dataset.id);
  });
  $('#dlg-estatus').addEventListener('change', sincronizarDialogo);
  $('#dlg-guardar').addEventListener('click', guardarDialogo);
  $('#dlg-cancelar').addEventListener('click', () => $('#dialogo-resultado').close());

  // Cierre
  $('#btn-exportar-cierre').addEventListener('click', () =>
    descargar(`cierre-${hoy()}.csv`, aCSV(filasCierre(), COLUMNAS_CIERRE)));
  $('#btn-exportar-fallidas').addEventListener('click', () =>
    descargar(`no-entregadas-${hoy()}.csv`, aCSV(filasCierre(true), COLUMNAS_CIERRE)));
  $('#cfg-geocodificador').addEventListener('change', (ev) => {
    actualizar((e) => ({ ...e, config: { ...e.config, geocodificador: ev.target.value } }));
    renderCierre();
  });
  $('#cfg-clave-google').addEventListener('change', (ev) =>
    actualizar((e) => ({ ...e, config: { ...e.config, claveGoogle: ev.target.value.trim() } })));
  $('#btn-limpiar-cache').addEventListener('click', () => {
    limpiarCache();
    renderCierre();
  });
  $('#btn-cerrar-dia').addEventListener('click', () => {
    const k = kpis();
    if (k.pendientes && !confirm(`Quedan ${k.pendientes} guías sin cerrar. ¿Vaciar el día de todos modos?`)) return;
    if (!confirm('Esto borra las guías del día en este dispositivo. ¿Ya exportaste el cierre?')) return;
    cerrarDia();
    leidasRecientes.length = 0;
    render();
  });
}

function iniciar() {
  cargar();
  // Si el estado guardado es de otro día, se archiva solo para no mezclar.
  const e = obtener();
  if (e.fecha !== hoy() && e.paradas.length) {
    const seguir = confirm(
      `Hay ${e.paradas.length} guías del ${e.fecha} sin cerrar. ` +
        '¿Continuar con ellas? (Cancelar las deja igual, sin borrar nada.)',
    );
    if (seguir) actualizar({ fecha: hoy() });
  }
  conectarEventos();
  suscribir(() => {
    const est = obtener();
    const pend = est.paradas.filter((p) => p.estatus === 'inducida' || p.estatus === 'en_ruta').length;
    $('#estado-dia').innerHTML = `${est.fecha}<br>${est.paradas.length} guías · ${pend} pendientes`;
  });
  mostrar('induccion');

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* sin service worker la app sigue funcionando, solo pierde el modo offline */
    });
  }
}

iniciar();
