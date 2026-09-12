# Ruta · Última Milla

App de reparto para la operación de última milla: **escanear guías, armar la ruta
más corta del día y cerrar cada entrega**, funcionando dentro de la unidad
aunque no haya señal.

Es una PWA: se abre en el navegador del celular y se instala como app desde el
menú (*Agregar a pantalla de inicio*). No hay tienda de apps, no hay servidor, no
hay licencia por usuario. Todo corre en el teléfono.

---

## Por qué así

| Decisión | Razón |
|---|---|
| PWA en vez de app nativa | Se instala con un enlace de WhatsApp. Un repartidor nuevo está operando en 2 minutos, sin cuentas ni altas. |
| Sin backend | Cero costo de infraestructura y cero riesgo de que la ruta se caiga porque se cayó el servidor. El precio: los datos viven en cada teléfono (ver *Límites*). |
| Optimizador propio | Google Routes API cobra por parada optimizada. Con 2,000 envíos/día eso es un costo recurrente que aquí no existe. |
| Offline primero | En Iztapalapa, Ecatepec o la periferia de Guadalajara la señal se cae. La app tiene que seguir. |

---

## Los tres escaneos

La app sigue el flujo real de patio, no un flujo teórico:

1. **Inducción** — recibes las guías del CEDIS de Mercado Libre y las escaneas.
   Cada guía queda dada de alta en el día. Las repetidas se rechazan con un
   sonido distinto: no entran dos veces.
2. **Carga a unidad** — al subir los paquetes al vehículo, se escanea otra vez.
   Si una guía **no está en el manifiesto del día**, la app lo grita antes de
   que suba a la unidad. Eso es lo que evita el faltante al cierre.
3. **Entrega** — en el domicilio se registra el resultado: entregado con nombre
   de quien recibe, o no entregado con motivo tipificado, sellado con hora y GPS.

Se lee con la **cámara** (código de barras o QR de la etiqueta) o con un
**lector Bluetooth de anillo o pistola**, que es lo que se usa para inducir
cientos de guías seguidas. El lector funciona sin encender la cámara: dispara y
la app lo captura.

---

## Cómo se arma la ruta

1. Cargas el manifiesto (CSV o el Excel guardado como CSV). Las columnas se
   reconocen solas aunque el archivo diga *"Número de Guía"*, *"Alcaldía"* o
   *"C.P."*.
2. **Ubicar direcciones** convierte cada domicilio en coordenadas.
3. Fijas el CEDIS, cuántas unidades salen y a qué hora.
4. **Calcular ruta óptima**.

### Qué hace el optimizador

Es un problema de ruteo de vehículos (VRP) con ventanas horarias y capacidad.
El motor (`js/optimizador.js`) trabaja en tres etapas:

- **Reparto por zonas** — barrido polar alrededor del CEDIS, respetando piezas
  por unidad y un tope de paradas para que nadie cargue con el doble que otro.
- **Orden dentro de cada ruta** — construcción por vecino más cercano (o por
  urgencia de ventana horaria, si las hay) y después mejora local con **2-opt**
  (deshace cruces) y **Or-opt** (reubica paradas sueltas).
- **Reequilibrio entre unidades** — mueve paradas de una unidad a otra cuando
  eso baja el kilometraje total sin romper el balance de carga.

Las ventanas horarias no son un filtro: entran en la función objetivo. Llegar
tarde cuesta 0.5 km equivalentes por minuto, así que el optimizador acepta
manejar de más con tal de cumplir un horario comprometido.

Rendimiento medido en este repositorio:

| Manifiesto | Unidades | Tiempo de cálculo |
|---|---|---|
| 150 guías | 1 | 30 ms |
| 400 guías | 4 | 72 ms |
| 1,500 guías | 12 | 471 ms |

### Sobre el porcentaje de ahorro

