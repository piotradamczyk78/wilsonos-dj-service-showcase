import { File, Directory, Paths } from 'expo-file-system';
import { DJ_PERSONAS, type DJPersonaId } from '@/constants/DJPersonas';
import { sendAIMessage, type AIMessage, type AIResponse } from './aiService';
import { DEFAULT_MODEL, type AIModel } from './aiModels';
import { PERSONA_ANALYSIS_PROMPTS, PERSONA_CHAT_PROMPTS } from './prompts';

// Re-export for backward compatibility
export { LLM_PROVIDER_API_KEY } from './aiService';

const CHAT_LOG_DIR_NAME = 'chat-logs';

function getLogDir(): Directory {
  const dir = new Directory(Paths.document, CHAT_LOG_DIR_NAME);
  if (!dir.exists) {
    dir.create();
  }
  return dir;
}

function logChatMessage(personaId: DJPersonaId, role: string, content: string) {
  // Zawsze loguj do konsoli Metro — tak, żeby automation assistant widział rozmowę
  console.log(`[DJ-CHAT] [${personaId}] [${role}]: ${content}`);

  try {
    const dir = getLogDir();
    const date = new Date().toISOString().split('T')[0];
    const logFile = new File(dir, `${date}_${personaId}.jsonl`);
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      persona: personaId,
      role,
      content,
    }) + '\n';

    if (logFile.exists) {
      const existing = logFile.textSync();
      logFile.write(existing + entry);
    } else {
      logFile.create();
      logFile.write(entry);
    }
  } catch (e) {
    console.log('Chat log write error:', e);
  }
}

export function listChatLogs(): string[] {
  try {
    const dir = getLogDir();
    return dir.list().map((f) => f.name ?? '').filter(Boolean);
  } catch {
    return [];
  }
}

export function readChatLog(filename: string): string {
  const dir = getLogDir();
  const file = new File(dir, filename);
  return file.exists ? file.textSync() : '';
}

export interface PlaylistData {
  playlistName: string;
  trackCount: number;
  uniqueArtists: number;
  totalDurationMin: number;
  avgPopularity: number;
  explicitRatio: number;
  avgDurationMin: number;
  topGenres: { genre: string; count: number }[];
  decades: { decade: string; count: number }[];
  topArtists: { name: string; count: number }[];
  popularitySpread: { low: number; mid: number; high: number };
}

