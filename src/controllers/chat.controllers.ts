import { parseIncomingWhatAppMessageData } from '#utils/helpers.js';
import { Request, Response } from 'express';
import {
  MessageSessionType,
  SessionManager,
} from '#models/sessions/sessions.model.js';
import { matchIntent } from '#services/messages/processors.js';
import { OnboardingService } from '#services/messages/onboard.service.js';

const sessionManager = new SessionManager();
const sessionsLoaded = await sessionManager.loadSessions();

export const chatController = async (req: Request, res: Response) => {
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
  let userSession = sessionManager.retrieve(
    sendersPhoneNumber
  ) as MessageSessionType;

  if (!userSession) {
    // create a new session
    var newSession = await sessionManager.create(sendersPhoneNumber);
    userSession = newSession ? newSession : userSession;

    if (!userSession) {
      console.error('Failed to create a new session');
      res.status(500).send('Internal server error: Failed to create session');
      return;
    }
    // call obs with 'greet'

    const currentSession = await OnboardingService.greetUser(userSession);
    if (!currentSession) {
      console.error('Failed to greet user');
      res.status(500).send('Internal server error: Failed to greet user');
      return;
    }
    newSession = await sessionManager.update(currentSession);
    res.status(200).send('Session created and user greeted successfully');
  } else {
    // pass the text to the intent matcher and call either ->
    intent = matchIntent(messageData?.text, userSession);
  }
  // obs or topic service
  if (intent === 'onboard') {
    // call obs

    const currentSession =
      await OnboardingService.setLanguagePreferrence(userSession);
    if (!currentSession) {
      console.error('Failed to set language preference');
      res
        .status(500)
        .send('Internal server error: Failed to set language preference');
      return;
    }
    const newSession = await sessionManager.update(currentSession);
    res.status(200).send('Session created and user greeted successfully');
  } else {
    // call tps
  }
};
