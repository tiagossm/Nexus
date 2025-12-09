/**
 * Template Variable Replacement Utility
 * Provides robust variable substitution for email templates
 */

// Escape regex special characters
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Replace template variables in content
 * Supports multiple formats: {var}, {{var}}, {{ var }}, {{var.name}}, etc.
 * 
 * @param template - The template string with {variables} or {{variables}}
 * @param variables - Record of variable names to values
 * @param options - Configuration options
 * @returns The processed template string
 */
export function replaceTemplateVariables(
  template: string, 
  variables: Record<string, string>,
  options: {
    cleanUnused?: boolean;  // Remove unreplaced variables
    defaultValue?: string;  // Default for unreplaced vars
  } = {}
): string {
  let result = template;
  
  // Sort keys by length (longest first) to avoid partial replacements
  const sortedKeys = Object.keys(variables).sort((a, b) => b.length - a.length);
  
  for (const key of sortedKeys) {
    const value = variables[key];
    const escapedKey = escapeRegex(key);
    
    // Replace DOUBLE braces first: {{var}} and {{ var }}
    const doubleRegex = new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, 'gi');
    result = result.replace(doubleRegex, value);
    
    // Replace SINGLE braces: {var}
    const singleRegex = new RegExp(`\\{${escapedKey}\\}`, 'gi');
    result = result.replace(singleRegex, value);
  }
  
  // Handle unreplaced variables
  if (options.cleanUnused) {
    // Remove any remaining {{...}} patterns (double braces)
    result = result.replace(/\{\{[^}]+\}\}/g, options.defaultValue || '');
    // Remove any remaining {...} patterns (single braces) - but not CSS
    result = result.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, options.defaultValue || '');
  }
  
  return result;
}

/**
 * Build standard email variables from campaign context
 */
