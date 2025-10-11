import { MessageSessionType } from '#models/sessions/file/sessions.model.js';
import { processMessage } from './processors.js';

export class MessageService {
  static async response(
    keyword: string,
    session: MessageSessionType,
    to: string
  ) {
    return await processMessage(keyword, session, to);
  }
}
