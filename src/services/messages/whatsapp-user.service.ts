import { rootLogger, getLogger } from '#config/logger.js';
// import { MessageSessionType } from '#models/file/sessions.model.js';
// import { MessageSession } from '#models/file/sessions.model.js';
import {
  WAUserSessionType,
  WhatsAppUserSession,
} from '#models/whatsapp-user-manager.js';

const logger = getLogger(rootLogger, {
  service: 'whatsapp-bot-service',
  component: 'session-service',
});

interface WhatsAppUserRepo<T> {
  create(phoneNumber: string): Promise<T>;
  retrieve(identifier: string): Promise<T | null>;
  update(session: WAUserSessionType): Promise<T | null>;
  delete(identifier: string): Promise<void>;
  serialize(message: WAUserSessionType): T;
}

export default class WhatsAppUserService<T> {
  constructor(private whatsAppUserRepo: WhatsAppUserRepo<T>) {}

  private deserialize<T>(data: T): WAUserSessionType | null {
    const serialized = WhatsAppUserSession.safeParse(data);
    if (!serialized.success) {
      logger.error(`Validation error: ${serialized.error.issues[0].message}`);
      return null;
    }
    return serialized.data;
  }

  async create(phoneNumber: string) {
    const response = await this.whatsAppUserRepo.create(phoneNumber);
    // console.log('This the response from create', response);
    return this.deserialize(response);
  }

  async retrieve(identifier: string) {
    const response = await this.whatsAppUserRepo.retrieve(identifier);
    return this.deserialize(response);
  }

  async update(user: WAUserSessionType) {
    // const data = this.sessionRepo.serialize(session);
    const response = await this.whatsAppUserRepo.update(user);
    return this.deserialize(response);
  }

  async delete(idenifier: string) {
    return await this.whatsAppUserRepo.delete(idenifier);
  }
}
