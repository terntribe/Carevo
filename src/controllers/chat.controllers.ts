/*

NOTE: Response from this controller should be strictly 200 OK (for now), except for 
validation issues i.e. if `messageData` is empty due to errors from parsing and 
those handled by the validator middleware.
Any error that occurs when we process the message should be logged.

WhatsApp Business API retries messages that return any status code other than 200,
We do not want unexpected behaivors or to pollute our logs and standard output with errors.
The `debounce` function tries to prevent multiple identical queries from the same sender to pass
for a limited time range but the API is unstable  i.e. failed messages from yesterday are also retried.

*/

import {
  debounce,
  generateNumHash,
  parseIncomingWhatAppMessageData,
} from '#utils/helpers.js';
import { Request, Response } from 'express';
import {
  MessageSessionType,
  SessionManager,
} from '#models/sessions/file/sessions.model.js';
import { matchIntent, Intent } from '#services/messages/processors.js';
import { OnboardingService } from '#services/messages/onboard.service.js';
import { MessageService } from '#services/messages/message.service.js';
import {
  rootLogger,
  getLogger,
  analyticsLogger as analytics,
} from '#config/logger.js';
import SessionService from '#services/messages/sessions.service.js';
import SessionRepository from '#models/sessions/db/manager.js';
import { Session } from '#models/sessions/db/sessions.model.js';

// const sessionService = new SessionService<MessageSessionType>(new SessionManager());
// const _ = await sessionManager.loadSessions();

const sessionService = new SessionService<Session>(new SessionRepository());

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

  const from = await generateNumHash(messageData?.from);
  let intent: Intent | null = null;

  if (!messageData || !messageData.text || messageData.from) {
    logger.error('Missing fields: phone number or message text is missing');

    if (messageData?.type != 'text') {
      logger.error('Invalid message');
      // maybe implement blocking strategy
    }

    return res.status(400).send(400);
  } else if (debounce({ phone: from, text: messageData.text })) {
    logger.warn(
      `Message still being processed: Sender: ${from} -> text: ${messageData.text}` // trucate hash and log
    );
    return res.send(200);
  }

  // try and get the session first (if num does not exist),
  //if not create a new sesh and call obs with 'greet' keyword...
  let userSession = await sessionService.retrieve(from);

  let context: Context = {
    message: messageData.text,
  }; // for logging

  if (!userSession) {
    // !userSession
    var newSession = await sessionService.create(from);
    userSession = newSession ? newSession : userSession;

    if (!userSession) {
      logger.error(
        `Failed to create a new session for whatsapp user -> ${from}`,
        context
      ); // log here
      return res.send(200);
    }

    const currentSession = await OnboardingService.greetUser(userSession);
    if (!currentSession) {
      logger.error(`Failed to onboard whatsapp user -> ${from}`, context); // log here
      return res.send(200);
    }

    newSession = await sessionService.update(currentSession);

    logger.info(`New session created for whatsapp user -> ${from}`, newSession);
    return res.send(200);
  } else {
    context.sessionId = userSession.id;

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

    const currentSession = await MessageService.response(
      intent.intent,
      userSession
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

    const _ = await sessionService.update(currentSession);
    logger.info(`Success: Message Processed for `, currentSession.id);
  }
  return res.send(200);
};
