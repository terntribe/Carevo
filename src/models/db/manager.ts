import { Session, Identifier, LastMessage } from '#models/db/sessions.model.js';
import { rootLogger, getLogger } from '#config/logger.js';
import { MessageSessionType } from '../file/sessions.model.js';

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
      // last message entry
      let lastMessage = new LastMessage();
      lastMessage.query = '';
      lastMessage.options = [];
      lastMessage = await lastMessage.save();

      session.phoneNumber = phoneNumber;
      session.language = 'english';
      session.lastMessage = lastMessage;
      return await session.save();
    } catch (error) {
      logger.error(`Failed to create session for ${phoneNumber}:`, error);
      //   throw error;
    }

    return session;
  }

  async retrieve(identifier: string): Promise<Session | null> {
    try {
      return await Session.findByIdOrPhoneNumber({ phoneNumber: identifier });
    } catch (error) {
      logger.error(`Failed to fetch user session for ${identifier}`, error);
    }
    return null;
  }

  async update(data: MessageSessionType): Promise<Session | null> {
    try {
      const session = await this.retrieve(data.phoneNumber);
      if (session) {
        session.language = data.language;
        Object.assign(session.lastMessage, data.lastMessage);
        console.log(session);
        return await session.save();
      }
    } catch (error) {
      logger.error(`Failed to update session with id ${data.id}`, error);
    }
    return null;
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

  serialize(message: MessageSessionType) {
    return this.UserSession;
  }
}
