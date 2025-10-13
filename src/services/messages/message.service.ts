import { MessageSessionType } from '#models/file/sessions.model.js';
import { processMessage } from './processors.js';
import { QueryData } from './processors.js';

export class MessageService {
  static async response(
    wa_mid: string,
    keyword: string,
    session: MessageSessionType,
    to: string
  ) {
    return await processMessage({
      query: keyword,
      session: session,
      to: to,
      wa_mid: wa_mid,
    });
  }
}