export async function generatePlaylistAnalysis(
  data: PlaylistData,
  personaId: DJPersonaId,
  model: AIModel = DEFAULT_MODEL
): Promise<{ text: string; usage: { inputTokens: number; outputTokens: number } }> {
  const persona = DJ_PERSONAS[personaId];
  const systemPrompt = PERSONA_ANALYSIS_PROMPTS[personaId];

  const userMessage = `Przeanalizuj tę playlistę jako ${persona.name}. Napisz spersonalizowany komentarz psychologiczny (3-5 akapitów, po polsku).

DANE PLAYLISTY "${data.playlistName}":
- Utworów: ${data.trackCount}
- Unikalnych artystów: ${data.uniqueArtists}
- Łączny czas: ${Math.round(data.totalDurationMin)} minut
- Średnia popularność: ${data.avgPopularity}/100
- Rozkład popularności: ${data.popularitySpread.high} popularnych, ${data.popularitySpread.mid} średnich, ${data.popularitySpread.low} niszowych
- Explicit content: ${Math.round(data.explicitRatio * 100)}%
- Średni czas utworu: ${data.avgDurationMin.toFixed(1)} min

TOP GATUNKI:
${data.topGenres.map((g) => `- ${g.genre}: ${g.count} utworów`).join('\n')}

TOP ARTYŚCI:
${data.topArtists.map((a) => `- ${a.name}: ${a.count} utworów`).join('\n')}

ERY MUZYCZNE:
${data.decades.map((d) => `- ${d.decade}: ${d.count} utworów`).join('\n')}

Bądź konkretny — odnoś się do prawdziwych danych, artystów i gatunków. Nie bądź ogólnikowy.`;

  try {
    const response = await sendAIMessage(
      [{ role: 'user', content: userMessage }],
      {
        model,
        systemPrompt,
        maxTokens: 1024,
      }
    );

    return {
      text: response.text,
      usage: response.usage,
    };
  } catch (error) {
    console.log('AI API error:', error);
    return {
      text: getFallbackAnalysis(data, personaId),
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }
}

// Re-export ChatMessage for backward compatibility
export type ChatMessage = AIMessage;

/**
 * Odczytuje bazę wiedzy DJ z pliku na urządzeniu.
 * automation assistant może zapisać tu dodatkowy kontekst, który DJ uwzględni w rozmowie.
 */
function loadDJKnowledge(): string {
  try {
    const dir = getLogDir();
    const knowledgeFile = new File(dir, 'dj-knowledge.md');
    if (knowledgeFile.exists) {
      return knowledgeFile.textSync();
    }
  } catch (e) {
    console.log('Knowledge load error:', e);
  }
  return '';
}

/**
 * Zapisuje bazę wiedzy DJ — wywoływane z poziomu apki lub przez dev tools.
 */
export function saveDJKnowledge(content: string) {
  try {
    const dir = getLogDir();
    const knowledgeFile = new File(dir, 'dj-knowledge.md');
    if (!knowledgeFile.exists) knowledgeFile.create();
    knowledgeFile.write(content);
    console.log('[DJ-KNOWLEDGE] Updated knowledge base');
  } catch (e) {
    console.log('Knowledge save error:', e);
  }
}

export async function sendDJChatMessage(
  personaId: DJPersonaId,
  messages: ChatMessage[],
  spotifyContext?: string,
  model: AIModel = DEFAULT_MODEL
): Promise<{ text: string; usage: { inputTokens: number; outputTokens: number } }> {
  // Loguj wiadomość usera
  const lastUserMsg = messages.filter((m) => m.role === 'user').pop();
  if (lastUserMsg) {
    logChatMessage(personaId, 'user', lastUserMsg.content);
  }

  // Buduj system prompt z kontekstem
  const knowledge = loadDJKnowledge();
  let systemPrompt = PERSONA_CHAT_PROMPTS[personaId];
  if (spotifyContext) {
    systemPrompt += `\n\n${spotifyContext}`;
  }
  if (knowledge) {
    systemPrompt += `\n\nDODATKOWA WIEDZA O UŻYTKOWNIKU:\n${knowledge}`;
  }

  try {
    const response = await sendAIMessage(messages, {
      model,
      systemPrompt,
      maxTokens: 1024,
    });

    const reply = response.text || getDJFallbackResponse(personaId);
    logChatMessage(personaId, 'assistant', reply);

    return {
      text: reply,
      usage: response.usage,
    };
  } catch (error) {
    console.log('AI Chat API error:', error);
    const fallback = getDJFallbackResponse(personaId);
    logChatMessage(personaId, 'assistant', fallback);
    return {
      text: fallback,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }
}

function getDJFallbackResponse(personaId: DJPersonaId): string {
  const persona = DJ_PERSONAS[personaId];
  const responses: Record<DJPersonaId, string> = {
    neurobiological: 'Hmm, Twój mózg potrzebuje chwili. Opowiedz mi więcej o swoim nastroju — jakie emocje dominują?',
    freudian: 'To interesujące... ale co kryje się pod powierzchnią? Powiedz mi, co naprawdę czujesz.',
    jungian: 'Widzę, że jesteś na ważnym etapie swojej podróży. Jaki archetyp w Tobie dziś przemawia?',
    philosophical: 'Pytanie o muzykę jest pytaniem o sens. Czego szukasz w dźwięku — ucieczki czy spotkania z sobą?',
  };
  return `${persona.emoji} ${responses[personaId]}`;
}

function getFallbackAnalysis(data: PlaylistData, personaId: DJPersonaId): string {
  const persona = DJ_PERSONAS[personaId];
  const topGenre = data.topGenres[0]?.genre || 'eklektyczny mix';
  const topArtist = data.topArtists[0]?.name || 'różni artyści';
  const topDecade = data.decades[0]?.decade || '2020s';

  const introMap: Record<DJPersonaId, string> = {
    neurobiological: `Z neurobiologicznej perspektywy, Twoja playlista "${data.playlistName}" to fascynująca mapa dopaminowych ścieżek.`,
    freudian: `Analizując "${data.playlistName}" przez pryzmat psychoanalizy, widzę wyraźne ślady Twojej nieświadomości.`,
    jungian: `W "${data.playlistName}" rozpoznaję archetypy Twojej muzycznej podróży bohatera.`,
    philosophical: `"${data.playlistName}" stawia fundamentalne pytanie o Twój stosunek do dźwięku jako bytu.`,
  };

  const popText = data.avgPopularity >= 60
    ? `Średnia popularność ${data.avgPopularity}/100 wskazuje na silną potrzebę muzycznego rezonansu społecznego.`
    : data.avgPopularity >= 35
    ? `Popularność ${data.avgPopularity}/100 sugeruje balans między muzyczną indywidualnością a wspólnotą.`
    : `Niska popularność ${data.avgPopularity}/100 — szukasz dźwięków poza utartymi ścieżkami.`;

  const genreText = `Dominujący gatunek ${topGenre} (${data.topGenres[0]?.count || 0} utworów) z ${topArtist} na czele ujawnia Twój emocjonalny rdzeń muzyczny.`;

  const eraText = `Muzyczna kotwica w dekadzie ${topDecade} mówi wiele o Twoich formacyjnych doświadczeniach dźwiękowych.`;

  const diversityRatio = data.uniqueArtists / data.trackCount;
  const divText = diversityRatio > 0.7
    ? `${data.uniqueArtists} unikalnych artystów na ${data.trackCount} utworów — Twój mózg łaknie nowych bodźców.`
    : `Wracasz do wybranych ${data.uniqueArtists} artystów — budujesz głębokie emocjonalne więzi z dźwiękiem.`;

  return `${persona.emoji} ${persona.name}\n\n${introMap[personaId]}\n\n${popText} ${genreText}\n\n${eraText} ${divText}\n\n— ${persona.name}, WilsonOS DJ`;
}
