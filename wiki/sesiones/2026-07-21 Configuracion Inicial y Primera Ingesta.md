---
tipo: sesion
creado: 2026-07-21
actualizado: 2026-07-21
---

# Sesión — 21 de julio de 2026: configuración inicial y primera ingesta

Resumen legible de lo ocurrido en la primera conversación con Claude Code
sobre este vault. No es una transcripción literal (esa vive únicamente en
el registro técnico de Claude Code en disco); es un resumen navegable de
qué se hizo y por qué.

## 1. Montaje del sistema

Se creó la estructura base de la "Wiki de LLM": [[../../CLAUDE.md|CLAUDE.md]]
(el esquema y los tres flujos: ingesta, consulta, revisión periódica),
`fuentes-originales/` (inmutable) y `wiki/` (mantenida por el LLM, con
`index.md`, `log.md`, `Sintesis.md`, `entidades/`, `conceptos/`,
`resumenes/`, `comparaciones/`).

## 2. Fuentes ingeridas

En orden: CV 2026 → deck corporativo de iMile → tres carpetas grandes
(`Javier Malpica Herrera/`, `Javier Kuri Malpica Carbonel/`, `iMile/`) →
CV 2025, cartas laborales/recomendación, documentos de identidad/formación,
acta de nacimiento del hijo → tres contratos de clientes de iMile
(Solistica, Tendencys, Grupo Salinas) → minuta de negociación, licitaciones,
plantilla de contrato → dashboard de equipo en Estafeta → convenio de
guarda y custodia → bases de CRM/prospección (resumidas a nivel
estructural). Ver [[../index|índice completo]] para el detalle de cada
página.

## 3. Decisiones y exclusiones deliberadas

- **Excluido de forma permanente**: `Credenciales de trabajo/` y el
  archivo FIEL (llave privada fiscal + contraseña en texto plano) — nunca
  se leyeron ni se copiaron sus contenidos a la wiki.
- **No ingerido**: documentos de identidad puros (INE, CURP, licencia,
  antecedentes) — sin valor narrativo, solo riesgo.
- **Bases de clientes/leads**: se procesaron solo a nivel estructural
  (qué contienen, cuántos registros, qué herramienta), sin transcribir
  contactos individuales de terceros a la wiki.
- **Convenio de guarda y custodia**: se procesó únicamente después de una
  confirmación explícita y directa del usuario, dado que involucra a un
  menor; se omitieron los domicilios exactos de los padres.

## 4. Hallazgos y correcciones notables

- **Contradicción de fechas**: el CV dice que Estafeta empezó en mayo
  2024; la constancia laboral oficial confirma que fue en julio 2024. Se
  corrigió en [[../entidades/Estafeta|Estafeta]].
- **Corrección de interpretación**: "Contrato...Cliente Perona Moral" no
  es un cliente — es un error tipográfico de "Persona Moral" (plantilla
  maestra en blanco de iMile). Ver [[../resumenes/Plantilla-Contrato-Persona-Moral]].
- **Revisión técnica**: se encontraron y corrigieron 6 wikilinks rotos por
  saltos de línea dentro de `[[...]]`.

## 5. Preguntas abiertas al cierre de la sesión

Ver [[../Sintesis|Síntesis general]] para la lista completa y actualizada.

## 6. Nota sobre esta página

Esta sesión giró casi por completo en torno a construir y poblar la wiki
misma sobre [[../entidades/Javier Malpica Herrera|Javier Malpica Herrera]]
— por eso este resumen documenta el *proceso*, no un tema nuevo. El
registro cronológico línea por línea de cada acción sigue en
[[../log|log.md]]; esta página es la versión narrativa para quien prefiera
leer "qué pasó" de corrido.
