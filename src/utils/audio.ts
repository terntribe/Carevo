import storage from '#config/storage.js';
import tts from '#config/tts.js';
import { config } from '#config/index.js';
import path from 'path';

function getAudioFileName(messageId: string, ext: string): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[-T:]/g, '');
  return `carevo-${messageId}-${timestamp}.${ext}`;
}

export async function saveAudio(
  data: Buffer,
  messageId: string
): Promise<string> {
  // Save audio in WAV format and convert to Opus
  const wavFileName = getAudioFileName(messageId, 'wav');
  const opusFileName = getAudioFileName(messageId, 'opus');
  const wavFilePath = path.resolve(
    process.cwd() + `${config.storage.audio_files}/${wavFileName}`
  );
  const opusFilePath = path.resolve(
    process.cwd() + `${config.storage.audio_files}/${opusFileName}`
  );

  await storage.saveWavFile(wavFilePath, data);
  const opusFile = await storage.saveOpusFile(wavFilePath, opusFilePath);

  if (!opusFile) {
    throw new Error('Failed to convert audio to Opus format');
  }

  return opusFilePath;
}

export async function generateAudio(
  text: string,
  language: string,
  messageId: string
): Promise<string> {
  const audioData = await tts.generateAudio(text, language);
  if (!audioData) {
    throw new Error('Failed to generate audio');
  }

  const audioFilePath = await saveAudio(audioData, messageId);
  return audioFilePath;
}
