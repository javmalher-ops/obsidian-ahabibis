# Registro

Registro cronológico de solo-escritura. Formato: `## [YYYY-MM-DD] tipo | Título`,
donde `tipo` ∈ {ingesta, consulta, revision}. Ver `grep "^## \[" wiki/log.md | tail -5`
para las últimas entradas.

## [2026-07-21] revision | Estructura inicial de la wiki creada

## [2026-07-21] ingesta | CV Javier Malpica Herrera 2026

## [2026-07-21] ingesta | Deck corporativo iMile Delivery 2026

## [2026-07-21] revision | Copia de fuentes-originales/imile (26 archivos), fuentes-originales/personal y fuentes-originales/javier-kuri-malpica-carbonel (incl. FIEL y credenciales, sin ingesta de su contenido)

## [2026-07-21] ingesta | CV 2025, cartas laborales/recomendación, oferta Estafeta, documentos de identidad/formación, acta de nacimiento de Javier Kuri Malpica Carbonell, catálogo de formación complementaria

## [2026-07-21] ingesta | Contratos de clientes de iMile: Solistica, Tendencys Innovations, Grupo Salinas (CMC)

## [2026-07-21] ingesta | Minuta de negociación Grupo Salinas, licitaciones Totalplay/Grupo Salinas, plantilla maestra de contrato; catalogadas ~14 cotizaciones/tarifarios internos sin extracción detallada

## [2026-07-21] ingesta | Dashboard de equipo Estafeta; descartado MiniDashboard.xlsx (datos de restaurante sin relación)

## [2026-07-21] ingesta | Convenio de guarda y custodia y régimen de convivencia de Javier Kuri Malpica Carbonell (confirmación explícita del usuario)

## [2026-07-21] ingesta | Resumen estructural de 14 bases de clientes/leads (CRM, prospección) sin transcribir contactos individuales de terceros

## [2026-07-21] revision | Revisión periódica: corregidos 6 wikilinks rotos por salto de línea (Javier Malpica Herrera, OPL, iMile, Minuta-Negociacion-Grupo-Salinas, Convenio-Guarda-Custodia-JKMC); verificado que no hay páginas huérfanas ni páginas ausentes del índice

## [2026-07-21] sesion | Resumen narrativo de la sesión guardado en wiki/sesiones/

## [2026-07-21] ingesta | Export de la app de Claude (34 conversaciones) respaldado en transcripciones/; ingeridas las de trabajo: pipeline comercial iMile, ICP/estrategia, cliente envia.com, jefe Allen, búsqueda de empleo 2026

## [2026-07-21] ingesta | Segunda pasada del export: prospectos adicionales (Liverpool, Grupo Axo/Marisol Esqueda, Pink Up, Banco Plata/Luis Alberto Macías), enlace envia.com↔Tendencys, entrevista y test de aptitud de Liverpool

## [2026-09-02] revision | CRM Shipio reconstruido y publicado como app

Diagnóstico del acceso perdido: el repo `javmalher-ops/crm-shipio` existe pero
está vacío (0 commits) — la versión de jul–ago 2026 se construyó dentro de la
computadora local y el código nunca se subió, así que nunca hubo una URL que
abrir. Reconstruido desde cero como app publicada con base de datos propia y
export CSV, sembrada con las 24 cuentas de [[Prospeccion-y-Pipeline-iMile]] y el
batch de `prospeccion-diaria/`. Código versionado en `crm-shipio/shipio.html`
para que no dependa otra vez de una máquina local.
