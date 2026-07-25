# Esquema de la Wiki de LLM

Este vault de Obsidian es una **wiki de conocimiento mantenida por un LLM**. No es un
sistema RAG: las fuentes no se recuperan y se resumen desde cero en cada consulta. En
su lugar, esta wiki se construye y mantiene de forma incremental — se acumula, se
referencia cruzadamente y se corrige con el tiempo. Tú (Claude) eres quien escribe y
mantiene la wiki. El usuario aporta las fuentes, hace preguntas y navega el resultado
en Obsidian (vista de grafo, enlaces, etc.). Casi nunca debe escribir la wiki a mano.

## Estructura de directorios

- `fuentes-originales/` — Fuentes en bruto (artículos, PDFs, transcripciones, notas).
  **Inmutable**: nunca edites ni borres nada aquí. Es la fuente de verdad. Organiza por
  subcarpeta si el volumen lo justifica (ej. `fuentes-originales/articulos/`,
  `fuentes-originales/podcasts/`).
- `wiki/` — Todo lo que tú generas y mantienes.
  - `index.md` — Catálogo de todo el contenido de la wiki, organizado por categoría
    (fuentes, entidades, conceptos, comparaciones, síntesis). Cada entrada: enlace +
    resumen de una línea + metadatos opcionales (fecha, nº de fuentes que la respaldan).
    Actualízalo en cada ingesta y cada vez que crees o borres una página.
  - `log.md` — Registro cronológico de solo-escritura. Cada entrada empieza con el
    prefijo `## [YYYY-MM-DD] tipo | Título` donde `tipo` ∈ {ingesta, consulta, revision}.
    Esto permite `grep "^## \[" wiki/log.md | tail -5` para ver la actividad reciente.
  - `resumenes/` — Una página por fuente ingerida: resumen, puntos clave, y enlace de
    vuelta al archivo original en `fuentes-originales/`.
  - `entidades/` — Una página por persona, lugar, organización u objeto recurrente.
  - `conceptos/` — Una página por concepto o tema recurrente que merece su propia
    síntesis (no solo una mención de paso).
  - `comparaciones/` — Tablas o análisis comparativos generados a partir de una
    consulta del usuario, cuando vale la pena conservarlos.
  - `Sintesis.md` — Sí­ntesis general en evolución: la tesis o panorama de más alto
    nivel que conecta todo lo demás. Revísala y actualízala cuando una fuente nueva la
    cuestione o la refuerce.
  - `sesiones/` — Un resumen narrativo por sesión de trabajo (no una transcripción
    literal — esa vive en el registro técnico de Claude Code en disco). Solo se crea
    cuando el usuario pide explícitamente "guardar la conversación/sesión". Formato de
    nombre: `AAAA-MM-DD Título breve.md`.

## Convenciones

- Enlaza con la sintaxis de Obsidian `[[Nombre de la página]]` liberalmente. Un enlace
  a una página que aún no existe está bien — es una señal de qué falta crear.
  Usa `[[Nombre de la página|texto visible]]` cuando el texto natural de la oración no
  coincida con el título de la página.
- Front matter mínimo en cada página de `wiki/`: `tipo` (fuente/entidad/concepto/
  comparacion), `creado`, `actualizado`, `fuentes` (lista de fuentes que la respaldan).
- Cuando una fuente nueva contradice una afirmación existente, no la sobrescribas en
  silencio: señala la contradicción explícitamente en la página afectada (con fecha y
  cita de ambas fuentes) y coméntaselo al usuario.
- Nombres de archivo en minúsculas-con-guiones o Con Mayúsculas según el título de la
  página; sé consistente con lo que ya exista en cada carpeta.

## Flujo: ingesta de una fuente

1. El usuario coloca (o pega) la fuente en `fuentes-originales/`.
2. Lee la fuente completa. Identifica los puntos clave y coméntalos brevemente con el
   usuario antes de escribir nada, salvo que pida ingesta en lote sin supervisión.
3. Escribe una página en `wiki/resumenes/`.
4. Actualiza o crea las páginas de `wiki/entidades/` y `wiki/conceptos/` afectadas.
5. Actualiza `wiki/index.md`.
6. Actualiza `wiki/Sintesis.md` si la fuente cambia el panorama general.
7. Añade una entrada a `wiki/log.md` (`## [fecha] ingesta | Título de la fuente`).

Una sola fuente puede tocar 10-15 páginas — está bien, ese es el punto.

## Flujo: consulta

1. Lee `wiki/index.md` primero para ubicar páginas relevantes antes de leerlas en
   detalle. No releas toda la wiki en cada consulta.
2. Sintetiza la respuesta citando las páginas de la wiki (y, si hace falta, la fuente
   original).
3. Si la respuesta vale la pena conservar (una comparación, un análisis, una conexión
   nueva), ofrece archivarla como página nueva en `wiki/comparaciones/` o donde
   corresponda, en vez de dejar que se pierda en el chat.
4. Añade una entrada a `wiki/log.md` (`## [fecha] consulta | Pregunta resumida`).

## Flujo: revisión periódica

Cuando el usuario lo pida (o al notar que ha pasado tiempo desde la última revisión),
revisa la wiki buscando: contradicciones entre páginas, afirmaciones obsoletas
reemplazadas por fuentes más recientes, páginas huérfanas sin enlaces entrantes,
conceptos mencionados pero sin página propia, referencias cruzadas faltantes, y huecos
de información que se podrían llenar con una búsqueda web. Registra la revisión en
`wiki/log.md` (`## [fecha] revision | qué se revisó`).
