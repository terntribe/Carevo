import { MessageSessionType } from '#models/sessions/sessions.model.js';
import { checkSupportedLanguages, processMessage } from './processors.js';

export class OnboardingService {
  static async greetUser(session: MessageSessionType) {
    return await processMessage('onboard:greet', session);
  }
  static async setLanguagePreferrence(
    choice: string,
    session: MessageSessionType
  ) {
    let keyword = 'support:invalid-input';
    const language = checkSupportedLanguages(choice);
    if (language) {
      keyword = `onboard:${language}`;
      session.language = language;
    }
    return await processMessage(keyword, session);
  }
}
