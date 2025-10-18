import { MessageSessionType } from '#models/file/sessions.model.js';
import { generateAudio } from '#utils/audio.js';
import WhatsAppService from '#utils/messages.js';
import { MessageConfig, MessageType } from '#utils/responses.ts';
import { MessageResponse } from '#utils/types.js';
import { getLogger, rootLogger } from '#config/logger.js';
import { config } from '#config/index.js';
import path from 'path';
import storage from '#config/storage.js';
import { AnalyticsEvent } from '#analytics/types.js';
import { AnalyticsService } from '#services/analytics/analytics.service.js';

export type Intent = {
  intent: string;
  service: 'onboard' | 'message';
};

export type QueryParams = {
  wa_mid: string;
  query: string;
  session: MessageSessionType;
  to: string;
  events: AnalyticsEvent[];
};

type processContext = { query: string; session: string };

const messageConfig = new MessageConfig();
const configLoaded = await messageConfig.loadMessages();

const logger = getLogger(rootLogger, {
  service: 'whatsapp-bot-service',
  component: 'proccess-message',
});

const analyticsService = new AnalyticsService();

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

    const sysPrompt = messageConfig.checkSysPrompt(query);
    if (sysPrompt) {
      logger.info(`Matched intent: ${sysPrompt}`);
    }

    if (sysPrompt) {
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
      const isSysPrompt = messageConfig.checkSysPrompt(option);

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

export const processMessage = async (queryData: QueryParams) => {
  const { wa_mid, query, session, to, events } = queryData;

  let message = messageConfig.getMessageByQueryOrId(query);

  if (!message) {
    logger.warn(`No message found for query or id: ${query}`);
    message = messageConfig.getMessageByQueryOrId('system:invalid_input');
  }

  if (!message) {
    logger.error('An error occured during support');
    return session;
  }

  const response = await GetWhatsAppMediaIdForMsg(message, session);

  if (response) {
    if (response.mediaId) await sendWhatsAppVoiceMsg(response.mediaId, to);

    message = response.message;
    // events = response.events
  }

  return await finalize(wa_mid, message, session, events);
};

export const GetWhatsAppMediaIdForMsg = async (
  message: MessageType,
  session: MessageSessionType
) => {
  /**
   Uses the query to either  get the WhatsApp provided media id for the audio response
   or generate the audio response from the text, upload to whatsapp and get an id.
   params:
      query: string containing integer representing command
      session: user session object
   returns:
      mediaId: Whatsapp provided Id for audio file
      message: Message data for query
   */

  let mediaId = null;

  let context: processContext = {
    query: message.query,
    session: session.id,
  };

  // ensures the messageConfig has been loaded
  if (!configLoaded) {
    logger.error(
      `Failed to load messages file from location : ${config.storage.messages_location}`,
      { filename: config.storage.messages_location }
    ); // change to fatal
    return null;
  }

  context.query = message.query;
  logger.info(`Processing message: ${message.query}`);

  const languagePreference = session.language;
  mediaId =
    languagePreference in message.audio
      ? message.audio[languagePreference].whatsapp_media_id
      : null;

  if (mediaId) {
    // pass the id th the whatsapp messaging service to send
    logger.info(`Whatsapp media id exists: ${mediaId}`, {
      keyword: message.keyword,
      ...context,
    });
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

    mediaId = await uploadAudioFileToWhatsApp(
      storage.resolvePath(audioLocation),
      context
    );

    if (mediaId) {
      // save the mediaId to the message config for future use
      logger.info(`Obtained whatsapp media id: ${mediaId}`, {
        audio: audioLocation,
        ...context,
      });
      message.audio[languagePreference].whatsapp_media_id = mediaId;

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
    // '\audio_files\carevo-0-20250826103710.ogg';
    if (!audioFilePath) {
      logger.error('Failed to generate audio for message', {
        response: text,
        ...context,
      });
      return null;
    }

    mediaId = await uploadAudioFileToWhatsApp(
      storage.resolvePath(audioFilePath),
      context
    );

    if (mediaId) {
      // update message audio location and media id field

      logger.info(`Obtained whatsapp media id: ${mediaId}`, {
        audio: audioFilePath,
        ...context,
      });

      message.audio[languagePreference] = {
        location: audioFilePath,
        whatsapp_media_id: mediaId,
      };

      await messageConfig.saveMessage(message);
    } else {
      logger.error(`Failed to obtain whatsapp media id`, {
        audio: audioFilePath,
        ...context,
      });
    }
  }

  return { mediaId, message };
};

// helpers
async function sendWhatsAppVoiceMsg(mediaId: string, to: string) {
  const audioData: MessageResponse = {
    type: 'audio',
    audio: { id: mediaId || '' },
  };
  const response = WhatsAppService.getOutgoingMessageData(audioData, to);
  return await WhatsAppService.sendMessage(response);
}

async function uploadAudioFileToWhatsApp(
  audioFileLocation: string,
  context: processContext | {} = {}
) {
  let fileId = null;
  try {
    fileId = await WhatsAppService.uploadAudioFile(audioFileLocation);
  } catch (error) {
    // log error
    logger.error(`Failed to upload audio file to whatsapp: ${error}`, {
      audio: audioFileLocation,
      mediaId: fileId,
      ...context,
    });
  }

  return fileId?.id;
}

async function finalize(
  whastappMessageId: string,
  message: MessageType,
  session: MessageSessionType,
  analyticEvents: AnalyticsEvent[]
) {
  /**
   * final operations to carry out after processing response:
   * 1. Mark message as read
   * 2. Update session info
   * 3. Register analytics
   */

  // Mark as read
  WhatsAppService.markAsRead(whastappMessageId);

  //  update the session keyword entry
  session.lastMessage.query =
    message.query !== session.lastMessage.query &&
    message.query !== 'system:invalid_input'
      ? message.query
      : session.lastMessage.query;

  if (message.actions.options) {
    if (message.query === 'system:invalid_input') {
      const lastMessage = messageConfig.getMessageByQueryOrId(
        session.lastMessage.query
      );

      if (!lastMessage) {
        logger.error('No previous message for invalid input', session, message);
      } else {
        session.lastMessage.options = [
          lastMessage.id,
          ...message.actions.options,
        ];
      }
    } else {
      session.lastMessage.options = message.actions.options;
    }
  }

  // register analytics
  analyticsService.processEvents(analyticEvents); // not async!

  return session;
}