La app muestra *"X% menos km que sin ordenar"*. La comparación es contra el
**orden en que vienen las guías en el manifiesto**, que es esencialmente
aleatorio. Contra eso el ahorro sale de 50-95%, y ese número **no es el ahorro
que vas a ver en la calle**: tu repartidor con experiencia ya agrupa por colonia
por su cuenta. Contra un repartidor que conoce su zona, la ganancia real está en
otro lado: **repartidor nuevo que rinde como uno con dos años de ruta desde el
primer día**, ventanas horarias que no se olvidan, y reparto parejo entre
unidades. Mide tu línea base real una semana antes de presumir números.

---

## Correrla

```bash
npm test      # pruebas del motor de optimización y del lector de CSV
npm start     # servidor local en http://localhost:8099
```

Necesita servirse por HTTP (no `file://`): usa módulos ES, y la cámara y el
service worker exigen HTTPS o localhost.

### Publicarla para el equipo

La carpeta `app/` es estática. Cualquier hosting sirve; lo más directo es
**GitHub Pages**: Settings → Pages → Deploy from branch, carpeta `/app`. Queda
una URL HTTPS que se manda por WhatsApp y cada quien instala.

---

## Geocodificación

Por omisión usa **OpenStreetMap (Nominatim)**: gratis, pero su política permite
una consulta por segundo y con colonias mexicanas falla seguido. Para 500
direcciones son ~9 minutos.

Para volumen diario, configura una **clave de Google Maps** en la pestaña
Cierre: es de paga pero acierta mucho mejor con cerradas, privadas y colonias.
La clave se guarda solo en ese dispositivo — **restringe la clave por dominio en
la consola de Google**, o cualquiera que abra la app puede gastarla.

Cada dirección resuelta se guarda en caché local: la misma dirección no se cobra
ni se consulta dos veces.

Cuando ningún geocodificador acierta, **Rellenar por CP** coloca la parada en el
centro de su código postal usando las direcciones vecinas ya resueltas. Sirve
para que entre al ruteo en la zona correcta, no para tocar la puerta.

---

## Límites (léelos antes de operar con esto)

- **Los datos viven en cada teléfono.** No hay consola central: si quieres ver
  las 8 unidades en un tablero, alguien tiene que juntar los CSV de cierre. Ese
  es el techo de esta versión.
- **No hay evidencia fotográfica ni firma digital.** Se registra nombre de quien
  recibe, hora y GPS.
- **No actualiza el estatus en Mercado Libre.** El cierre sale en CSV.
  Confirma con tu contacto de ML por qué canal te van a exigir los estatus
  (API, SFTP, portal) — eso define el siguiente desarrollo y conviene saberlo
  **antes** de firmar volumen.
- **Si se borran los datos del navegador, se pierde el día.** Exportar el cierre
  antes de vaciar la jornada no es opcional.
- **El mapa necesita señal.** La lista ordenada y la navegación no.

## Siguiente paso natural

En orden de valor para la operación:

1. Canal de estatus hacia Mercado Libre (lo que te van a pedir por contrato).
2. Consola de despacho: las unidades suben su cierre y el supervisor ve el día
   completo sin juntar archivos a mano.
3. Foto de evidencia en la no entrega — es lo que gana las aclaraciones.
4. Matriz de distancias por calle real (OSRM propio) en vez de línea recta
   ajustada: mejora los ETA en zonas con barrancas, ríos o vías del tren, donde
   la línea recta miente.

---

## Estructura

```
app/
├── index.html              Pantallas: escaneo, manifiesto, ruta, entrega, cierre
├── css/estilos.css         Interfaz para una mano, a pleno sol
├── js/
│   ├── optimizador.js      Motor VRP puro (sin DOM, sin red) — el corazón
│   ├── csv.js              Lectura de CSV de Excel en español
│   ├── almacen.js          Estado del día en el dispositivo
│   ├── geo.js              Geocodificación, caché y enlaces de navegación
│   ├── escaneo.js          Cámara, lector Bluetooth y captura manual
│   └── app.js              Interfaz
├── pruebas/                node --test, sin dependencias
├── datos/                  Manifiesto de ejemplo
└── sw.js                   Modo offline
```
