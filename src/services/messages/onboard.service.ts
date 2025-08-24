import { MessageSessionType } from '#models/sessions/sessions.model.js';
import { processMessage } from './processors.js';

export class OnboardingService {
  static async greetUser(session: MessageSessionType) {
    return await processMessage('onboard:greet', session);
  }
  static async setLanguagePreferrence(session: MessageSessionType) {
    return await processMessage('onboard:select-lang', session);
  }
}
