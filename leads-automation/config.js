/**
 * Configuración de la automatización de leads para iMile México
 */

module.exports = {
  // Configuración de email
  email: {
    from: 'javmalher@gmail.com',
    name: 'Javier Malher - iMile',
  },

  // Criterios de búsqueda de empresas
  targetCompanies: {
    industries: ['Logística', 'E-commerce', 'Retail', 'Supply Chain', 'Distribución'],
    minEmployees: 50,
    maxEmployees: 10000,
    countries: ['Mexico'],
    regions: ['CDMX', 'Estado de México', 'Guadalajara', 'Monterrey'],
  },

  // Roles objetivo para contactos
  targetRoles: [
    'Director de Logística',
    'Director de Operaciones',
    'Director de Supply Chain',
    'Gerente de Logística',
    'Jefe de Almacén',
    'Head of Ecommerce',
    'Director de Distribución',
  ],

  // Configuración de salida
  output: {
    resultsDir: './results',
    templatesDir: './email-templates',
    logsDir: './logs',
  },

  // Configuración de APIs
  apis: {
    apollo: {
      // Requires APOLLO_API_KEY env var
      baseUrl: 'https://api.apollo.io/v1',
      rateLimit: 100, // requests per minute
    },
  },

  // Configuración de campaigns
  campaign: {
    batchSize: 50,
    delayBetweenSends: 2000, // ms
    trackingEnabled: true,
  },
};