export function buildEmailVariables(context: {
  contact: {
    name?: string;
    email?: string;
    phone?: string;
  };
  campaign?: {
    title?: string;
    description?: string;
    deadline_date?: string;
  };
  clinic?: {
    name?: string;
    address?: string;
    phone?: string;
  } | null;
  exams?: Array<{ name: string; preparation_instructions?: string }>;
  recipientId: string;
  companyName?: string;
  supabaseUrl?: string;
  baseUrl?: string;
}): Record<string, string> {
  const {
    contact,
    campaign,
    clinic,
    exams = [],
    recipientId,
    companyName = 'Nexus Agenda',
    baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  } = context;

  const firstName = contact.name?.split(' ')[0] || 'Cliente';
  const examNames = exams.length > 0 ? exams.map(e => e.name).join(', ') : 'Exame Ocupacional';
  const deadlineDate = campaign?.deadline_date 
    ? new Date(campaign.deadline_date).toLocaleDateString('pt-BR') 
    : 'a definir';
  const bookingLink = `${baseUrl}/book/${recipientId}`;
  
  // Preparation instructions (combined from all exams)
  const preparationList = exams
    .filter(e => e.preparation_instructions)
    .map(e => `<strong>${e.name}:</strong> ${e.preparation_instructions}`)
    .join('<br>');
  const preparation = preparationList || 'Não há preparos específicos para este exame.';
  
  // Google Maps link (HTML button)
  const clinicAddress = clinic?.address || '';
  const googleMapsUrl = clinicAddress 
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinicAddress)}`
    : '';
  const googleMapsLink = googleMapsUrl
    ? `<a href="${googleMapsUrl}" target="_blank" style="color: #4f46e5; text-decoration: none;">📍 Ver no Google Maps</a>`
    : '';
  
  // Booking link as HTML button
  const bookingLinkHtml = `<a href="${bookingLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 10px 0;">📅 Agendar Agora</a>`;

  return {
    // Greeting variations
    'greeting': `Olá ${firstName}`,
    'saudacao': `Olá ${firstName}`,
    
    // Contact variations
    'contact.name': contact.name || '',
    'contact.firstName': firstName,
    'contact.email': contact.email || '',
    'contact.phone': contact.phone || '',
    'nome': contact.name || '',
    'primeiro_nome': firstName,
    'email': contact.email || '',
    'telefone': contact.phone || '',
    
    // Company variations
    'company.name': companyName,
    'empresa': companyName,
    
    // Booking/Link variations
    'link_agendamento': bookingLink,
    'booking_link': bookingLink,
    'link': bookingLink,
    'booking_link_html': bookingLinkHtml,
    'link_html': bookingLinkHtml,
    'botao_agendar': bookingLinkHtml,
    
    // Deadline variations
    'data_limite': deadlineDate,
    'deadline': deadlineDate,
    'prazo': deadlineDate,
    
    // Exam variations
    'exam.name': examNames,
    'exam name': examNames,
    'exame': examNames,
    'exames': examNames,
    'exam.date': deadlineDate,
    'exam date': deadlineDate,
    'data_exame': deadlineDate,
    'exam.time': 'horário a confirmar',
    'exam time': 'horário a confirmar',
    'horario': 'horário a confirmar',
    
    // Preparation variations
    'preparation': preparation,
    'preparo': preparation,
    'preparacao': preparation,
    'exam_preparation': preparation,
    
    // Clinic variations
    'clinic.name': clinic?.name || 'Clínica não definida',
    'clinic name': clinic?.name || 'Clínica não definida',
    'clinica': clinic?.name || 'Clínica não definida',
    'clinic.address': clinic?.address || '',
    'endereco': clinic?.address || '',
    'local': clinic?.address || clinic?.name || 'Local a definir',
    'clinic.phone': clinic?.phone || '',
    'telefone_clinica': clinic?.phone || '',
    
    // Google Maps link
    'google_maps_link': googleMapsLink,
    'link_mapa': googleMapsLink,
    'mapa': googleMapsLink,
    'google_maps_url': googleMapsUrl,
    
    // Campaign variations
    'campaign.title': campaign?.title || '',
    'campaign.description': campaign?.description || '',
    'titulo_campanha': campaign?.title || '',
    'descricao_campanha': campaign?.description || ''
  };
}

/**
 * Ensure content is properly formatted as HTML
 * Converts plain text with line breaks to HTML paragraphs
 */
export function ensureHtmlFormatting(content: string): string {
  if (!content) return '';
  
  // If already has HTML tags, just ensure line breaks are handled
  if (/<[^>]+>/.test(content)) {
    // Replace any \n that are not inside tags with <br>
    return content.replace(/\n/g, '<br>\n');
  }
  
  // Plain text - convert to HTML
  const paragraphs = content.split(/\n\n+/);
  
  const htmlParagraphs = paragraphs.map(p => {
    // Convert single line breaks to <br>
    const withBreaks = p.trim().replace(/\n/g, '<br>');
    return `<p style="margin: 0 0 16px 0; line-height: 1.6;">${withBreaks}</p>`;
  });
  
  return htmlParagraphs.join('\n');
}

/**
 * Wrap content in a professional email template
 */
export function wrapInEmailTemplate(content: string, options?: {
  companyName?: string;
  primaryColor?: string;
  logoUrl?: string;
  footerText?: string;
  contactEmail?: string;
  contactPhone?: string;
  websiteUrl?: string;
}): string {
  const { 
    companyName = 'Nexus Agenda', 
    primaryColor = '#4F46E5',
    logoUrl,
    footerText,
    contactEmail,
    contactPhone,
    websiteUrl
  } = options || {};
  
  const headerContent = logoUrl 
    ? `<img src="${logoUrl}" alt="${companyName}" style="max-height: 40px; width: auto;" />`
    : `<h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">${companyName}</h1>`;
  
  const footerContent = footerText 
    ? footerText.replace(/\{\{company_name\}\}/gi, companyName)
    : `Este email foi enviado por ${companyName}`;
  
  const contactInfo = [];
  if (contactEmail) contactInfo.push(`<a href="mailto:${contactEmail}" style="color: #6b7280; text-decoration: none;">${contactEmail}</a>`);
  if (contactPhone) contactInfo.push(`<a href="tel:${contactPhone}" style="color: #6b7280; text-decoration: none;">${contactPhone}</a>`);
  if (websiteUrl) contactInfo.push(`<a href="${websiteUrl}" style="color: #6b7280; text-decoration: none;">${websiteUrl}</a>`);
  
  const contactLine = contactInfo.length > 0 
    ? `<p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">${contactInfo.join(' | ')}</p>` 
    : '';
  
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; background-color: ${primaryColor}; border-radius: 12px 12px 0 0;">
              ${headerContent}
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px; color: #374151; font-size: 16px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                ${footerContent}
              </p>
              ${contactLine}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export default { replaceTemplateVariables, buildEmailVariables, ensureHtmlFormatting, wrapInEmailTemplate };
