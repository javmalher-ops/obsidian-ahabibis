/**
 * Módulo de búsqueda y enriquecimiento de contactos
 * Integra con Apollo.io para encontrar decisores en empresas objetivo
 */

const config = require('../config');

class ContactFinder {
  constructor() {
    this.apolloKey = process.env.APOLLO_API_KEY;
    this.baseUrl = config.apis.apollo.baseUrl;
    this.contacts = [];
  }

  /**
   * Busca contactos en una empresa usando Apollo.io
   * En producción, esto usaría la API real de Apollo
   * @param {Object} company - Empresa objetivo
   * @returns {Promise<Array>} Contactos encontrados
   */
  async findContactsAtCompany(company) {
    // Simulación de búsqueda en Apollo.io
    // En producción: POST /contacts/search con criterios de rol

    console.log(`🔍 Buscando contactos en ${company.name}...`);

    // Datos simulados de contactos en la empresa
    const mockContacts = this.generateMockContacts(company);

    return mockContacts.filter((contact) =>
      this.isRelevantRole(contact.job_title)
    );
  }

  /**
   * Verifica si un rol es relevante para prospección
   */
  isRelevantRole(jobTitle) {
    return config.targetRoles.some((role) =>
      jobTitle?.toLowerCase().includes(role.toLowerCase())
    );
  }

  /**
   * Genera datos de contacto simulados para demostración
   */
  generateMockContacts(company) {
    const firstNames = ['Juan', 'María', 'Carlos', 'Ana', 'Roberto'];
    const lastNames = ['García', 'López', 'Martínez', 'Rodríguez', 'Hernández'];
    const roles = config.targetRoles;

    return Array.from({ length: 3 }, (_, i) => ({
      name: `${firstNames[i]} ${lastNames[i]}`,
      job_title: roles[Math.floor(Math.random() * roles.length)],
      email: `${firstNames[i].toLowerCase()}.${lastNames[i].toLowerCase()}@${company.domain || 'empresa.com'}`,
      phone: `+52 55 ${Math.floor(Math.random() * 9000 + 1000)} ${Math.floor(Math.random() * 9000 + 1000)}`,
      linkedin_url: `https://linkedin.com/in/${firstNames[i].toLowerCase()}-${lastNames[i].toLowerCase()}`,
      company_name: company.name,
      company_domain: company.domain,
      verified_email: true,
    }));
  }

  /**
   * Enriquece datos de contacto
   */
  enrichContactData(contact) {
    return {
      ...contact,
      enrichmentScore: this.calculateEnrichmentScore(contact),
      readyForEmail: contact.email && contact.verified_email,
      lastEnriched: new Date().toISOString(),
    };
  }

  /**
   * Calcula puntuación de calidad del contacto
   */
  calculateEnrichmentScore(contact) {
    let score = 0;

    if (contact.verified_email) score += 40;
    if (contact.phone) score += 20;
    if (contact.linkedin_url) score += 15;
    if (this.isRelevantRole(contact.job_title)) score += 25;

    return Math.min(score, 100);
  }
}

module.exports = ContactFinder;
