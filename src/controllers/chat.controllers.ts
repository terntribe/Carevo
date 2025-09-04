/*

NOTE: Response from this controller should be strictly 200 OK (for now), except for 
validation issues i.e. if `messageData` is empty due to errors from parsing and 
those handled by the validator middleware.
Any error that occurs when we process the message should be logged.

WhatsApp Business API retries messages that return any status code other than 200,
We do not want unexpected behaivors or to pollute our logs and standard output with errors.
The `inProcessLine` function tries to prevent multiple identical queries from the same sender to pass
for a limited time range but the API is unstable  i.e. failed messages from yesterday are also retried.

*/

import {
  inProcessLine,
  parseIncomingWhatAppMessageData,
} from '#utils/helpers.js';
import { Request, Response } from 'express';
import {
  MessageSessionType,
  SessionManager,
} from '#models/sessions/sessions.model.js';
import { matchIntent, Intent } from '#services/messages/processors.js';
import { OnboardingService } from '#services/messages/onboard.service.js';
import { MessageService } from '#services/messages/message.service.js';
import { rootLogger, getLogger, analyticsLogger } from '#config/logger.js';

const sessionManager = new SessionManager();
const _ = await sessionManager.loadSessions();

// loggers
const logger = getLogger(rootLogger, {
  microservice: 'whastapp-bot-service',
  scope: 'webhook',
});

const analytics = getLogger(analyticsLogger, {
  microservice: 'whastapp-bot-service',
  scope: 'webhook',
});

type Context = {
  phoneNumber: string;
  message: string;
  intent?: Intent;
};

export const chatController = async (req: Request, res: Response) => {
  const messageData = parseIncomingWhatAppMessageData(req.body);

  const sendersPhoneNumber = messageData?.from;
  let intent: Intent | null = null;

  if (!sendersPhoneNumber || !messageData || !messageData.text) {
    logger.error('Missing fields: phone number or message text is missing');
    return res.status(400).send(400);
  } else if (
    inProcessLine({ phone: sendersPhoneNumber, text: messageData.text })
  ) {
    logger.warn(
      `Message still being processed: Sender: ${sendersPhoneNumber} -> text: ${messageData.text}`
    );
    return res.send(200);
  }

  // try and get the session first (if num does not exist),
  //if not create a new sesh and call obs with 'greet' keyword...
  let userSession = sessionManager.retrieve(
    sendersPhoneNumber
  ) as MessageSessionType;

  let context: Context = {
    phoneNumber: sendersPhoneNumber,
    message: messageData.text,
  }; // for logging

  if (!userSession) {
    // !userSession
    var newSession = await sessionManager.create(sendersPhoneNumber);
    userSession = newSession ? newSession : userSession;

    if (!userSession) {
      logger.error(
        `Failed to create a new session for whatsapp user -> ${sendersPhoneNumber}`,
        context
      ); // log here
      return res.send(200);
    }

    const currentSession = await OnboardingService.greetUser(userSession);
    if (!currentSession) {
      logger.error(
        `Failed to onboard whatsapp user -> ${sendersPhoneNumber}`,
        context
      ); // log here
      return res.send(200);
    }

    newSession = await sessionManager.update(currentSession);

    logger.info(
      `New session created for whatsapp user -> ${sendersPhoneNumber}`,
      {
        session: newSession,
      }
    );
    return res.send(200);
  } else {
    // pass the text to the intent matcher and call either ->
    intent = matchIntent(messageData?.text, userSession);
  }

  // obs or message service
  if (intent && intent.service === 'onboard') {
    // call obs

    const currentSession = await OnboardingService.setLanguagePreferrence(
      intent.intent,
      userSession
    );

    if (!currentSession) {
      logger.error(
        `Failed to set language preference of ${intent.intent}`,
        context
      ); // log here
      return res.send(200);
    }

    const _ = await sessionManager.update(currentSession);

    return res.send('Onboard response sent');
  } else if (intent && intent.service === 'message') {
    // call tps

    const currentSession = await MessageService.response(
      intent.intent,
      userSession
    );

    context.intent = intent;

    if (!currentSession) {
      logger.error(
        `Failed to proccess response for: ${messageData.text}`,
        context
      ); // log here
      return res.send(200);
    }
    // console.log('Session after TPS: ', currentSession);
    const _ = await sessionManager.update(currentSession);
    return res.send('Response sent');
  }

  return res.send(200);
};
