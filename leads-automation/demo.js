#!/usr/bin/env node

/**
 * Script de demostración de la automatización de leads y emails
 * Ejecuta el flujo completo con datos simulados
 */

const AutomationOrchestrator = require('./src/automation-orchestrator');

// Datos simulados de empresas para prospección
const MOCK_COMPANIES = [
  {
    name: 'Amazon México Logistics',
    domain: 'amazon.com.mx',
    industry: 'E-commerce & Logística',
    city: 'CDMX',
    employees: 5000,
    annualRevenue: 2500000000,
  },
  {
    name: 'Mercado Libre',
    domain: 'mercadolibre.com.mx',
    industry: 'E-commerce',
    city: 'CDMX',
    employees: 3000,
    annualRevenue: 1800000000,
  },
  {
    name: 'Grupo Bimbo Logística',
    domain: 'grupobimbo.com',
    industry: 'Distribución & Logística',
    city: 'CDMX',
    employees: 2000,
    annualRevenue: 1200000000,
  },
  {
    name: 'Femsa Distribución',
    domain: 'femsa.com.mx',
    industry: 'Retail & Logística',
    city: 'CDMX',
    employees: 4500,
    annualRevenue: 2000000000,
  },
  {
    name: 'DHL Express México',
    domain: 'dhl.com.mx',
    industry: 'Logística Internacional',
    city: 'CDMX',
    employees: 1500,
    annualRevenue: 800000000,
  },
  {
    name: 'Guadalajara Distribuidora',
    domain: 'guadalajaradist.com.mx',
    industry: 'Distribución',
    city: 'Guadalajara',
    employees: 800,
    annualRevenue: 350000000,
  },
  {
    name: 'Supply Chain Monterrey',
    domain: 'scmonterrey.com.mx',
    industry: 'Supply Chain',
    city: 'Monterrey',
    employees: 600,
    annualRevenue: 250000000,
  },
  {
    name: 'Tech Startups CDMX',
    domain: 'techstartups.mx',
    industry: 'Software (no aplica)',
    city: 'CDMX',
    employees: 150,
    annualRevenue: 50000000,
  },
];

/**
 * Ejecuta la demostración
 */
async function runDemo() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║   DEMOSTRACIÓN: Automatización de Leads y Emails para iMile    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    const orchestrator = new AutomationOrchestrator();

    // Ejecutar automatización
    const summary = await orchestrator.runAutomation(MOCK_COMPANIES);

    // Mostrar resultados
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                         RESULTADOS                             ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log(`Total de empresas analizadas: ${MOCK_COMPANIES.length}`);
    console.log(`Total de empresas objetivo: ${summary.totalCompanies}`);
    console.log(`Total de leads generados: ${summary.totalLeads}`);
    console.log(`Fecha de campaña: ${summary.campaignDate}\n`);

    // Mostrar muestra de leads
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║               MUESTRA DE LEADS GENERADOS (3 primeros)           ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const results = orchestrator.getResults();
    const sampleLeads = results.slice(0, 3);

    sampleLeads.forEach((lead, idx) => {
      console.log(`\n${idx + 1}. ${lead.contact.name.toUpperCase()}`);
      console.log(`   Empresa: ${lead.company.name}`);
      console.log(`   Cargo: ${lead.contact.job_title}`);
      console.log(`   Email: ${lead.contact.email}`);
      console.log(`   Teléfono: ${lead.contact.phone}`);
      console.log(`   Score de Relevancia: ${lead.company.score}/100`);
      console.log(`   Calidad del Contacto: ${lead.contact.enrichmentScore}/100`);
      console.log(`\n   📧 ASUNTO DEL EMAIL:`);
      console.log(`   ${lead.email.subject}\n`);
      console.log(`   📝 VISTA PREVIA DEL CONTENIDO:`);
      console.log(`   ${lead.email.body.split('\n').slice(0, 5).join('\n   ')}\n`);
      console.log(`   [...]`);
    });

    // Archivos generados
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                     ARCHIVOS GENERADOS                          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    summary.filesCreated.forEach((file) => {
      const exists = require('fs').existsSync(file);
      const status = exists ? '✅' : '❌';
      console.log(`${status} ${file}`);
    });

    // Estadísticas
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    ESTADÍSTICAS DE LA CAMPAÑA                   ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const avgRelevanceScore = (
      results.reduce((sum, l) => sum + l.company.score, 0) / results.length
    ).toFixed(1);
    const avgContactQuality = (
      results.reduce((sum, l) => sum + l.contact.enrichmentScore, 0) /
      results.length
    ).toFixed(1);

    console.log(`Score de Relevancia Promedio: ${avgRelevanceScore}/100`);
    console.log(`Calidad de Contacto Promedio: ${avgContactQuality}/100`);
    console.log(
      `Contactos Verificados: ${results.filter((l) => l.contact.verified_email).length}/${results.length}`
    );
    console.log(`LinkedIn URLs Disponibles: ${results.filter((l) => l.contact.linkedin_url).length}/${results.length}`);

    console.log('\n✨ Demostración completada exitosamente!\n');
  } catch (error) {
    console.error('❌ Error en demostración:', error);
    process.exit(1);
  }
}

// Ejecutar
runDemo();
