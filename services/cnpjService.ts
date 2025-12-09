/**
 * CNPJ Lookup Service
 * Uses Brasil API to fetch company data from CNPJ
 */

export interface CNPJData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  email: string;
  telefone: string;
  situacao_cadastral: string;
  atividade_principal: Array<{ code: string; text: string }>;
}

export interface CompanyFromCNPJ {
  name: string;
  tradeName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  status: string;
  mainActivity?: string;
}

/**
 * Formats CNPJ for display (00.000.000/0000-00)
 */
export function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return cnpj;
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

/**
 * Cleans CNPJ (removes formatting)
 */
export function cleanCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

/**
 * Validates CNPJ format
 */
export function isValidCNPJ(cnpj: string): boolean {
  const digits = cleanCNPJ(cnpj);
  if (digits.length !== 14) return false;
  
  // Check for known invalid patterns
  if (/^(\d)\1+$/.test(digits)) return false;
  
  // Validate check digits
  let sum = 0;
  let pos = 5;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i]) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits[12])) return false;
  
  sum = 0;
  pos = 6;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(digits[i]) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits[13])) return false;
  
  return true;
}

/**
 * Fetches company data from CNPJ using Brasil API
 */
export async function lookupCNPJ(cnpj: string): Promise<CompanyFromCNPJ | null> {
  const cleanedCnpj = cleanCNPJ(cnpj);
  
  if (!isValidCNPJ(cleanedCnpj)) {
    throw new Error('CNPJ inválido');
  }

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanedCnpj}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('CNPJ não encontrado na Receita Federal');
      }
      throw new Error('Erro ao consultar CNPJ');
    }

    const data: CNPJData = await response.json();
    
    // Build address string
    const addressParts = [
      data.logradouro,
      data.numero,
      data.complemento,
      data.bairro
    ].filter(Boolean);
    
    return {
      name: data.nome_fantasia || data.razao_social,
      tradeName: data.razao_social,
      email: data.email || undefined,
      phone: data.telefone || undefined,
      address: addressParts.join(', '),
      city: data.municipio,
      state: data.uf,
      status: data.situacao_cadastral,
      mainActivity: data.atividade_principal?.[0]?.text
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro ao consultar CNPJ');
  }
}
