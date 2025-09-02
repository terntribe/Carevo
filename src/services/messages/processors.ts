import { MessageSessionType } from '#models/sessions/sessions.model.js';
import { generateAudio } from '#utils/audio.js';
import WhatsAppService from '#utils/messages.js';
import { MessageConfig, MessageType } from '#utils/responses.ts';
import { MessageResponse } from '#utils/types.js';

export interface Intent {
  intent: string;
  service: 'onboard' | 'message';
}

const messageConfig = new MessageConfig();
const configLoaded = await messageConfig.loadMessages();

export const checkSupportedLanguages = (index: string) => {
  const i = Number(index);
  if (!configLoaded || !i) {
    return null;
  }
  return messageConfig.getLangauge(i);
};

export const matchIntent = (
  query: string,
  session: MessageSessionType
): Intent => {
  if (/^\d+$/.test(query)) {
    const index = Number(query);

    const sysPrompt = MessageConfig.checkSysPrompt(query);
    console.log('Matched intent:', { sysPrompt, index });

    if (
      sysPrompt &&
      sysPrompt === 'more_information' &&
      session.lastMessage.query
    ) {
      return {
        intent: `${session.lastMessage.query}:more_info`,
        service: 'message',
      };
    } else if (sysPrompt) {
      return {
        intent: sysPrompt,
        service: sysPrompt.startsWith('onboard') ? 'onboard' : 'message',
      };
    } else if (
      session.lastMessage.options.length > 0 &&
      index >= 0 &&
      index <= session.lastMessage.options.length
    ) {
      // checks if a reserved system prompt is used as an option
      const option = session.lastMessage.options[index - 1];
      const isSysPrompt = MessageConfig.checkSysPrompt(option);

      return {
        intent: isSysPrompt ? isSysPrompt : option,
        service:
          isSysPrompt && isSysPrompt.startsWith('onboard')
            ? 'onboard'
            : 'message',
      };
    }
  }
  return { intent: 'support:invalid_input', service: 'message' };
};

export const processMessage = async (
  query: string,
  session: MessageSessionType
) => {
  // processes the message based on the keyword query

  // ensures the messageConfig has been loaded
  if (!configLoaded) {
    console.error('messages have not been loaded'); // fatal but do not crash
    return;
  }

  let message = messageConfig.getMessageByQueryOrId(query);

  if (!message) {
    console.warn(`No message found for query or id: ${query}`);
    message = messageConfig.getMessageByQueryOrId('support:invalid_input');
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

      await sendWhatsAppVoiceMsg(mediaId); // get the response here and log its failure or success!
    } else if (message.audio[languagePreference].location) {
      // pass location to the whatsapp MS to upload and get the media Id
      console.log('No mediaId found, uploading audio file for', message.query);

      const uploadedMediaId = await processAndSendWhatsAppAudioMessage(
        message.audio[languagePreference].location
      );

      if (uploadedMediaId) {
        // save the mediaId to the message config for future use
        message.audio[languagePreference].whatsapp_media_id =
          uploadedMediaId.id;

        await messageConfig.saveMessage(message);
      }
    } else {
      // concat the response + ', ' + options.prompt and send to tts to convert
      const text = message.actions.prompt
        ? message.response + ', ' + message.actions.prompt
        : message.response;

      const audioFilePath = await generateAudio(
        text,
        languagePreference,
        message.id
      );
      // const audioFilePath =
      // 'C:\\Users\\ihima\\projects\\Carevo\\audio_files\\carevo-0-20250826103710.ogg';
      if (!audioFilePath) {
        console.error('Failed to generate audio for message:', message.query);
        return session;
      }

      const uploadedMediaId =
        await processAndSendWhatsAppAudioMessage(audioFilePath);

      // update message audio location and media id field
      message.audio[languagePreference] = {
        location: audioFilePath,
        whatsapp_media_id: uploadedMediaId?.id || '',
      };
      await messageConfig.saveMessage(message);
    }
    // update the session keyword entry
    session.lastMessage.query =
      message.query !== session.lastMessage.query
        ? message.query
        : session.lastMessage.query;

    // update options
    session.lastMessage.options = message.actions.options
      ? message.actions.options
      : session.lastMessage.options;
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
  return await WhatsAppService.sendMessage(response);
}

async function processAndSendWhatsAppAudioMessage(audioFileLocation: string) {
  let fileId = null;
  try {
    fileId = await WhatsAppService.uploadAudioFile(audioFileLocation);

    await sendWhatsAppVoiceMsg(fileId.id);
  } catch (error) {
    console.log('Error occured');
  }

  return fileId;
}
