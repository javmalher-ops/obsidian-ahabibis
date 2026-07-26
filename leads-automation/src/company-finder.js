/**
 * Módulo de búsqueda de empresas objetivo
 * Filtra empresas por industria, tamaño y ubicación
 */

const config = require('../config');

class CompanyFinder {
  constructor() {
    this.companies = [];
  }

  /**
   * Busca empresas que coincidan con criterios objetivo
   * @param {Array} sourceCompanies - Lista de empresas para filtrar
   * @returns {Promise<Array>} Empresas que coinciden
   */
  async findTargetCompanies(sourceCompanies) {
    const { industries, minEmployees, maxEmployees, regions } = config.targetCompanies;

    return sourceCompanies.filter((company) => {
      const industryMatch = industries.some((ind) =>
        company.industry?.toLowerCase().includes(ind.toLowerCase())
      );

      const employeeMatch =
        company.employees >= minEmployees && company.employees <= maxEmployees;

      const regionMatch = regions.some(
        (region) =>
          company.location?.toLowerCase().includes(region.toLowerCase()) ||
          company.city?.toLowerCase().includes(region.toLowerCase())
      );

      return industryMatch && employeeMatch && regionMatch;
    });
  }

  /**
   * Enriquece datos de empresa con información adicional
   * @param {Object} company - Datos básicos de la empresa
   * @returns {Object} Empresa enriquecida
   */
  enrichCompanyData(company) {
    return {
      ...company,
      score: this.calculateRelevanceScore(company),
      lastUpdated: new Date().toISOString(),
      readyForOutreach: true,
    };
  }

  /**
   * Calcula puntuación de relevancia para priorización
   */
  calculateRelevanceScore(company) {
    let score = 0;

    // Tamaño ideal: 200-5000 empleados
    const employees = company.employees || 0;
    if (employees >= 200 && employees <= 5000) score += 30;

    // Industria muy relevante
    if (company.industry?.toLowerCase().includes('logística')) score += 25;
    if (company.industry?.toLowerCase().includes('e-commerce')) score += 20;

    // Ubicación
    if (company.city?.toLowerCase().includes('cdmx')) score += 15;

    // Potencial de ingresos
    if (company.annualRevenue && company.annualRevenue > 50000000) score += 10;

    return score;
  }
}

module.exports = CompanyFinder;
