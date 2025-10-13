import { MessageSessionType } from '#models/file/sessions.model.js';
import { checkSupportedLanguages, processMessage } from './processors.js';

export class OnboardingService {
  static async greetUser(
    wa_mid: string,
    session: MessageSessionType,
    to: string
  ) {
    return await processMessage({
      query: 'onboard:greet',
      session: session,
      to: to,
      wa_mid: wa_mid,
    });
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
    return await processMessage({
      query: keyword,
      session: session,
      to: to,
      wa_mid: '',
    });
  }
}
