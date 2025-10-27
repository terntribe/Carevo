import { AnalyticsEvent } from '#analytics/types.js';
import { WAUserSessionType } from '#models/whatsapp-user-manager.js';
import { checkSupportedLanguages, processMessage } from './processors.js';

export class OnboardingService {
  static async greetUser(
    wa_mid: string,
    session: WAUserSessionType,
    to: string,
    events: AnalyticsEvent[]
  ) {
    return await processMessage({
      query: 'onboard:greet',
      session: session,
      to: to,
      wa_mid: wa_mid,
      events,
    });
  }

  static async setLanguagePreferrence(
    choice: string,
    session: WAUserSessionType,
    to: string,
    events: AnalyticsEvent[]
  ) {
    let keyword = 'support:invalid-input';
    const language = checkSupportedLanguages(choice);
    if (language) {
      keyword = `onboard:${language}`;
      session.lastSession.language = language;
    }
    return await processMessage({
      query: keyword,
      session: session,
      to: to,
      wa_mid: '',
      events,
    });
  }
}
