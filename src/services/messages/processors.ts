import { MessageSessionType } from '#models/sessions/sessions.model.js';
import { generateAudio } from '#utils/audio.js';
import WhatsAppService from '#utils/messages.js';
import { MessageConfig, MessageType } from '#utils/responses.ts';
import { MessageResponse } from '#utils/types.js';
import { getLogger, rootLogger } from '#config/logger.js';
import { config } from '#config/index.js';
import path from 'path';

export type Intent = {
  intent: string;
  service: 'onboard' | 'message';
};

type processContext = { query: string; session: MessageSessionType };

const messageConfig = new MessageConfig();
const configLoaded = await messageConfig.loadMessages();

const logger = getLogger(rootLogger, {
  service: 'whatsapp-bot-service',
  component: 'proccess-message',
});

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
  const context = { session: session };

  if (/^\d+$/.test(query)) {
    const index = Number(query);

    logger.info(
      `Matching intent for query: ${query}, choice: ${index}`,
      context
    );

    const sysPrompt = MessageConfig.checkSysPrompt(query);
    if (sysPrompt) {
      logger.info(`Matched intent: ${sysPrompt}`);
    }

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

      logger.info(
        `Matched Intent: ${isSysPrompt ? isSysPrompt : option}`,
        context
      );

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

  let context: processContext = {
    query: query,
    session: session,
  };

  // ensures the messageConfig has been loaded
  if (!configLoaded) {
    logger.error(
      `Failed to load messages file from location : ${config.storage.messages_location}`,
      { filename: config.storage.messages_location }
    ); // change to fatal
    return;
  }

  let message = messageConfig.getMessageByQueryOrId(query);

  if (!message) {
    logger.warn(`No message found for query or id: ${query}`);
    message = messageConfig.getMessageByQueryOrId('support:invalid_input');
  }

  if (message) {
    logger.info(`Processing message: ${message.query}`);

    const languagePreference = session.language;
    const mediaId =
      languagePreference in message.audio
        ? message.audio[languagePreference].whatsapp_media_id
        : null;

    if (mediaId) {
      // pass the id th the whatsapp messaging service to send
      logger.info(`Whatsapp media id exists: ${mediaId}`, {
        keyword: message.keyword,
        ...context,
      });

      await sendWhatsAppVoiceMsg(mediaId); // get the response here and log its failure or success!
    } else if (message.audio[languagePreference].location) {
      // store file name and location
      const audioLocation = message.audio[languagePreference].location;
      const audioFileName = path.basename(audioLocation);

      // pass location to the whatsapp MS to upload and get the media Id
      logger.info(
        `No whatsapp media id found, uploading audio file ${audioFileName}`,
        {
          audio: audioLocation,
          ...context,
        }
      );

      const uploadedMediaId = await processAndSendWhatsAppAudioMessage(
        audioLocation,
        context
      );

      if (uploadedMediaId) {
        // save the mediaId to the message config for future use
        logger.info(`Obtained whatsapp media id: ${uploadedMediaId}`, {
          audio: audioLocation,
          ...context,
        });
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
        logger.error('Failed to generate audio for message', {
          response: text,
          ...context,
        });
        return session;
      }

      const uploadedMediaId = await processAndSendWhatsAppAudioMessage(
        audioFilePath,
        context
      );

      if (uploadedMediaId) {
        // update message audio location and media id field

        logger.info(`Obtained whatsapp media id: ${uploadedMediaId}`, {
          audio: audioFilePath,
          ...context,
        });

        message.audio[languagePreference] = {
          location: audioFilePath,
          whatsapp_media_id: uploadedMediaId.id,
        };

        await messageConfig.saveMessage(message);
      } else {
        logger.error(`Failed to obtain whatsapp media id`, {
          audio: audioFilePath,
          ...context,
        });
      }
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

async function processAndSendWhatsAppAudioMessage(
  audioFileLocation: string,
  context: processContext | {} = {}
) {
  let fileId = null;
  try {
    fileId = await WhatsAppService.uploadAudioFile(audioFileLocation);

    await sendWhatsAppVoiceMsg(fileId.id);
  } catch (error) {
    // log error
    logger.error(`Failed to send whatsapp audio message: ${error}`, {
      audio: audioFileLocation,
      mediaId: fileId,
      ...context,
    });
  }

  return fileId;
}
