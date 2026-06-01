import { File, Directory, Paths } from 'expo-file-system';
import type { DJPersonaId } from '@/constants/DJPersonas';

export interface ChatSession {
  id: string;
  personaId: DJPersonaId;
  title: string;
  messages: { id: string; role: 'user' | 'assistant'; content: string }[];
  createdAt: string;
  updatedAt: string;
}

const SESSIONS_DIR_NAME = 'chat-sessions';

function getSessionsDir(): Directory {
  const dir = new Directory(Paths.document, SESSIONS_DIR_NAME);
  if (!dir.exists) {
    dir.create();
  }
  return dir;
}

/**
 * Zapisz sesję czatu (po każdej nowej wiadomości).
 */
export function saveSession(session: ChatSession): void {
  try {
    const dir = getSessionsDir();
    const file = new File(dir, `${session.id}.json`);
    if (!file.exists) file.create();
    file.write(JSON.stringify(session));
  } catch (e) {
    console.log('[CHAT-HISTORY] Save error:', e);
  }
}

/**
 * Załaduj konkretną sesję.
 */
export function loadSession(sessionId: string): ChatSession | null {
  try {
    const dir = getSessionsDir();
    const file = new File(dir, `${sessionId}.json`);
    if (!file.exists) return null;
    return JSON.parse(file.textSync()) as ChatSession;
  } catch (e) {
    console.log('[CHAT-HISTORY] Load error:', e);
    return null;
  }
}

/**
 * Lista wszystkich sesji (metadane, bez pełnych wiadomości).
 */
export function listSessions(filterPersonaId?: DJPersonaId): { id: string; personaId: DJPersonaId; title: string; updatedAt: string; messageCount: number }[] {
  try {
    const dir = getSessionsDir();
    const files = dir.list().filter((f): f is File => f instanceof File && f.name?.endsWith('.json'));

    const sessions = files
      .map((f) => {
        try {
          const data = JSON.parse(f.textSync()) as ChatSession;
          return {
            id: data.id,
            personaId: data.personaId,
            title: data.title,
            updatedAt: data.updatedAt,
            messageCount: data.messages.length,
          };
        } catch {
          return null;
        }
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    // Filtruj po personie jeśli podano
    const filtered = filterPersonaId
      ? sessions.filter((s) => s.personaId === filterPersonaId)
      : sessions;

    // Sortuj od najnowszych
    return filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch (e) {
    console.log('[CHAT-HISTORY] List error:', e);
    return [];
  }
}

/**
 * Usuń sesję.
 */
export function deleteSession(sessionId: string): void {
  try {
    const dir = getSessionsDir();
    const file = new File(dir, `${sessionId}.json`);
    if (file.exists) file.delete();
  } catch (e) {
    console.log('[CHAT-HISTORY] Delete error:', e);
  }
}
