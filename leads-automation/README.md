# 🤖 Automatización de Leads y Emails para iMile México

Sistema automático de prospección que identifica empresas objetivo, encuentra contactos decisores y genera emails personalizados.

## 🎯 ¿Qué hace?

1. **Búsqueda de Empresas** (`company-finder.js`)
   - Filtra empresas por industria (logística, e-commerce, retail)
   - Valida tamaño (50-10,000 empleados)
   - Verifica ubicación (CDMX, Estado de México, Guadalajara, Monterrey)
   - Calcula score de relevancia

2. **Búsqueda de Contactos** (`contact-finder.js`)
   - Integra con Apollo.io para encontrar decisores
   - Busca roles específicos (Director de Logística, etc.)
   - Verifica emails y obtiene datos de LinkedIn
   - Enriquece información de contacto

3. **Generación de Emails** (`email-generator.js`)
   - Crea asuntos personalizados por empresa/contacto
   - Genera cuerpo de email adaptado al rol
   - Produce versión HTML con branding
   - Incluye CTA con Calendly para agendamiento

4. **Orquestación** (`automation-orchestrator.js`)
   - Coordina todo el flujo
   - Genera reportes en JSON, CSV, TXT
   - Crea logs de ejecución

## 🚀 Cómo ejecutar

### Requisitos
- Node.js 14+
- Variables de entorno configuradas

### Instalación

```bash
cd leads-automation
npm install
```

### Configuración

Edita `config.js` para personalizar:

```javascript
// Cambiar roles objetivo
targetRoles: ['Tu rol 1', 'Tu rol 2', ...]

// Cambiar industrias
industries: ['Tu industria 1', 'Tu industria 2', ...]

// Configurar API keys
process.env.APOLLO_API_KEY = 'tu_key_aqui'
```

### Ejecutar Demostración

```bash
node demo.js
```

Esto:
- ✅ Simula búsqueda de 8 empresas
- ✅ Filtra 5-6 empresas objetivo
- ✅ Encuentra ~15-20 contactos
- ✅ Genera 15-20 emails personalizados
- ✅ Crea reportes en `results/`

### Ejecutar Automatización con Datos Reales

```javascript
const AutomationOrchestrator = require('./src/automation-orchestrator');

const orchestrator = new AutomationOrchestrator();
const results = await orchestrator.runAutomation(tuArrayDeEmpresas);
```

## 📁 Estructura de Archivos

```
leads-automation/
├── config.js                    # Configuración global
├── demo.js                      # Script de demostración
├── package.json                 # Dependencias
├── README.md                    # Este archivo
├── src/
│   ├── company-finder.js       # Módulo de búsqueda de empresas
│   ├── contact-finder.js       # Módulo de búsqueda de contactos
│   ├── email-generator.js      # Módulo de generación de emails
│   └── automation-orchestrator.js # Orquestador principal
├── results/                     # Outputs generados
│   ├── leads-YYYY-MM-DD.json   # Reporte completo en JSON
│   ├── leads-YYYY-MM-DD.csv    # Datos en CSV para CRM
│   └── emails-YYYY-MM-DD.txt   # Muestra de emails generados
└── logs/                        # Logs de ejecución
```

## 📊 Archivos Generados

### `leads-YYYY-MM-DD.json`
Reporte completo con todos los datos:
```json
[
  {
    "company": {
      "name": "Amazon México",
      "domain": "amazon.com.mx",
      "score": 85,
      ...
    },
    "contact": {
      "name": "Juan García",
      "job_title": "Director de Logística",
      "email": "juan.garcia@amazon.com.mx",
      "enrichmentScore": 95,
      ...
    },
    "email": {
      "subject": "Juan: Reducir costos de última milla en Amazon",
      "body": "...",
      ...
    }
  }
]
```

### `leads-YYYY-MM-DD.csv`
Para importar a CRM/Excel:
```
empresa,sitio_web,contacto,cargo,email,telefono,linkedin,score_relevancia,calidad_contacto
"Amazon México Logistics","amazon.com.mx","Juan García","Director de Logística","juan.garcia@amazon.com.mx","","https://linkedin.com/in/juan-garcia",85,95
```

### `emails-YYYY-MM-DD.txt`
Muestras de los primeros 3 emails generados

## 🔌 Integración con APIs

### Apollo.io
En `contact-finder.js`, el método `findContactsAtCompany()` actualmente retorna datos simulados. Para usar Apollo.io real:

```javascript
async findContactsAtCompany(company) {
  const response = await fetch(`${this.baseUrl}/contacts/search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${this.apolloKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q_organization_name: company.name,
      q_roles: config.targetRoles,
    }),
  });
  
  return response.json();
}
```

### Gmail/Outlook
Para enviar emails automáticamente, añade un módulo `email-sender.js`:

```javascript
class EmailSender {
  async sendEmail(emailData) {
    // Usar nodemailer o API de Gmail
    await transporter.sendMail({
      from: config.email.from,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.htmlBody,
    });
  }
}
```

## ⚙️ Personalización

### Cambiar Asuntos
En `email-generator.js`, edita `generateSubject()`:

```javascript
const subjects = [
  `Tu asunto personalizado para ${contact.name}`,
  // ... más opciones
];
```

### Cambiar Cuerpo del Email
En `email-generator.js`, edita `generateBody()`:

```javascript
return `Tu contenido personalizado
Para ${contact.name}
En ${company.name}`;
```

### Cambiar Criterios de Filtrado
En `config.js`:

```javascript
targetCompanies: {
  industries: ['Tu industria'],
  minEmployees: 100,
  maxEmployees: 5000,
  regions: ['Tu región'],
}
```

## 📈 Resultados Esperados

Con 100 empresas de entrada:
- **50-60** empresas pasan filtro de industria/tamaño/ubicación
- **150-200** contactos encontrados en esas empresas
- **150-200** emails personalizados generados
- **Tiempo**: ~30-60 segundos (sin envíos reales)

Con envíos reales:
- Email abierto: ~25-35%
- Tasa de respuesta: ~5-8%
- Tasa de conversión: ~1-2% (a reunión)

## 🔐 Seguridad

- ✅ API keys guardadas en variables de entorno
- ✅ Emails verificados antes de enviar
- ✅ Rate limiting configurable
- ✅ Logs de todas las acciones

## 🐛 Debugging

```bash
# Ver logs de ejecución
cat logs/*.log

# Ver estructura de datos generados
cat results/leads-*.json | jq '.[0]'

# Contar leads por empresa
cat results/leads-*.csv | cut -d',' -f1 | sort | uniq -c
```

## 📝 Notas

- La demostración usa datos simulados para no saturar APIs reales
- En producción, configurar límites de rate para Apollo.io
- Implementar caché para no re-buscar misma empresa
- Agregar validación de bounce rate en emails antiguos
- Implementar A/B testing en asuntos/cuerpos

## 📞 Soporte

Para preguntas o mejoras:
- Email: javmalher@gmail.com
- LinkedIn: [Tu perfil]

---

**¡Lista para prospección automática! 🚀**
