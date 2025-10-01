import { Session, Identifier } from '#models/sessions/db/sessions.model.js';
import { rootLogger, getLogger } from '#config/logger.js';

const logger = getLogger(rootLogger, {
  service: 'whatsapp-bot-service',
  component: 'session-manager',
});

interface SessionRepository<T> {
  create(phoneNumber: string): Promise<T>;
  retrieve(identifier: string): Promise<T | null>;
  update(session: T): Promise<T | null>;
  delete(session: T): Promise<void>;
}

export default class SessionService {
  private get UserSession() {
    return new Session();
  }

  async create(phoneNumber: string): Promise<Session> {
    const session = this.UserSession;

    try {
      session.phoneNumber = phoneNumber;
      session.language = 'EN';
      session.lastMessage = null as any; // Set to null or appropriate default
      await session.save();
      return session;
    } catch (error) {
      logger.error(`Failed to create session for ${phoneNumber}:`, error);
      //   throw error;
    }

    return session;
  }

  async retrieve(
    // retrieve
    identifier: string
  ): Promise<Session | null> {
    try {
      return await Session.findByIdOrPhoneNumber(query);
    } catch (error) {
      logger.error(`Failed to fetch user session for ${query}`, error);
    }
    return null;
  }

  async update(session: Session): Promise<Session> {
    try {
      return await session.save();
    } catch (error) {
      logger.error(`Failed to update session with id ${session.id}`, error);
    }
    return session;
  }

  async delete(query: Identifier) {
    const session = await this.retrieve(query);
    if (session) {
      try {
        return await session.remove();
      } catch (error) {
        logger.error(`Failed to delete session for ${session.id}`, error);
      }
    }
    logger.error(`Failed to fetch session for ${query}`);
    return session;
  }
}
