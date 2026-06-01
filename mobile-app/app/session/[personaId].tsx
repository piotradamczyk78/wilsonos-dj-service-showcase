import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useState, useRef, useEffect, useCallback } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors } from '@/constants/Colors';
import { DJ_PERSONAS, type DJPersonaId } from '@/constants/DJPersonas';
import { sendDJChatMessage, type ChatMessage } from '@/services/llm';
import { useAuth } from '@/contexts/AuthContext';
import { getPlaylistSummaryForDJ, getRecentlyPlayed, searchTrack, createPlaylist, getUserProfile, playTracks, addToQueue } from '@/services/spotify';
import { saveSession, loadSession, type ChatSession } from '@/services/chatHistory';
import { pickAudioFile } from '@/services/filePicker';
import { loadAndPlay, togglePlayPause, stop, subscribe, type PlaybackState } from '@/services/audioPlayer';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function DJChatScreen() {
  const { personaId, sessionId: existingSessionId } = useLocalSearchParams<{ personaId: string; sessionId?: string }>();
  const insets = useSafeAreaInsets();
  const persona = DJ_PERSONAS[personaId as DJPersonaId];
  const { getValidToken } = useAuth();

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [spotifyContext, setSpotifyContext] = useState('');
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [sessionId] = useState(() => existingSessionId || `session-${Date.now()}`);
  const [playback, setPlayback] = useState<PlaybackState | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Subskrybuj stan audio playera
  useEffect(() => {
    const unsub = subscribe((state) => {
      setPlayback(state.isLoaded ? state : null);
    });
    return unsub;
  }, []);

  // Otwórz picker plików audio
  async function handlePickAudio() {
    try {
      const track = await pickAudioFile();
      if (!track) return;

      await loadAndPlay(track);

      // Dodaj wiadomość do czatu
      const userMsg: DisplayMessage = {
        id: `audio-${Date.now()}`,
        role: 'user',
        content: `Słucham teraz: ${track.name}`,
      };
      setMessages((prev) => [...prev, userMsg]);
    } catch (e) {
      console.log('[DJ-CHAT] Audio pick error:', e);
      Alert.alert('Błąd', 'Nie udało się otworzyć pliku audio.');
    }
  }

  // Ładuj kontekst Spotify przy starcie czatu
  useEffect(() => {
    async function loadSpotifyContext() {
      try {
        const token = await getValidToken();
        if (!token) return;

        const [playlistSummary, recentItems] = await Promise.all([
          getPlaylistSummaryForDJ(token),
          getRecentlyPlayed(token, 10).catch(() => []),
        ]);

        let context = '';
        if (playlistSummary) {
          context += playlistSummary;
        }
        if (recentItems.length > 0) {
          const recentTracks = recentItems
            .map((item) => `- ${item.track.artists[0]?.name} — "${item.track.name}"`)
            .join('\n');
          context += `\n\nOSTATNIO SŁUCHANE UTWORY:\n${recentTracks}`;
        }
        if (context) {
          setSpotifyContext(context);
          console.log('[DJ-CHAT] Spotify context loaded');
        }
      } catch (e) {
        console.log('[DJ-CHAT] Error loading Spotify context:', e);
      }
    }
    loadSpotifyContext();
  }, []);

  // Załaduj istniejącą sesję LUB pokaż powitanie
  useEffect(() => {
    if (existingSessionId) {
      const saved = loadSession(existingSessionId);
      if (saved) {
        setMessages(saved.messages);
        console.log(`[DJ-CHAT] Loaded session ${existingSessionId} (${saved.messages.length} msgs)`);
        return;
      }
    }

    // Nowa sesja — wiadomość powitalna
    const greetings: Record<DJPersonaId, string> = {
      neurobiological: `Cześć! Jestem ${persona.name}. 🧬 Opowiedz mi jak się dziś czujesz — a powiem Ci, co Twój mózg próbuje Ci przekazać przez muzykę. Jaki masz teraz nastrój?`,
      freudian: `Witaj na mojej kozetce muzycznej. Jestem ${persona.name}. 🛋️ To nie przypadek, że tu jesteś... Opowiedz mi o swoim nastroju — co kryje się pod powierzchnią Twoich emocji?`,
      jungian: `Witaj, wędrowcze. Jestem ${persona.name}. 🌟 Każda muzyczna podróż jest częścią większej historii. Powiedz mi — jaki archetyp w Tobie dziś przemawia? Jak się czujesz?`,
      philosophical: `Witaj. Jestem ${persona.name}. 📜 Jak mawiał Nietzsche: "Bez muzyki życie byłoby błędem." Powiedz mi — czego dziś szukasz w dźwięku? Jaki jest Twój nastrój?`,
    };

    const id = personaId as DJPersonaId;
    if (persona && greetings[id]) {
      setMessages([
        {
          id: 'greeting',
          role: 'assistant',
          content: greetings[id],
        },
      ]);
    }
  }, [personaId]);

  // Auto-save sesji po zmianie wiadomości
  useEffect(() => {
    if (messages.length <= 1) return; // Nie zapisuj samego powitania
    const firstUserMsg = messages.find((m) => m.role === 'user');
    const title = firstUserMsg
      ? firstUserMsg.content.substring(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '')
      : 'Nowa sesja';

    const session: ChatSession = {
      id: sessionId,
      personaId: personaId as DJPersonaId,
      title,
      messages,
      createdAt: sessionId.replace('session-', ''),
      updatedAt: new Date().toISOString(),
    };
    saveSession(session);
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: DisplayMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Buduj historię czatu dla API
    const chatHistory: ChatMessage[] = [...messages, userMsg]
      .filter((m) => m.id !== 'greeting' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const result = await sendDJChatMessage(personaId as DJPersonaId, chatHistory, spotifyContext);
      setMessages((prev) => [
        ...prev,
        {
          id: `dj-${Date.now()}`,
          role: 'assistant',
          content: result.text,
        },
      ]);
      // TODO: Use result.usage to deduct credits
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `${persona.emoji} Przepraszam, mam chwilowy problem z połączeniem. Spróbuj ponownie.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  // Wykryj sugestie muzyczne w tekście DJ-a (format: **"Artysta - Tytuł"** lub "Artysta — „Tytuł"")
  const extractTrackSuggestions = useCallback((text: string): string[] => {
    const patterns = [
      /\*\*"(.+?)"\*\*/g,                    // **"Artysta - Tytuł"**
      /\*\*(.+?)\s[–—-]\s[„""](.+?)[""]\*\*/g,  // **Artysta — „Tytuł"**
      /\*\*(.+?)\s[–—-]\s(.+?)\*\*/g,        // **Artysta - Tytuł**
    ];
    const results: string[] = [];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        // Jeśli grupa 2 istnieje, to artysta + tytuł osobno
        const suggestion = match[2] ? `${match[1]} ${match[2]}` : match[1];
        if (suggestion && !results.includes(suggestion)) {
          results.push(suggestion);
        }
      }
    }
    return results;
  }, []);

  // Wykryj komendę [PLAYLIST:nazwa] w tekście DJ-a
  const extractPlaylistCommand = useCallback((text: string): string | null => {
    const match = text.match(/\[PLAYLIST:(.+?)\]/);
    return match ? match[1] : null;
  }, []);

  // Stwórz playlistę na Spotify z sugestiami DJ-a
  async function handleCreatePlaylist(playlistName: string, trackQueries: string[]) {
    if (creatingPlaylist) return;
    setCreatingPlaylist(true);
    try {
      const token = await getValidToken();
      if (!token) {
        Alert.alert('Spotify', 'Zaloguj się do Spotify.');
        return;
      }

      // Wyszukaj wszystkie utwory i zbierz URI
      const trackUris: string[] = [];
      for (const query of trackQueries) {
        const result = await searchTrack(token, query);
        if (result) trackUris.push(result.uri);
      }

      if (trackUris.length === 0) {
        Alert.alert('Spotify', 'Nie znaleziono żadnych utworów.');
        return;
      }

      const profile = await getUserProfile(token);
      const result = await createPlaylist(
        token,
        profile.id,
        playlistName,
        `Stworzone przez ${persona.name} — WilsonOS DJ`,
        trackUris
      );

      if (result) {
        Alert.alert(
          'Playlista utworzona!',
          `"${playlistName}" (${trackUris.length} utworów) dodana do Spotify.`,
          [
            { text: 'Otwórz', onPress: () => result.externalUrl && Linking.openURL(result.externalUrl) },
            { text: 'OK' },
          ]
        );
        console.log(`[DJ-CHAT] Created playlist "${playlistName}" with ${trackUris.length} tracks`);
      } else {
        Alert.alert('Błąd', 'Nie udało się utworzyć playlisty.');
      }
    } catch (e) {
      console.log('[DJ-CHAT] Create playlist error:', e);
      Alert.alert('Błąd', 'Nie udało się utworzyć playlisty.');
    } finally {
      setCreatingPlaylist(false);
    }
  }

  // Odtwórz utwór — najpierw przez Spotify Connect API, potem fallback na deep link
  async function playInSpotify(query: string) {
    try {
      const token = await getValidToken();
      if (!token) {
        Alert.alert('Spotify', 'Zaloguj się do Spotify żeby odtwarzać muzykę.');
        return;
      }
      const result = await searchTrack(token, query);
      if (!result) {
        Alert.alert('Spotify', `Nie znaleziono utworu: ${query}`);
        return;
      }

      // Próbuj odpalić przez Connect API (bezpośrednio w Spotify bez przełączania apki)
      const played = await playTracks(token, [result.uri]);
      if (played) {
        console.log(`[DJ-CHAT] Playing via Connect API: ${query}`);
        return;
      }

      // Fallback: otwórz w apce Spotify
      const canOpen = await Linking.canOpenURL(result.uri);
      if (canOpen) {
        await Linking.openURL(result.uri);
      } else if (result.externalUrl) {
        await Linking.openURL(result.externalUrl);
      }
    } catch (e) {
      console.log('[DJ-CHAT] Play error:', e);
      Alert.alert('Błąd', 'Nie udało się otworzyć Spotify.');
    }
  }

  // Odtwórz cały set DJ-a (wszystkie sugestie naraz)
  async function playDJSet(trackQueries: string[]) {
    try {
      const token = await getValidToken();
      if (!token) return;

      const uris: string[] = [];
      for (const query of trackQueries) {
        const result = await searchTrack(token, query);
        if (result) uris.push(result.uri);
      }

      if (uris.length === 0) {
        Alert.alert('Spotify', 'Nie znaleziono żadnych utworów.');
        return;
      }

      const played = await playTracks(token, uris);
      if (played) {
        console.log(`[DJ-CHAT] Playing DJ set: ${uris.length} tracks`);
      } else {
        // Fallback — otwórz pierwszy utwór
        await Linking.openURL(uris[0]);
      }
    } catch (e) {
      console.log('[DJ-CHAT] DJ Set play error:', e);
    }
  }

  // Odtwórz na YouTube (otwiera wyszukiwanie YT)
  function playOnYouTube(query: string) {
    const encoded = encodeURIComponent(query);
    // Próbuj YouTube Music deep link, fallback na przeglądarkę
    Linking.openURL(`https://music.youtube.com/search?q=${encoded}`).catch(() => {
      Linking.openURL(`https://www.youtube.com/results?search_query=${encoded}`);
    });
  }

  // Auto-scroll po nowej wiadomości
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  if (!persona) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Nieznana persona DJ</Text>
      </View>
    );
  }

  const personaColor = Colors[personaId as keyof typeof Colors] || Colors.primary;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}>
      {/* Header z info o DJ */}
      <View style={[styles.djHeader, { borderBottomColor: personaColor as string }]}>
        <Text style={styles.djEmoji}>{persona.emoji}</Text>
        <View style={styles.djInfo}>
          <Text style={styles.djName}>{persona.name}</Text>
          <Text style={styles.djShort}>{persona.shortDescription}</Text>
        </View>
      </View>

      {/* Wiadomości */}
      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageContent}
        keyboardShouldPersistTaps="handled">
        {messages.map((msg) => {
          const trackSuggestions = msg.role === 'assistant' ? extractTrackSuggestions(msg.content) : [];
          const playlistCmd = msg.role === 'assistant' ? extractPlaylistCommand(msg.content) : null;
          return (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                msg.role === 'user' ? styles.userBubble : styles.djBubble,
              ]}>
              {msg.role === 'assistant' && (
                <Text style={styles.bubbleLabel}>{persona.name}</Text>
              )}
              <Text
                style={[
                  styles.messageText,
                  msg.role === 'user' ? styles.userText : styles.djText,
                ]}>
                {msg.content}
              </Text>
              {trackSuggestions.length > 0 && (
                <View style={styles.trackButtons}>
                  {trackSuggestions.length >= 2 && (
                    <TouchableOpacity
                      style={styles.playAllButton}
                      onPress={() => playDJSet(trackSuggestions)}>
                      <FontAwesome name="play-circle" size={16} color="#fff" />
                      <Text style={styles.playAllText}>Odtwórz cały set ({trackSuggestions.length})</Text>
                    </TouchableOpacity>
                  )}
                  {trackSuggestions.map((track, i) => (
                    <View key={i} style={styles.trackRow}>
                      <Text style={styles.trackName} numberOfLines={1}>{track}</Text>
                      <View style={styles.trackActions}>
                        <TouchableOpacity
                          style={styles.playButtonSmall}
                          onPress={() => playInSpotify(track)}>
                          <FontAwesome name="spotify" size={16} color={Colors.spotifyGreen} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.playButtonSmall}
                          onPress={() => playOnYouTube(track)}>
                          <FontAwesome name="youtube-play" size={16} color="#FF0000" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  {playlistCmd && trackSuggestions.length >= 2 && (
                    <TouchableOpacity
                      style={[styles.createPlaylistButton, creatingPlaylist && { opacity: 0.5 }]}
                      onPress={() => handleCreatePlaylist(playlistCmd, trackSuggestions)}
                      disabled={creatingPlaylist}>
                      <FontAwesome name={creatingPlaylist ? "spinner" : "plus-circle"} size={16} color={Colors.primary} />
                      <Text style={styles.createPlaylistText}>
                        {creatingPlaylist ? 'Tworzenie...' : `Stwórz playlistę "${playlistCmd}"`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })}
        {isLoading && (
          <View style={[styles.messageBubble, styles.djBubble]}>
            <Text style={styles.bubbleLabel}>{persona.name}</Text>
            <View style={styles.typingIndicator}>
              <ActivityIndicator size="small" color={personaColor as string} />
              <Text style={styles.typingText}>pisze...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Mini Player */}
      {playback && (
        <View style={styles.miniPlayer}>
          <TouchableOpacity style={styles.miniPlayBtn} onPress={togglePlayPause}>
            <FontAwesome
              name={playback.isPlaying ? 'pause' : 'play'}
              size={16}
              color="#fff"
            />
          </TouchableOpacity>
          <View style={styles.miniTrackInfo}>
            <Text style={styles.miniTrackName} numberOfLines={1}>
              {playback.track?.name ?? 'Nieznany utwór'}
            </Text>
            <View style={styles.miniProgressBar}>
              <View
                style={[
                  styles.miniProgressFill,
                  {
                    width: playback.durationMs > 0
                      ? `${(playback.positionMs / playback.durationMs) * 100}%`
                      : '0%',
                    backgroundColor: personaColor as string,
                  },
                ]}
              />
            </View>
          </View>
          <TouchableOpacity style={styles.miniCloseBtn} onPress={stop}>
            <FontAwesome name="close" size={14} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input */}
      <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <TouchableOpacity style={styles.pickAudioButton} onPress={handlePickAudio}>
          <FontAwesome name="music" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Opowiedz o swoim nastroju..."
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={500}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: input.trim() ? (personaColor as string) : Colors.surfaceLight },
          ]}
          onPress={handleSend}
          disabled={!input.trim() || isLoading}>
          <FontAwesome
            name="send"
            size={16}
            color={input.trim() ? '#fff' : Colors.textMuted}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  errorText: {
    color: Colors.error,
    textAlign: 'center',
    marginTop: 40,
  },
  djHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 2,
    gap: 12,
  },
  djEmoji: {
    fontSize: 32,
  },
  djInfo: {
    flex: 1,
  },
  djName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  djShort: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  messageList: {
    flex: 1,
  },
  messageContent: {
    padding: 16,
    paddingBottom: 8,
    gap: 12,
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 16,
    padding: 12,
    paddingHorizontal: 14,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.accent,
    borderBottomRightRadius: 4,
  },
  djBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
  },
  bubbleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: Colors.text,
  },
  djText: {
    color: Colors.text,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackButtons: {
    marginTop: 10,
    gap: 6,
  },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.spotifyGreen,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
  },
  playAllText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 8,
  },
  trackName: {
    flex: 1,
    color: Colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  trackActions: {
    flexDirection: 'row',
    gap: 4,
  },
  playButtonSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createPlaylistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
    marginTop: 4,
  },
  createPlaylistText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  pickAudioButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
  },
  miniPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniTrackInfo: {
    flex: 1,
    gap: 4,
  },
  miniTrackName: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  miniProgressBar: {
    height: 3,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  miniCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
