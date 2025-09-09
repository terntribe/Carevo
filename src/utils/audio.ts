import storage from '#config/storage.js';
import tts from '#config/tts.js';
import { config } from '#config/index.js';
import { rootLogger, getLogger } from '#config/logger.js';

const logger = getLogger(rootLogger, {
  service: 'whatsapp-bot-service',
  component: 'generate-audio',
});

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
  const opusFileName = getAudioFileName(messageId, 'ogg');

  const wavFilePath = `${config.storage.audio_files}/${wavFileName}`;
  const opusFilePath = `${config.storage.audio_files}/${opusFileName}`;

  try {
    await storage.saveWavFile(storage.resolvePath(wavFilePath), data); // try catch here too...
  } catch (error) {
    console.error('Failed to convert/store WAV file for audio');
    return '';
  }

  try {
    await storage.saveOpusFile(
      storage.resolvePath(wavFilePath),
      storage.resolvePath(opusFilePath)
    ); // catch error here and log
  } catch (error) {
    console.error('Failed to convert audio to Opus format');
    return '';
  }

  return opusFilePath;
}

export async function generateAudio(
  text: string,
  language: string,
  messageId: string
): Promise<string> {
  try {
    const audioData = await tts.generateAudio(text, language, messageId); // try - catch this and log the error
    const audioFilePath = await saveAudio(
      Buffer.from(audioData, 'base64'),
      messageId
    );
    return audioFilePath;
  } catch (error) {
    console.error('Failed to generate audio');
    return ''; // Return empty string if audio generation fails
  }
}
