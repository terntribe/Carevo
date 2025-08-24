import {
  SessionManager,
  MessageSessionType,
} from '#models/sessions/sessions.model.js';
import { generateAudio } from '#utils/audio.js';
import WhatsAppService from '#utils/messages.js';
import { MessageConfig, MessageType } from '#utils/responses.ts';
import { MessageResponse } from '#utils/types.js';

const messageConfig = new MessageConfig();

export const matchIntent = (
  keyword: string,
  session: MessageSessionType
): 'onboard' | string => {
  const lastQueryKeyword = session?.lastQueryKeyword;

  if (messageConfig.supportedLanguage(keyword)) {
    return 'obs';
  } else if (lastQueryKeyword && keyword === 'more information') {
    return `${lastQueryKeyword}:more_info`;
  }
  return keyword;
};

export const processMessage = async (
  keyword: string,
  session: MessageSessionType
) => {
  // processes the message based on the keyword

  keyword = keyword.includes('more_info') ? keyword.split(':')[0] : keyword;
  let message = messageConfig.getMessageByKeyword(keyword);

  if (keyword.includes('more_info')) {
    message = messageConfig.getMessageById(message?.options.moreInfo as string);
  }

  if (!message) {
    console.error(`No message found for keyword: ${keyword}`);
    message = messageConfig.getMessageByKeyword('support:invalid_input');
  }

  if (message) {
    console.log('Processing message:', message.query);

    const languagePreference = session.language;
    const mediaId =
      languagePreference in message.audio
        ? message.audio[languagePreference].whatsapp_media_id
        : null;

    if (mediaId) {
      // pass the id th the whatsapp messaging service to send
      console.log('Audio file found for ', message.query);

      await sendWhatsAppVoiceMsg(mediaId);
    } else if (message.audio[languagePreference].location) {
      // pass location to the whatsapp MS to upload and get the media Id
      console.log('No mediaId found, uploading audio file for', message.query);

      const uploadedMediaId = await processAndSendWhatsAppAudioMessage(
        message,
        languagePreference
      );

      if (uploadedMediaId) {
        // save the mediaId to the message config for future use
        message.audio[languagePreference].whatsapp_media_id =
          uploadedMediaId.id;
        await messageConfig.saveMessage(message);
      }
    } else {
      // concat the response + ', ' + options.prompt and send to tts to convert
      const text = message.response + ', ' + message.options.prompt;
      const audioFilePath = await generateAudio(
        text,
        languagePreference,
        message.id
      );
      if (!audioFilePath) {
        console.error('Failed to generate audio for message:', message.query);
        return session;
      }

      const uploadedMediaId = await processAndSendWhatsAppAudioMessage(
        message,
        languagePreference
      );

      // update message audio location and media id field
      message.audio[languagePreference] = {
        location: audioFilePath,
        whatsapp_media_id: uploadedMediaId?.id || '',
      };
      await messageConfig.saveMessage(message);

      // update the session keyword entry
      session.lastQueryKeyword =
        keyword !== session.lastQueryKeyword
          ? keyword
          : session.lastQueryKeyword;
    }
  }
  return session;
};

// helpers
async function sendWhatsAppVoiceMsg(mediaId: string) {
  const audioData: MessageResponse = {
    type: 'audio',
    audio: { id: mediaId || '' },
  };
  const response = WhatsAppService.getOutgoingMessageData(audioData);
  await WhatsAppService.sendMessage(response);
}

async function processAndSendWhatsAppAudioMessage(
  message: MessageType,
  language: string
) {
  let fileId = null;
  try {
    fileId = await WhatsAppService.uploadAudioFile(
      message.audio[language].location
    );

    await sendWhatsAppVoiceMsg(fileId.id);
  } catch (error) {
    console.log('Error occured:', error);
  }

  return fileId;
}
