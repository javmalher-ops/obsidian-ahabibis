/**
 * Módulo de generación de emails personalizados
 * Crea correos únicos basados en datos del contacto y empresa
 */

class EmailGenerator {
  /**
   * Genera email personalizado para un contacto
   * @param {Object} contact - Datos del contacto
   * @param {Object} company - Datos de la empresa
   * @returns {Object} Email con asunto y cuerpo
   */
  generateEmail(contact, company) {
    const subject = this.generateSubject(contact, company);
    const body = this.generateBody(contact, company);
    const htmlBody = this.generateHtmlBody(contact, company);

    return {
      to: contact.email,
      subject,
      body,
      htmlBody,
      metadata: {
        contactName: contact.name,
        contactRole: contact.job_title,
        companyName: company.name,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Genera asunto personalizado
   */
  generateSubject(contact, company) {
    const subjects = [
      `${contact.name}: Reducir costos de última milla en ${company.name}`,
      `Solución logística para ${company.name} - Conversemos`,
      `${contact.name}, ¿cómo es tu logística última milla?`,
      `Ahorro de hasta 30% en costos de distribución para ${company.name}`,
    ];

    return subjects[Math.floor(Math.random() * subjects.length)];
  }

  /**
   * Genera cuerpo de email en texto plano
   */
  generateBody(contact, company) {
    return `¡Hola ${contact.name}!

Hace poco noté que trabajan en ${company.name} en el área de ${contact.job_title.toLowerCase()}.

En iMile ayudamos a empresas como la tuya a optimizar su logística de última milla. Específicamente:

• Reducimos costos operativos entre 20-30%
• Mejoramos tiempos de entrega en un promedio de 40%
• Automatizamos procesos manuales con IA

Sabemos que en ${company.name} probablemente están buscando formas de mejorar la eficiencia logística. Nos encantaría platicar brevemente sobre cómo otras empresas de tu tamaño lo están logrando.

¿Te parece bien una llamada de 15 minutos la próxima semana?

¡Saludos!
Javier Malher
iMile Delivery México
javmalher@gmail.com`;
  }

  /**
   * Genera cuerpo HTML con mejor formato
   */
  generateHtmlBody(contact, company) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: #002d5b; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { padding: 20px; background: #f9f9f9; }
    .benefits { margin: 15px 0; }
    .benefit-item { margin: 10px 0; padding-left: 20px; }
    .cta { margin-top: 20px; }
    .button { background: #002d5b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
    .footer { font-size: 12px; color: #666; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>¡Hola ${contact.name}!</h1>
    </div>
    <div class="content">
      <p>Hace poco noté que trabajan en <strong>${company.name}</strong> en el área de <strong>${contact.job_title}</strong>.</p>

      <p>En <strong>iMile</strong> ayudamos a empresas como la tuya a optimizar su logística de última milla.</p>

      <div class="benefits">
        <h3>Lo que logramos:</h3>
        <div class="benefit-item">✓ Reducimos costos operativos entre 20-30%</div>
        <div class="benefit-item">✓ Mejoramos tiempos de entrega en un promedio de 40%</div>
        <div class="benefit-item">✓ Automatizamos procesos manuales con IA</div>
      </div>

      <p>Sabemos que en ${company.name} probablemente están buscando formas de mejorar la eficiencia logística. Nos encantaría platicar brevemente sobre cómo otras empresas de tu tamaño lo están logrando.</p>

      <div class="cta">
        <p><strong>¿Te parece bien una llamada de 15 minutos la próxima semana?</strong></p>
        <a href="https://calendly.com/javmalher" class="button">Agendar conversación</a>
      </div>

      <div class="footer">
        <p><strong>Javier Malher</strong><br>
        iMile Delivery México<br>
        javmalher@gmail.com<br>
        <a href="https://imile.mx">www.imile.mx</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
  }
}

module.exports = EmailGenerator;
