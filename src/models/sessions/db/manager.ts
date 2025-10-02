import { Session, Identifier } from '#models/sessions/db/sessions.model.js';
import { rootLogger, getLogger } from '#config/logger.js';

const logger = getLogger(rootLogger, {
  service: 'whatsapp-bot-service',
  component: 'session-manager',
});

export default class SessionRepository {
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

  async retrieve(identifier: string): Promise<Session | null> {
    try {
      return await Session.findByIdOrPhoneNumber(identifier);
    } catch (error) {
      logger.error(`Failed to fetch user session for ${identifier}`, error);
    }
    return null;
  }

  async update(session: Session): Promise<Session | null> {
    try {
      return await session.save();
    } catch (error) {
      logger.error(`Failed to update session with id ${session.id}`, error);
      return null;
    }
  }

  async delete(identifier: string) {
    const session = await this.retrieve(identifier);
    if (session) {
      try {
        await session.remove();
      } catch (error) {
        logger.error(`Failed to delete session for ${session.id}`, error);
      }
    }
    logger.error(`Failed to fetch session for ${identifier}`);
  }
}
