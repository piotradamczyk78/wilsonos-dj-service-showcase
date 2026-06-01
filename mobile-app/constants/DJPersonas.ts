export type DJPersonaId = 'freudian' | 'jungian' | 'neurobiological' | 'philosophical';

export interface DJPersona {
  id: DJPersonaId;
  name: string;
  title: string;
  emoji: string;
  description: string;
  shortDescription: string;
  isPremium: boolean;
}

export const DJ_PERSONAS: Record<DJPersonaId, DJPersona> = {
  neurobiological: {
    id: 'neurobiological',
    name: 'DJ Neuro',
    title: 'Neurobiologiczny DJ',
    emoji: '\u{1F9EC}',
    description:
      'Mapuje reakcje dopaminowe, analizuje system nagrody i mechanizmy uzale\u017cnienia muzycznego. Widzi Twoje playlisty jako map\u0119 neurochemicznych \u015bcie\u017cek.',
    shortDescription: 'Dopamina, system nagrody, neuroplastyczno\u015b\u0107',
    isPremium: false,
  },
  freudian: {
    id: 'freudian',
    name: 'DJ Freud',
    title: 'Freudowski DJ',
    emoji: '\u{1F6CB}\uFE0F',
    description:
      'Analizuje sublimacj\u0119 stresu przez muzyk\u0119, mechanizmy obronne i libido ukryte w Twoich wyborach muzycznych.',
    shortDescription: 'Sublimacja, mechanizmy obronne, nie\u015bwiadomo\u015b\u0107',
    isPremium: true,
  },
  jungian: {
    id: 'jungian',
    name: 'DJ Jung',
    title: 'Jungowski DJ',
    emoji: '\u{1F31F}',
    description:
      'Identyfikuje archetypy w Twoich nawykach s\u0142uchania i prowadzi przez proces indywiduacji muzycznej.',
    shortDescription: 'Archetypy, cie\u0144, indywiduacja',
    isPremium: true,
  },
  philosophical: {
    id: 'philosophical',
    name: 'DJ Filozof',
    title: 'Filozoficzny DJ',
    emoji: '\u{1F4DC}',
    description:
      'Eksploruje egzystencjalne wymiary d\u017awi\u0119ku i pytania o sens, kt\u00f3re Twoja muzyka zadaje \u015bwiatu.',
    shortDescription: 'Egzystencjalizm, fenomenologia, estetyka',
    isPremium: true,
  },
};

export const FREE_PERSONA: DJPersonaId = 'neurobiological';
