---
tipo: concepto
creado: 2026-09-12
actualizado: 2026-09-12
fuentes: ["app/ (código en este repositorio)"]
---

# App Ruta · Última Milla

Herramienta operativa construida en este repositorio (`app/`) para la operación
de reparto de última milla que arranca con [[Mercado Libre]] como cliente: se
escanean las guías que entrega el CEDIS, se calcula la ruta más eficiente del
día y se cierra cada entrega en el domicilio. Es una PWA offline: vive en el
celular del repartidor, sin servidor ni licencia por usuario.

Se relaciona directamente con [[Logística de Última Milla]] — es la
instrumentación de ese proceso — y con la operación que [[Javier Malpica
Herrera]] conoce desde el lado comercial en [[iMile Delivery México]] y
[[Estafeta]].

## Los tres escaneos

El diseño sigue el flujo real de patio, no uno teórico:

1. **Inducción** — alta de la guía al recibirla del CEDIS. Rechaza repetidas.
2. **Carga a unidad** — valida contra el manifiesto del día antes de que el
   paquete suba al vehículo. Es el control que evita el faltante al cierre.
3. **Entrega** — resultado sellado con hora y GPS: entregado con nombre de quien
   recibe, o no entregado con motivo tipificado (nueve motivos cerrados, sin
   campo libre, para que los KPIs sirvan).

## Decisiones de diseño y su razón

- **PWA sin backend.** Se instala con un enlace; cero infraestructura. El costo
  de la decisión es que los datos viven en cada teléfono y no hay consola
  central: el cierre se junta por CSV.
- **Optimizador propio en vez de Google Routes API.** La API de Google cobra por
  parada optimizada; con 2,000 envíos diarios eso es costo recurrente evitable.
- **Offline primero.** La señal se cae en Iztapalapa, Ecatepec y la periferia de
  ZMG; la app tiene que seguir operando.

## Motor de optimización

Problema de ruteo de vehículos (VRP) con ventanas horarias y capacidad,
resuelto en tres etapas: barrido polar para repartir zonas entre unidades,
vecino más cercano + 2-opt + Or-opt para ordenar cada ruta, y reequilibrio de
paradas entre unidades. Las ventanas horarias entran en la función objetivo
(llegar tarde cuesta 0.5 km equivalentes por minuto), no como filtro duro.

Medido: 1,500 guías en 12 unidades se planifican en ~470 ms en el navegador.

## Advertencia sobre el "% de ahorro"

La app compara contra el orden en que vienen las guías en el manifiesto, que es
aleatorio, y por eso muestra ahorros de 50-95%. **Ese no es el ahorro real en
calle**: un repartidor con experiencia ya agrupa por colonia. La ganancia
verdadera está en que un repartidor nuevo rinda como uno con dos años de ruta,
en ventanas horarias que no se olvidan y en reparto parejo entre unidades. La
línea base real hay que medirla una semana antes de presumir números.

## Pendiente crítico antes de firmar volumen

Confirmar con [[Mercado Libre]] **por qué canal exigen la actualización de
estatus** (API de shipments, SFTP o portal). Hoy la app cierra en CSV; ese
requisito define el siguiente desarrollo y conviene conocerlo antes de
comprometer volumen contractual.
