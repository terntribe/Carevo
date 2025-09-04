import { RequestsManager } from '#utils/requests.js';
import { config } from './index.js';
import { rootLogger as logger } from './logger.js';

const requests = new RequestsManager();

export default class GeminiTTSConfig {
  static async generateAudio(text: string, langauge: string, message: string) {
    if (!config.api_keys.gemini) {
      throw new Error('Gemini API key is not set in the configuration.');
    }

    const data = {
      url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': config.api_keys.gemini,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Say this in ${langauge} '${text}'`,
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Kore',
              },
            },
          },
        },
        model: 'gemini-2.5-flash-preview-tts',
      }),
    };

    const response = await requests.post(data);
    if (response && response.status === 200) {
      logger.info(`Audio generated successfully for message ${message}`);

      const responseData: any = await response.data;

      return responseData.candidates?.[0]?.content?.parts?.[0]?.inlineData
        ?.data;
    } else {
      throw new Error(
        `Failed to generate audio: ${response?.status} - ${response?.statusText}`
      );
    }
  }
}
