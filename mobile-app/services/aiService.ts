import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIModel, AIProvider } from './aiModels';
import { AI_MODELS } from './aiModels';

// API Keys from environment
const LLM_PROVIDER_API_KEY = process.env.EXPO_PUBLIC_LLM_PROVIDER_API_KEY ?? '';
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  text: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface AIServiceConfig {
  model: AIModel;
  systemPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

// Abstract AI Provider interface
interface AIProviderInterface {
  sendMessage(messages: AIMessage[], config: AIServiceConfig): Promise<AIResponse>;
}

// LLM Provider (LLM provider API)
class LLMProvider implements AIProviderInterface {
  private apiUrl = 'https://api.llm-provider.com/v1/messages';

  async sendMessage(messages: AIMessage[], config: AIServiceConfig): Promise<AIResponse> {
    if (!LLM_PROVIDER_API_KEY) {
      throw new Error('LLM_PROVIDER_API_KEY not configured');
    }

    const modelConfig = AI_MODELS[config.model];
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': LLM_PROVIDER_API_KEY,
        'llm-provider-version': '2023-06-01',
        'llm-provider-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: modelConfig.apiModelId,
        max_tokens: config.maxTokens || 1024,
        temperature: config.temperature || 1.0,
        system: config.systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM API error ${response.status}: ${error}`);
    }

    const result = await response.json();

    // Extract text from response (handle tool results if present)
    const textBlocks = (result.content || [])
      .filter((block: { type: string }) => block.type === 'text')
      .map((block: { text: string }) => block.text);

    return {
      text: textBlocks.join('\n\n'),
      usage: {
        inputTokens: result.usage?.input_tokens || 0,
        outputTokens: result.usage?.output_tokens || 0,
      },
    };
  }
}

// Gemini Provider (Google AI)
class GeminiProvider implements AIProviderInterface {
  private genAI: GoogleGenerativeAI;

  constructor() {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }
    this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }

  async sendMessage(messages: AIMessage[], config: AIServiceConfig): Promise<AIResponse> {
    const modelConfig = AI_MODELS[config.model];
    const model = this.genAI.getGenerativeModel({
      model: modelConfig.apiModelId,
      systemInstruction: config.systemPrompt,
    });

    // Convert messages to Gemini format
    const history = messages.slice(0, -1).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      throw new Error('Last message must be from user');
    }

    const chat = model.startChat({
      history,
      generationConfig: {
        maxOutputTokens: config.maxTokens || 1024,
        temperature: config.temperature || 1.0,
      },
    });

    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;
    const text = response.text();

    // Gemini token counting
    const usageMetadata = response.usageMetadata;

    return {
      text,
      usage: {
        inputTokens: usageMetadata?.promptTokenCount || 0,
        outputTokens: usageMetadata?.candidatesTokenCount || 0,
      },
    };
  }
}

// Factory: Create AI service based on provider
function getProvider(provider: AIProvider): AIProviderInterface {
  switch (provider) {
    case 'llm':
      return new LLMProvider();
    case 'gemini':
      return new GeminiProvider();
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// Main AI Service
export async function sendAIMessage(
  messages: AIMessage[],
  config: AIServiceConfig
): Promise<AIResponse> {
  const modelConfig = AI_MODELS[config.model];
  const provider = getProvider(modelConfig.provider);
  return provider.sendMessage(messages, config);
}

// Export for backward compatibility
export { LLM_PROVIDER_API_KEY, GEMINI_API_KEY };
