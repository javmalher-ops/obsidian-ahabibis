# 🏗️ Arquitectura de la Automatización

## Diagrama del Flujo

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ENTRADA: Lista de Empresas                           │
│                  (CSV, JSON, API, Base de Datos)                        │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PASO 1: FILTRO DE EMPRESAS (company-finder.js)                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ✓ Filtrar por industria (Logística, E-commerce, Retail)        │   │
│  │ ✓ Filtrar por tamaño (50-10,000 empleados)                     │   │
│  │ ✓ Filtrar por ubicación (CDMX, Edo Mex, Gdl, Mty)              │   │
│  │ ✓ Calcular score de relevancia (0-100)                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ENTRADA: ~100-200 empresas  │  SALIDA: ~50-60 empresas objetivo      │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PASO 2: BÚSQUEDA DE CONTACTOS (contact-finder.js)                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Para cada empresa objetivo:                                     │   │
│  │ ✓ Buscar en Apollo.io por roles específicos                    │   │
│  │ ✓ Validar emails (verificación de dominio)                     │   │
│  │ ✓ Obtener teléfono y LinkedIn                                  │   │
│  │ ✓ Calcular score de calidad (0-100)                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ENTRADA: 50-60 empresas  │  SALIDA: 150-200 contactos verificados    │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PASO 3: GENERACIÓN DE EMAILS (email-generator.js)                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Para cada contacto:                                             │   │
│  │ ✓ Generar asunto personalizado (variables dinámicas)           │   │
│  │ ✓ Generar cuerpo de email adaptado                             │   │
│  │ ✓ Crear versión HTML con branding                              │   │
│  │ ✓ Incluir CTA con Calendly                                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ENTRADA: 150-200 contactos  │  SALIDA: 150-200 emails personalizados │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  SALIDA: Reportes y Archivos                                            │
│  ┌──────────────────────────┬──────────────────────────┐               │
│  │ leads-YYYY-MM-DD.json    │ leads-YYYY-MM-DD.csv    │               │
│  │ (Datos completos)        │ (Para CRM/Excel)        │               │
│  ├──────────────────────────┼──────────────────────────┤               │
│  │ emails-YYYY-MM-DD.txt    │ logs/execution.log       │               │
│  │ (Muestras de emails)     │ (Registro de acciones)   │               │
│  └──────────────────────────┴──────────────────────────┘               │
└─────────────────────────────────────────────────────────────────────────┘
```

## Flujo Detallado

### PASO 1: Filtrado de Empresas

**CompanyFinder** procesa lista de entrada:

```
Entrada: [100 empresas]
         ├─ Software Solutions (50 emp) ❌ Industria no relevante
         ├─ Amazon México (5000 emp) ✅ CDMX, Logística
         ├─ Juan's Pizza (10 emp) ❌ Tamaño muy pequeño
         ├─ Mercado Libre (3000 emp) ✅ CDMX, E-commerce
         └─ ... 96 más

Salida: [~60 empresas objetivo]
        ├─ Amazon México (Score: 95/100)
        ├─ Mercado Libre (Score: 90/100)
        ├─ Grupo Bimbo (Score: 85/100)
        └─ ... 57 más
```

**Cálculo de Score:**
- Base: 0 puntos
- Tamaño ideal (200-5000 emp): +30 pts
- Industria Logística: +25 pts
- Industria E-commerce: +20 pts
- Ubicación CDMX: +15 pts
- Ingresos > $50M: +10 pts
- **Máximo: 100 pts**

---

### PASO 2: Búsqueda de Contactos

**ContactFinder** busca decisores en cada empresa:

```
Para cada empresa objetivo:
  
  Amazon México Logistics
  │
  ├─ Búsqueda en Apollo.io:
  │  └─ Roles: ["Director de Logística", "Director de Operaciones", ...]
  │
  ├─ Contactos encontrados:
  │  ├─ Juan García (Director de Logística) ✅
  │  │  └─ Score: 95/100 (Email verificado, LinkedIn, teléfono)
  │  │
  │  ├─ María Rodríguez (Gerente de Almacén) ✅
  │  │  └─ Score: 85/100 (Email verificado, LinkedIn)
  │  │
  │  └─ Carlos López (Asistente) ❌
  │     └─ Role no relevante
  │
  └─ Resultado: 2 contactos viables
```

**Enriquecimiento de Contacto:**
- Email verificado: +40 pts
- Teléfono disponible: +20 pts
- LinkedIn URL: +15 pts
- Role relevante: +25 pts
- **Máximo: 100 pts**

---

### PASO 3: Generación de Emails

**EmailGenerator** crea emails personalizados:

```
Contacto:
├─ Nombre: Juan García
├─ Rol: Director de Logística
├─ Empresa: Amazon México
└─ Email: juan.garcia@amazon.com.mx

