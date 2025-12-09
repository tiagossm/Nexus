import { GoogleGenAI, Type } from "@google/genai";
import type { AIMeetingSuggestion } from "../types";

// Configuração da API Key via variáveis de ambiente
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

// Validação de configuração
if (!apiKey && import.meta.env.MODE === 'production') {
  console.error('❌ VITE_GEMINI_API_KEY não configurado. Configure no .env.local');
}

const ai = new GoogleGenAI({ apiKey });

// Constantes de configuração
const MAX_PROMPT_LENGTH = 500;
const REQUEST_TIMEOUT = 10000; // 10 segundos

const eventSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "Um título profissional para o evento da reunião em Português.",
    },
    duration: {
      type: Type.INTEGER,
      description: "Duração em minutos (ex: 15, 30, 45, 60).",
    },
    description: {
      type: Type.STRING,
      description: "Uma descrição concisa e profissional do objetivo da reunião em Português.",
    },
    location: {
      type: Type.STRING,
      description: "A plataforma (ex: Google Meet, Zoom, Chamada Telefônica).",
    },
  },
  required: ["title", "duration", "description", "location"],
};

export const generateEventDetails = async (prompt: string): Promise<AIMeetingSuggestion> => {
  // Validação 1: Verificar se API key está configurada
  if (!apiKey) {
    throw new Error('Gemini API key não configurada. Configure VITE_GEMINI_API_KEY no .env.local');
  }

  // Validação 2: Sanitizar e validar tamanho do prompt
  const sanitizedPrompt = prompt.trim();
  if (!sanitizedPrompt) {
    throw new Error('Prompt não pode estar vazio');
  }
  if (sanitizedPrompt.length > MAX_PROMPT_LENGTH) {
    throw new Error(`Prompt muito longo. Máximo: ${MAX_PROMPT_LENGTH} caracteres`);
  }

  try {
    // Validação 3: Implementar timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT);
    });

    const requestPromise = ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Crie um evento de reunião profissional com base nesta solicitação: "${sanitizedPrompt}". O tom deve ser corporativo e amigável. Responda APENAS em Português.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: eventSchema,
        systemInstruction: "Você é um assistente de agendamento útil para um aplicativo de calendário profissional. Gere todo o conteúdo em Português.",
      },
    });

    const response = await Promise.race([requestPromise, timeoutPromise]);

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as AIMeetingSuggestion;
  } catch (error) {
    console.error("Error generating event:", error);

    // Fallback com mensagem mais informativa
    return {
      title: "Nova Reunião",
      duration: 30,
      description: "Erro ao gerar evento com IA. Por favor, tente novamente.",
      location: "Google Meet"
    };
  }
};