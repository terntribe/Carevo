import { MessageSessionType } from '#models/sessions/sessions.model.js';
import { processMessage } from './processors.js';

export class TopicService {
  static async response(keyword: string, session: MessageSessionType) {
    return await processMessage(keyword, session);
  }
}
