import { rootLogger, getLogger } from '#config/logger.js';
import { MessageSessionType } from '#models/sessions/file/sessions.model.js';

const logger = getLogger(rootLogger, {
  service: 'whatsapp-bot-service',
  component: 'session-service',
});

interface SessionRepo<T> {
  create(phoneNumber: string): Promise<T>;
  retrieve(identifier: string): Promise<T | null>;
  update(session: T): Promise<T | null>;
  delete(identifier: string): Promise<void>;
}

export default class SessionService<T> {
  constructor(private sessionRepo: SessionRepo<T>) {}

  private deserialize<T>(data: T): MessageSessionType {
    return;
  }

  private serialize<T>(mesage: MessageSessionType): T {
    return;
  }

  async create(phoneNumber: string) {
    return await this.sessionRepo.create(phoneNumber);
  }
  async retrieve(identifier: string) {
    return await this.sessionRepo.retrieve(identifier);
  }
}
