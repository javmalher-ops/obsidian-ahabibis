# CRM Shipio

Pipeline comercial de iMile México, publicado como app de Claude.

- **URL:** https://claude.ai/code/artifact/79b8f2ce-45ea-4c74-9532-281c4559b23f
- **Código fuente:** [`shipio.html`](shipio.html) — un solo archivo, sin dependencias
  externas salvo las tipografías de Google Fonts.

## Por qué vive aquí

La primera versión del CRM (jul–ago 2026) se construyó dentro de la computadora
local y el código nunca se subió: el repo `javmalher-ops/crm-shipio` quedó vacío
y no hubo nada que abrir desde otro dispositivo. Este archivo es la fuente de
verdad — mientras esté versionado aquí, la app se puede volver a publicar aunque
se pierda el enlace.

## Cómo actualizarlo

Editar `shipio.html` y volver a publicarlo **a la misma URL** (desde Claude Code,
pasando esa URL como destino). Publicar sin la URL crea una app nueva y separada,
con enlace distinto.

## Datos

Los datos viven en la base de datos de la app, no en este archivo. `shipio.html`
solo contiene la **semilla inicial**: las 24 cuentas del pipeline consolidado en
[`wiki/resumenes/Prospeccion-y-Pipeline-iMile.md`](../wiki/resumenes/Prospeccion-y-Pipeline-iMile.md)
y el batch de [`prospeccion-diaria/`](../prospeccion-diaria/). La semilla se
escribe una sola vez, la primera vez que se abre la app; después de eso, editar
este archivo ya no toca los datos guardados.

Ningún correo ni teléfono está capturado: las fuentes del vault no los
transcriben. Esos campos salen como `Por verificar` en el CSV hasta que se
confirmen en Apollo, Lusha o Clay.

## Modelo de datos

Colección `cuentas`, un documento por cuenta:

| Campo | Notas |
|---|---|
| `empresa`, `modelo`, `ciudad`, `industria` | `modelo` ∈ B2C / B2B / B2B2C |
| `etapa` | prospecto · contactado · reunion · propuesta · negociacion · cliente · perdido |
| `volumen` | envíos/mes estimados; `null` si no se ha estimado |
| `courier`, `sla` | courier actual a desplazar y su SLA — el ángulo de venta |
| `senal`, `senalFecha` | señal de compra detectada |
| `contactoNombre`, `contactoCargo`, `contactoLinkedin`, `contactoEmail`, `contactoTelefono` | |
| `angulo`, `proxima`, `proximaNota`, `notas`, `fecha` | |

`meta/config` guarda la marca de que la semilla ya se escribió.

## Export CSV

El botón exporta **lo que esté filtrado en pantalla**, con las 14 columnas del
esquema de prospección diaria en su orden exacto (`Fecha_Prospeccion` …
`Estatus`), más `Courier_Actual`, `SLA_Actual`, `Proxima_Accion` y `Notas` al
final. Las 14 primeras se pueden pegar directo al acumulado sin reordenar nada.
