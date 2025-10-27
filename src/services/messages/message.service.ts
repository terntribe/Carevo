import { AnalyticsEvent } from '#analytics/types.js';
import { WAUserSessionType } from '#models/whatsapp-user-manager.js';
import { processMessage } from './processors.js';
import { QueryParams } from './processors.js';

export class MessageService {
  static async response(
    wa_mid: string,
    keyword: string,
    session: WAUserSessionType,
    to: string,
    events: AnalyticsEvent[]
  ) {
    return await processMessage({
      query: keyword,
      session: session,
      to: to,
      wa_mid: wa_mid,
      events: events,
    });
  }
}
