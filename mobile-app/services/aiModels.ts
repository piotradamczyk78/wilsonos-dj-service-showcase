// AI Models configuration and pricing

export type AIProvider = 'llm' | 'gemini';

export type AIModel =
  | 'llm-sonnet-4.5'
  | 'llm-haiku-4'
  | 'gemini-flash-2.0'
  | 'gemini-pro-2.0';

export interface ModelConfig {
  id: AIModel;
  provider: AIProvider;
  displayName: string;
  apiModelId: string; // Actual model ID for API
  // Pricing per 1M tokens (input / output) in USD
  inputPrice: number;
  outputPrice: number;
  // UI metadata
  emoji: string;
  description: string;
  recommended?: boolean;
}

export const AI_MODELS: Record<AIModel, ModelConfig> = {
  'llm-sonnet-4.5': {
    id: 'llm-sonnet-4.5',
    provider: 'llm',
    displayName: 'LLM Sonnet 4.5',
    apiModelId: 'llm-sonnet-4-5-20250929',
    inputPrice: 3.0,
    outputPrice: 15.0,
    emoji: '🧠',
    description: 'Najbardziej inteligentny, najlepsze analizy psychologiczne',
  },
  'llm-haiku-4': {
    id: 'llm-haiku-4',
    provider: 'llm',
    displayName: 'LLM Haiku 4',
    apiModelId: 'llm-haiku-4-20250305',
    inputPrice: 0.25,
    outputPrice: 1.25,
    emoji: '⚡',
    description: 'Szybki i tani, świetny na eksperymenty',
    recommended: true,
  },
  'gemini-flash-2.0': {
    id: 'gemini-flash-2.0',
    provider: 'gemini',
    displayName: 'Gemini Flash 2.0',
    apiModelId: 'gemini-2.0-flash-exp',
    inputPrice: 0.075,
    outputPrice: 0.30,
    emoji: '⚡',
    description: 'Najtańszy, doskonały na częste użycie',
    recommended: true,
  },
  'gemini-pro-2.0': {
    id: 'gemini-pro-2.0',
    provider: 'gemini',
    displayName: 'Gemini Pro 2.0',
    apiModelId: 'gemini-2.0-pro-exp',
    inputPrice: 1.25,
    outputPrice: 5.0,
    emoji: '🤖',
    description: 'Mocny i tańszy od Sonnet',
  },
};

// Default model for new users
export const DEFAULT_MODEL: AIModel = 'gemini-flash-2.0';

// Calculate token cost in USD
export function calculateTokenCost(
  model: AIModel,
  inputTokens: number,
  outputTokens: number
): number {
  const config = AI_MODELS[model];
  const inputCost = (inputTokens / 1_000_000) * config.inputPrice;
  const outputCost = (outputTokens / 1_000_000) * config.outputPrice;
  return inputCost + outputCost;
}

// Convert USD to credits (1 USD = 1000 credits for simplicity)
export const USD_TO_CREDITS = 1000;

export function calculateCreditCost(
  model: AIModel,
  inputTokens: number,
  outputTokens: number
): number {
  const usdCost = calculateTokenCost(model, inputTokens, outputTokens);
  return Math.ceil(usdCost * USD_TO_CREDITS);
}

// Starter pack pricing
export const STARTER_CREDITS = 1000; // 1 USD worth
export const POPULAR_CREDITS = 5000; // 5 USD worth
export const POWER_CREDITS = 10000; // 10 USD worth
