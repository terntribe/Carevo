/*

NOTE: Response from this controller should be strictly 200 OK (for now), except for 
validation issues i.e. if `messageData` is empty due to errors from parsing and 
those handled by the validator middleware.
Any error that occurs when we process the message should be logged.

WhatsApp Business API retries messages that return any status code other than 200,
We do not want unexpected behaivors or to pollute our logs and standard output with errors.
The `throttle` function tries to prevent multiple identical queries from the same sender to pass
for a limited time range but the API is unstable  i.e. failed messages from yesterday are also retried.

*/

import {
  generatePhoneNumHash,
  parseIncomingWhatAppMessageData,
  throttle,
} from '#utils/helpers.js';
import { Request, Response } from 'express';
// import {
//   MessageSessionType,
//   SessionManager,
// } from '#models/file/sessions.model.js';
import { matchIntent, Intent } from '#services/messages/processors.js';
import { OnboardingService } from '#services/messages/onboard.service.js';
import { MessageService } from '#services/messages/message.service.js';
import {
  rootLogger,
  getLogger,
  analyticsLogger as analytics,
} from '#config/logger.js';
import { Session } from '#models/db/sessions.model.js';
import { AnalyticsService } from '#services/analytics/analytics.service.js';
import { AnalyticsEvent } from '#analytics/types.js';
import WAUSerRepository from '#models/whatsapp-user-manager.js';
import { WhatsAppUser } from '#models/db/whatsapp-user.models.js';
import WhatsAppUserService from '#services/messages/whatsapp-user.service.js';

// const sessionService = new SessionService<Session>(new SessionRepository());
const whatsAppUserService = new WhatsAppUserService<WhatsAppUser>(
  new WAUSerRepository()
);

const logger = getLogger(rootLogger, {
  service: 'whastapp-bot-service',
});

type Context = {
  message: string;
  sessionId?: string;
  intent?: string;
  service?: string;
};

export const chatController = async (req: Request, res: Response) => {
  const messageData = parseIncomingWhatAppMessageData(req.body);
  let intent: Intent | null = null;
  let from: string | null;
  let events: AnalyticsEvent[] = [];

  if (!messageData || !messageData.text || !messageData.from) {
    logger.error('Missing fields: phone number or message text is missing');

    if (messageData?.type != 'text') {
      logger.error('Invalid message');
      // maybe implement blocking strategy here...
    }
    return res.status(400).send(400);
  } else {
    from = await generatePhoneNumHash(messageData.from);
  }

  if (!from) {
    logger.error('Failed to hash phone number');
    return res.status(500).send(500);
  }

  if (throttle({ phone: messageData.from, text: messageData.text })) {
    logger.warn(
      `Message still being processed: Sender: ${from.substring(0, 10)} -> text: ${messageData.text}`
    );
    return res.send(200);
  }

  // try and get the session first (if num does not exist),
  //if not create a new sesh and call obs with 'greet' keyword...
  let userSession = await whatsAppUserService.retrieve(from);

  let context: Context = {
    message: messageData.text,
  }; // for logging

  if (!userSession) {
    var newSession = await whatsAppUserService.create(from);
    userSession = newSession ? newSession : userSession;

    if (!userSession) {
      logger.error(
        `Failed to create a new session for whatsapp user -> ${from}`,
        context
      );
      return res.send(200);
    }

    const currentSession = await OnboardingService.greetUser(
      messageData.id,
      userSession,
      messageData.from,
      events
    );
    if (!currentSession) {
      logger.error(`Failed to onboard whatsapp user -> ${from}`, context); // log here
      return res.send(200);
    }

    newSession = await whatsAppUserService.update(currentSession);

    logger.info(
      `New session created for whatsapp user -> ${from}`,
      newSession?.id
    );
    return res.send(200);
  } else {
    context.sessionId = userSession.lastSession.id;

    // pass the text to the intent matcher
    intent = matchIntent(messageData?.text, userSession);

    // Remove for now: Select Language Feature
    // if (intent && intent.service === 'onboard') {
    //   // call obs

    //   const currentSession = await OnboardingService.setLanguagePreferrence(
    //     intent.intent,
    //     userSession
    //   );

    //   if (!currentSession) {
    //     logger.error(
    //       `Failed to set language preference of ${intent.intent}`,
    //       context
    //     ); // log here
    //     return res.send(200);
    //   }

    //   const _ = await sessionManager.update(currentSession);

    //   return res.send('Onboard response sent');}
    // else if (intent && intent.service === 'message') {
    // call tps
    //----------------------------------------
    const currentSession = await MessageService.response(
      messageData.id,
      intent.intent,
      userSession,
      messageData.from,
      events
    );

    context.intent = intent.intent;
    context.service = intent.service;

    if (!currentSession) {
      logger.error(
        `Failed to proccess response for: ${messageData.text}`,
        context
      ); // log here
      return res.send(200);
    }

    const _ = await whatsAppUserService.update(currentSession);
    logger.info(`Success: Message Processed for `, currentSession.id);
  }
  return res.send(200);
};
