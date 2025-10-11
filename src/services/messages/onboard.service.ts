import { MessageSessionType } from '#models/sessions/file/sessions.model.js';
import { checkSupportedLanguages, processMessage } from './processors.js';

export class OnboardingService {
  static async greetUser(session: MessageSessionType, to: string) {
    return await processMessage('onboard:greet', session, to);
  }

  static async setLanguagePreferrence(
    choice: string,
    session: MessageSessionType,
    to: string
  ) {
    let keyword = 'support:invalid-input';
    const language = checkSupportedLanguages(choice);
    if (language) {
      keyword = `onboard:${language}`;
      session.language = language;
    }
    return await processMessage(keyword, session, to);
  }
}
