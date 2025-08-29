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
import { matchIntent } from '#services/messages/processors.js';
import { OnboardingService } from '#services/messages/onboard.service.js';
import { MessageService } from '#services/messages/message.service.js';

const sessionManager = new SessionManager();
const _ = await sessionManager.loadSessions();

export const chatController = async (req: Request, res: Response) => {
  const messageData = parseIncomingWhatAppMessageData(req.body);

  const sendersPhoneNumber = messageData?.from;

  let intent: 'onboard' | string = '';

  if (!sendersPhoneNumber || !messageData || !messageData.text) {
    console.log('Missing fields'); // log here
    return res.status(400).send('Bad request: Missing fields'); // send 400 bad request because validation failed
  } else if (
    inProcessLine({ phone: sendersPhoneNumber, text: messageData.text })
  ) {
    console.log(`still warm: ${sendersPhoneNumber} -> ${messageData.text}`);
    return res.send(200);
  }

  // try and get the session first (if num does not exist),
  //if not create a new sesh and call obs with 'greet' keyword...
  let userSession = sessionManager.retrieve(
    sendersPhoneNumber
  ) as MessageSessionType;

  if (!userSession) {
    var newSession = await sessionManager.create(sendersPhoneNumber);
    userSession = newSession ? newSession : userSession;

    if (!userSession) {
      console.error('Failed to create a new session'); // log here
      return res.send(200);
    }

    const currentSession = await OnboardingService.greetUser(userSession);
    if (!currentSession) {
      console.error('onboarding service failed: '); // log here
      return res.send(200);
    }

    newSession = await sessionManager.update(currentSession);
    res.status(200).send('Session created');
  } else {
    // pass the text to the intent matcher and call either ->
    intent = matchIntent(messageData?.text, userSession);
  }

  // obs or message service
  if (userSession.lastMessage.query.startsWith('onboard')) {
    // call obs

    const currentSession = await OnboardingService.setLanguagePreferrence(
      messageData.text,
      userSession
    );

    if (!currentSession) {
      console.error('Failed to set language preference'); // log here
      return res.send(200);
    }

    const _ = await sessionManager.update(currentSession);

    return res.send('Onboard response sent');
  } else {
    // call tps
    const currentSession = await MessageService.response(
      messageData.text,
      userSession
    );
    if (!currentSession) {
      console.error('Failed to proccess response for: ', messageData.text); // log here
      return res.send(200);
    }
    const _ = await sessionManager.update(currentSession);
    return res.send('Response sent');
  }
  // return res.send(200);
};
