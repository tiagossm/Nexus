import { MessageChannel } from '../types';

export interface VariableDefinition {
  key: string;
  label: string;
  description: string;
  category: 'contact' | 'clinic' | 'exam' | 'system';
  required?: boolean;
  example: string;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  invalidVariables?: string[];
  missingRequired?: string[];
}

/**
 * Definições de todas as variáveis disponíveis no sistema
 */
export const AVAILABLE_VARIABLES: VariableDefinition[] = [
  // Contato
  {
    key: 'contact.name',
    label: 'Nome Completo',
    description: 'Nome completo do contato',
    category: 'contact',
    example: 'João da Silva'
  },
  {
    key: 'contact.firstName',
    label: 'Primeiro Nome',
    description: 'Primeiro nome do contato',
    category: 'contact',
    example: 'João'
  },
  {
    key: 'contact.email',
    label: 'Email',
    description: 'Endereço de email do contato',
    category: 'contact',
    example: 'joao.silva@email.com'
  },
  {
    key: 'contact.phone',
    label: 'Telefone',
    description: 'Número de telefone do contato',
    category: 'contact',
    example: '(11) 98765-4321'
  },
  
  // Clínica
  {
    key: 'clinic.name',
    label: 'Nome da Clínica',
    description: 'Nome da clínica selecionada',
    category: 'clinic',
    example: 'Clínica Exemplo'
  },
  {
    key: 'clinic.address',
    label: 'Endereço da Clínica',
    description: 'Endereço completo da clínica',
    category: 'clinic',
    example: 'Rua das Flores, 123 - Centro, São Paulo - SP'
  },
  {
    key: 'clinic.phone',
    label: 'Telefone da Clínica',
    description: 'Telefone de contato da clínica',
    category: 'clinic',
    example: '(11) 3456-7890'
  },
  
  // Exame
  {
    key: 'exam.name',
    label: 'Nome do Exame',
    description: 'Nome do exame agendado',
    category: 'exam',
    example: 'Raio-X de Tórax'
  },
  {
    key: 'exam.date',
    label: 'Data do Exame',
    description: 'Data do agendamento do exame',
    category: 'exam',
    example: '15/12/2024'
  },
  {
    key: 'exam.time',
    label: 'Horário do Exame',
    description: 'Horário do agendamento',
    category: 'exam',
    example: '14:30'
  },
  {
    key: 'exam.location',
    label: 'Local do Exame',
    description: 'Localização dentro da clínica',
    category: 'exam',
    example: 'Sala 3 - Térreo'
  },
  
  // Sistema
  {
    key: 'link_agendamento',
    label: 'Link de Agendamento',
    description: 'Link único e personalizado para agendamento',
    category: 'system',
    required: true,
    example: 'https://app.nexusagenda.com/book/abc123'
  },
  {
    key: 'data_limite',
    label: 'Data Limite',
    description: 'Prazo final para realizar o agendamento',
    category: 'system',
    example: '31/12/2024'
  },
  {
    key: 'greeting',
    label: 'Saudação Automática',
    description: 'Saudação baseada no horário (Bom dia/Boa tarde/Boa noite)',
    category: 'system',
    example: 'Boa tarde'
  },
  {
    key: 'today',
    label: 'Data Atual',
    description: 'Data de hoje formatada',
    category: 'system',
    example: '02/12/2024'
  },
  {
    key: 'company.name',
    label: 'Nome da Empresa',
    description: 'Nome da sua empresa/organização',
    category: 'system',
    example: 'Nexus Agenda'
  }
];

/**
 * Extrai todas as variáveis usadas em um texto
 */
export function extractVariables(text: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const matches: string[] = [];
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    const variable = match[1].trim();
    if (!matches.includes(variable)) {
      matches.push(variable);
    }
  }
  
  return matches;
}

/**
 * Obtém todas as variáveis disponíveis
 */
export function getAvailableVariables(): VariableDefinition[] {
  return AVAILABLE_VARIABLES;
}

/**
 * Obtém variáveis por categoria
 */
export function getVariablesByCategory(category: VariableDefinition['category']): VariableDefinition[] {
  return AVAILABLE_VARIABLES.filter(v => v.category === category);
}

/**
 * Busca variáveis por termo
 */
export function searchVariables(searchTerm: string): VariableDefinition[] {
  const term = searchTerm.toLowerCase();
  return AVAILABLE_VARIABLES.filter(v => 
    v.key.toLowerCase().includes(term) ||
    v.label.toLowerCase().includes(term) ||
    v.description.toLowerCase().includes(term)
  );
}

/**
 * Valida um template verificando se todas as variáveis usadas são válidas
 */
export function validateTemplate(
  body: string,
  channel: MessageChannel,
  subject?: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const invalidVariables: string[] = [];
  const missingRequired: string[] = [];
  
  // Combinar subject e body para validação
  const fullText = [subject, body].filter(Boolean).join(' ');
  
  // Extrair variáveis usadas
  const usedVariables = extractVariables(fullText);
  const availableKeys = AVAILABLE_VARIABLES.map(v => v.key);
  
  // Verificar variáveis inválidas
  usedVariables.forEach(variable => {
    if (!availableKeys.includes(variable)) {
      invalidVariables.push(variable);
      
      // Tentar sugerir correção
      const suggestion = findSimilarVariable(variable);
      if (suggestion) {
        errors.push(`Variável "{{${variable}}}" não existe. Você quis dizer "{{${suggestion}}}"?`);
      } else {
        errors.push(`Variável "{{${variable}}}" não existe.`);
      }
    }
  });
  
  // Verificar variáveis obrigatórias
  const requiredVariables = AVAILABLE_VARIABLES.filter(v => v.required);
  requiredVariables.forEach(reqVar => {
    if (!usedVariables.includes(reqVar.key)) {
      missingRequired.push(reqVar.key);
      warnings.push(`Recomendado incluir a variável obrigatória "{{${reqVar.key}}}" (${reqVar.label})`);
    }
  });
  
  // Validações específicas por canal
  if (channel === 'email' && subject && !subject.trim()) {
    errors.push('Email deve ter um assunto');
  }
  
  if (channel === 'sms') {
    const length = body.length;
    if (length > 160) {
      warnings.push(`SMS tem ${length} caracteres. Mensagens acima de 160 caracteres podem ser divididas.`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
    invalidVariables: invalidVariables.length > 0 ? invalidVariables : undefined,
    missingRequired: missingRequired.length > 0 ? missingRequired : undefined
  };
}

/**
 * Encontra variável similar para sugestão de correção
 */
function findSimilarVariable(variable: string): string | null {
  const availableKeys = AVAILABLE_VARIABLES.map(v => v.key);
  
  // Busca exata ignorando case
  const exactMatch = availableKeys.find(k => k.toLowerCase() === variable.toLowerCase());
  if (exactMatch) return exactMatch;
  
  // Busca por substring
  const substringMatch = availableKeys.find(k => 
    k.toLowerCase().includes(variable.toLowerCase()) ||
    variable.toLowerCase().includes(k.toLowerCase())
  );
  if (substringMatch) return substringMatch;
  
  // Busca por distância de Levenshtein (similar)
  const distances = availableKeys.map(k => ({
    key: k,
    distance: levenshteinDistance(variable.toLowerCase(), k.toLowerCase())
  }));
  
  distances.sort((a, b) => a.distance - b.distance);
  
  // Se a distância for razoável (menos de 3 caracteres de diferença), sugerir
  if (distances[0] && distances[0].distance <= 3) {
    return distances[0].key;
  }
  
  return null;
}

/**
 * Calcula distância de Levenshtein entre duas strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}
