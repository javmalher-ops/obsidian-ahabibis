/**
 * Orquestador del flujo completo de automatización de leads y emails
 * Coordina: búsqueda de empresas → búsqueda de contactos → generación de emails
 */

const CompanyFinder = require('./company-finder');
const ContactFinder = require('./contact-finder');
const EmailGenerator = require('./email-generator');
const config = require('../config');
const fs = require('fs');
const path = require('path');

class AutomationOrchestrator {
  constructor() {
    this.companyFinder = new CompanyFinder();
    this.contactFinder = new ContactFinder();
    this.emailGenerator = new EmailGenerator();
    this.results = [];
    this.ensureOutputDirs();
  }

  /**
   * Crea directorios de salida si no existen
   */
  ensureOutputDirs() {
    Object.values(config.output).forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Ejecuta el flujo completo de automatización
   * @param {Array} sourceCompanies - Lista de empresas para procesar
   * @returns {Promise<Object>} Resumen de resultados
   */
  async runAutomation(sourceCompanies) {
    console.log('\n🚀 Iniciando automatización de leads y emails...\n');

    const startTime = Date.now();

    try {
      // Paso 1: Búsqueda de empresas objetivo
      console.log('📊 Paso 1: Filtrando empresas objetivo...');
      const targetCompanies = await this.companyFinder.findTargetCompanies(
        sourceCompanies
      );
      console.log(`✅ Encontradas ${targetCompanies.length} empresas objetivo\n`);

      // Paso 2: Para cada empresa, buscar contactos
      console.log('👥 Paso 2: Buscando contactos en empresas...');
      const leads = [];

      for (const company of targetCompanies) {
        const enrichedCompany = this.companyFinder.enrichCompanyData(company);
        const contacts = await this.contactFinder.findContactsAtCompany(company);

        for (const contact of contacts) {
          const enrichedContact = this.contactFinder.enrichContactData(contact);
          leads.push({
            company: enrichedCompany,
            contact: enrichedContact,
          });
        }
      }
      console.log(`✅ Encontrados ${leads.length} contactos relevantes\n`);

      // Paso 3: Generar emails personalizados
      console.log('💌 Paso 3: Generando emails personalizados...');
      const campaigns = [];

      for (const lead of leads) {
        const email = this.emailGenerator.generateEmail(lead.contact, lead.company);
        campaigns.push({
          ...lead,
          email,
          status: 'ready',
          createdAt: new Date().toISOString(),
        });
      }
      console.log(`✅ Generados ${campaigns.length} emails personalizados\n`);

      // Guardar resultados
      this.results = campaigns;
      const summary = await this.saveResults(campaigns);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n✨ Automatización completada en ${duration}s`);
      console.log(`📈 Resumen: ${summary.totalLeads} leads listos para contacto`);

      return summary;
    } catch (error) {
      console.error('❌ Error en automatización:', error.message);
      throw error;
    }
  }

  /**
   * Guarda resultados en archivos
   */
  async saveResults(campaigns) {
    const timestamp = new Date().toISOString().split('T')[0];
    const reportPath = path.join(
      config.output.resultsDir,
      `leads-${timestamp}.json`
    );
    const csvPath = path.join(config.output.resultsDir, `leads-${timestamp}.csv`);
    const emailsPath = path.join(
      config.output.resultsDir,
      `emails-${timestamp}.txt`
    );

    // Guardar JSON completo
    fs.writeFileSync(reportPath, JSON.stringify(campaigns, null, 2));
    console.log(`📄 Reporte JSON: ${reportPath}`);

    // Guardar CSV
    const csvContent = this.generateCSV(campaigns);
    fs.writeFileSync(csvPath, csvContent);
    console.log(`📊 CSV de leads: ${csvPath}`);

    // Guardar emails como muestra
    const emailsContent = campaigns
      .slice(0, 3)
      .map((c) => this.formatEmailForPreview(c))
      .join('\n' + '='.repeat(80) + '\n');
    fs.writeFileSync(emailsPath, emailsContent);
    console.log(`📧 Muestra de emails: ${emailsPath}`);

    return {
      totalLeads: campaigns.length,
      totalCompanies: new Set(campaigns.map((c) => c.company.name)).size,
      filesCreated: [reportPath, csvPath, emailsPath],
      campaignDate: timestamp,
    };
  }

  /**
   * Genera contenido CSV
   */
  generateCSV(campaigns) {
    const headers = [
      'empresa',
      'sitio_web',
      'contacto',
      'cargo',
      'email',
      'telefono',
      'linkedin',
      'score_relevancia',
      'calidad_contacto',
    ];

    const rows = campaigns.map((c) => [
      c.company.name,
      c.company.domain || '',
      c.contact.name,
      c.contact.job_title,
      c.contact.email,
      c.contact.phone || '',
      c.contact.linkedin_url || '',
      c.company.score,
      c.contact.enrichmentScore,
    ]);

    return (
      headers.join(',') +
      '\n' +
      rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
    );
  }

  /**
   * Formatea email para vista previa
   */
  formatEmailForPreview(campaign) {
    return `CONTACTO: ${campaign.contact.name}
EMPRESA: ${campaign.company.name}
CARGO: ${campaign.contact.job_title}
EMAIL: ${campaign.contact.email}

ASUNTO: ${campaign.email.subject}

${campaign.email.body}`;
  }

  /**
   * Retorna los resultados generados
   */
  getResults() {
    return this.results;
  }
}

module.exports = AutomationOrchestrator;
