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

## [2026-09-12] construccion | App Ruta · Última Milla (escaneo de guías + optimizador de rutas)

Construida en `app/` una PWA offline para la operación de última milla que
arranca con Mercado Libre. Cubre los tres escaneos de patio (inducción, carga a
unidad, entrega), importación del manifiesto en CSV, geocodificación con caché,
optimización VRP con ventanas horarias y capacidad, navegación a Google
Maps/Waze y cierre del día en CSV con KPIs.

Motor de optimización propio (`app/js/optimizador.js`): barrido polar para
repartir zonas, vecino más cercano + 2-opt + Or-opt por ruta, y reequilibrio
entre unidades. 1,500 guías en 12 unidades se planifican en ~470 ms.

21 pruebas automatizadas (`npm test`) y verificación de punta a punta en
navegador real. Documentado en [[App-Ruta-Ultima-Milla]].

Pendiente abierto que no se puede resolver desde aquí: confirmar con Mercado
Libre por qué canal exigen la actualización de estatus (API, SFTP o portal).