Generación:
├─ Asunto: "Juan: Reducir costos de última milla en Amazon"
│  (Selecciona de 4 variaciones al azar)
│
├─ Cuerpo de texto:
│  "¡Hola Juan!
│   Hace poco noté que trabajan en Amazon México..."
│  (Personalizado con nombre, empresa, rol)
│
├─ Versión HTML:
│  <!DOCTYPE html>
│  <h1>¡Hola Juan!</h1>
│  <p>En <strong>iMile</strong>...</p>
│  <a href="https://calendly.com/javmalher">Agendar</a>
│
└─ Metadata:
   ├─ Timestamp de generación
   ├─ ID único de campaña
   ├─ Tracking pixels (opcional)
   └─ A/B test variants
```

---

## Arquitectura de Clases

```
AutomationOrchestrator (Principal)
│
├─ CompanyFinder
│  ├─ findTargetCompanies(sourceCompanies)
│  ├─ enrichCompanyData(company)
│  └─ calculateRelevanceScore(company)
│
├─ ContactFinder
│  ├─ findContactsAtCompany(company)
│  ├─ isRelevantRole(jobTitle)
│  ├─ enrichContactData(contact)
│  └─ calculateEnrichmentScore(contact)
│
├─ EmailGenerator
│  ├─ generateEmail(contact, company)
│  ├─ generateSubject(contact, company)
│  ├─ generateBody(contact, company)
│  └─ generateHtmlBody(contact, company)
│
└─ Utilidades
   ├─ saveResults(campaigns)
   ├─ generateCSV(campaigns)
   └─ formatEmailForPreview(campaign)
```

---

## Flujo de Datos

```
CompanyFinder
    │
    ├─ input: Array<Company>
    │  └─ interface Company {
    │       name: string
    │       industry: string
    │       employees: number
    │       location: string
    │       domain: string
    │       annualRevenue: number
    │     }
    │
    └─ output: Array<EnrichedCompany>
       └─ interface EnrichedCompany {
            ...Company
            score: number (0-100)
            readyForOutreach: boolean
            lastUpdated: ISO8601
          }

ContactFinder
    │
    ├─ input: EnrichedCompany
    │
    └─ output: Array<EnrichedContact>
       └─ interface EnrichedContact {
            name: string
            job_title: string
            email: string (verified)
            phone: string
            linkedin_url: string
            enrichmentScore: number (0-100)
            readyForEmail: boolean
          }

EmailGenerator
    │
    ├─ input: {contact, company}
    │
    └─ output: Email
       └─ interface Email {
            to: string
            subject: string
            body: string (plain text)
            htmlBody: string
            metadata: object
          }
```

---

## Integraciones Externas

```
┌─────────────────────────────────────────────────────────────┐
│                    SISTEMAS EXTERNOS                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Apollo.io (MCP Server)                                      │
│  ├─ apollo_contacts_search                                  │
│  ├─ apollo_organizations_enrich                             │
│  └─ apollo_mixed_people_api_search                          │
│                                                              │
│  Gmail (MCP Server)                                          │
│  ├─ create_draft                                            │
│  └─ (send en fase 2)                                        │
│                                                              │
│  Google Sheets (Opcional)                                    │
│  ├─ Para cargar lista de empresas                           │
│  └─ Para guardar resultados                                 │
│                                                              │
│  CRM (HubSpot, Salesforce)                                   │
│  ├─ Para enriquecer datos existentes                        │
│  └─ Para registrar leads generados                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Configuración de Parámetros

```javascript
// config.js

module.exports = {
  // Criterios de búsqueda
  targetCompanies: {
    industries: ['Logística', 'E-commerce', ...],
    minEmployees: 50,
    maxEmployees: 10000,
    regions: ['CDMX', 'Guadalajara', ...],
  },

  // Roles objetivo
  targetRoles: [
    'Director de Logística',
    'Director de Operaciones',
    ...
  ],

  // APIs
  apis: {
    apollo: {
      baseUrl: 'https://api.apollo.io/v1',
      rateLimit: 100, // req/min
    },
  },

  // Campaña
  campaign: {
    batchSize: 50,
    delayBetweenSends: 2000, // ms
    trackingEnabled: true,
  },
};
```

---

## Rendimiento Esperado

| Métrica | Valor |
|---------|-------|
| Empresas procesadas | 100-200 |
| Tasa de filtrado (empresa) | 50-60% |
| Contactos por empresa | 2-3 |
| Tasa de filtrado (contacto) | 70-80% |
| Emails generados | 150-200 |
| Tiempo de ejecución | 30-60 seg |
| Emails por segundo | 2.5-5.3 |

---

## Próximos Pasos (Roadmap)

- [ ] Integración real con Apollo.io
- [ ] Envío automático vía Gmail
- [ ] Tracking de aperturas y clicks
- [ ] A/B testing de asuntos
- [ ] Almacenamiento en base de datos
- [ ] Dashboard de resultados en tiempo real
- [ ] Respuesta automática a replies
- [ ] Seguimiento automático (follow-ups)
- [ ] CRM sync (HubSpot, Salesforce)
- [ ] Análisis de ROI por email

---

**Arquitectura versión 1.0 | Actualizado: 2026-07-26**
