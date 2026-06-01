/**
 * DJ Service - High-level API that combines AI calls with credits management
 * Use this instead of calling llm.ts directly from UI components
 */

import type { DJPersonaId } from '@/constants/DJPersonas';
import type { AIModel } from './aiModels';
import { generatePlaylistAnalysis, sendDJChatMessage, type ChatMessage, type PlaylistData } from './llm';

export interface DJServiceCallbacks {
  deductCredits: (inputTokens: number, outputTokens: number, model: AIModel) => Promise<void>;
  selectedModel: AIModel;
}

/**
 * Generate playlist analysis with automatic credits deduction
 */
export async function analyzePlaylist(
  data: PlaylistData,
  personaId: DJPersonaId,
  callbacks: DJServiceCallbacks
): Promise<string> {
  const result = await generatePlaylistAnalysis(data, personaId, callbacks.selectedModel);

  // Deduct credits based on actual usage
  await callbacks.deductCredits(result.usage.inputTokens, result.usage.outputTokens, callbacks.selectedModel);

  return result.text;
}

/**
 * Send chat message to DJ with automatic credits deduction
 */
export async function chatWithDJ(
  personaId: DJPersonaId,
  messages: ChatMessage[],
  spotifyContext: string | undefined,
  callbacks: DJServiceCallbacks
): Promise<string> {
  const result = await sendDJChatMessage(personaId, messages, spotifyContext, callbacks.selectedModel);

  // Deduct credits based on actual usage
  await callbacks.deductCredits(result.usage.inputTokens, result.usage.outputTokens, callbacks.selectedModel);

  return result.text;
}
