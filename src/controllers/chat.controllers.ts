import { parseIncomingWhatAppMessageData } from '#utils/helpers.js';
import { Request, Response } from 'express';
import {
  MessageSessionType,
  SessionManager,
} from '#models/sessions/sessions.model.js';
import { matchIntent } from '#services/messages/processors.js';
import { OnboardingService } from '#services/messages/onboard.service.js';

var sessions: MessageSessionType[] = [];

export const chatController = (req: Request, res: Response) => {
  // get the body from request pass it to parse helper and get the text
  const messageData = parseIncomingWhatAppMessageData(req.body);
  // phone number
  const sendersPhoneNumber = messageData?.from;
  let intent: 'onboard' | string = '';

  if (!sendersPhoneNumber || messageData.text) {
    console.log('Missing fields');
    res.status(400).send('Bad request: Missing fields');
  }
  // try and get the session first (if num does not exist), if not create a new sesh and call obs with 'greet' keyword...
  let session: MessageSessionType | undefined = SessionManager.retrieve(
    sendersPhoneNumber,
    sessions
  );
  if (!session) {
    // call obs with 'greet'
    let sessions,
      session = SessionManager.create(sendersPhoneNumber, sessions); // fix

    try {
      const newsession = await OnboardingService.greetUser(session);
    } catch (error) {
      console.log('Error', error);
      res.status(400);
    }
  } else {
    // pass the text to the intent matcher and call either ->
    intent = matchIntent(messageData?.text, session);
  }
  // obs or topic service
  if (intent === 'onboard') {
    // call obs
  } else {
    // call tps
  }
};
