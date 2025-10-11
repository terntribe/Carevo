import { rootLogger, getLogger } from '#config/logger.js';
import { MessageSessionType } from '#models/sessions/file/sessions.model.js';
import { MessageSession } from '#models/sessions/file/sessions.model.js';

const logger = getLogger(rootLogger, {
  service: 'whatsapp-bot-service',
  component: 'session-service',
});

interface SessionRepo<T> {
  create(phoneNumber: string): Promise<T>;
  retrieve(identifier: string): Promise<T | null>;
  update(session: MessageSessionType): Promise<T | null>;
  delete(identifier: string): Promise<void>;
  serialize(message: MessageSessionType): T;
}

export default class SessionService<T> {
  constructor(private sessionRepo: SessionRepo<T>) {}

  private deserialize<T>(data: T): MessageSessionType | null {
    const serialized = MessageSession.safeParse(data);
    if (!serialized.success) {
      console.log('This was the data -> ', data);
      logger.error(`Validation error: ${serialized.error.issues[0].message}`);
      return null;
    }
    return serialized.data;
  }

  async create(phoneNumber: string) {
    const response = await this.sessionRepo.create(phoneNumber);
    console.log('This the response from create', response);
    return this.deserialize(response);
  }

  async retrieve(identifier: string) {
    const response = await this.sessionRepo.retrieve(identifier);
    return this.deserialize(response);
  }

  async update(session: MessageSessionType) {
    // const data = this.sessionRepo.serialize(session);
    const response = await this.sessionRepo.update(session);
    return this.deserialize(response);
  }

  async delete(idenifier: string) {
    return await this.sessionRepo.delete(idenifier);
  }
}
