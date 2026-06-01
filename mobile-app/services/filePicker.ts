import * as DocumentPicker from 'expo-document-picker';

export interface AudioTrack {
  uri: string;
  name: string;
  mimeType: string;
}

const AUDIO_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/flac',
  'audio/aac',
  'audio/mp4',
  'audio/*',
];

export async function pickAudioFile(): Promise<AudioTrack | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: AUDIO_TYPES,
    copyToCacheDirectory: true,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType ?? 'audio/mpeg',
  };
}
