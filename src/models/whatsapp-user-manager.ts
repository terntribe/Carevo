import { Session, Identifier, Message } from '#models/db/sessions.model.js';
import { rootLogger, getLogger } from '#config/logger.js';
import * as z from 'zod';
import { WhatsAppUser } from './db/whatsapp-user.models.js';
import { getLastEntryOrNull } from '#utils/helpers.js';

const logger = getLogger(rootLogger, {
  service: 'whatsapp-bot-service',
  component: 'session-manager',
});

export const WhatsAppUserSession = z.object({
  id: z.uuid(),
  phoneNumber: z.coerce.string().min(10),
  lastSession: z.object({
    id: z.uuid(),
    language: z.union([z.literal('english'), z.string()]),
    isFirstSession: z.boolean(),
    messages: z.array(
      z.object({
        query: z.string(),
        options: z.array(z.coerce.string()),
      })
    ),
    createdAt: z.date({
      error: (issue) =>
        issue.input === undefined ? 'Required' : 'Invalid date',
    }),
    updatedAt: z.date({
      error: (issue) =>
        issue.input === undefined ? 'Required' : 'Invalid date',
    }),
  }),
  createdAt: z.date({
    error: (issue) => (issue.input === undefined ? 'Required' : 'Invalid date'),
  }),
});

export type WAUserSessionType = z.infer<typeof WhatsAppUserSession>;

export default class WAUSerRepository {
  private get WhatsAppUser() {
    return new WhatsAppUser();
  }

  async create(phoneNumber: string): Promise<WhatsAppUser> {
    const user = this.WhatsAppUser;
    const session = new Session();

    try {
      // session entry

      session.language = 'english';
      session.isFirstSession = true;
      session.messages = [];

      user.lastSession = session;
      user.phoneNumber = phoneNumber;

      return await user.save();
    } catch (error) {
      logger.error(`Failed to create session for ${phoneNumber}:`, error);
    }

    return user;
  }

  async retrieve(identifier: string): Promise<WhatsAppUser | null> {
    try {
      return await WhatsAppUser.findByIdOrPhoneNumber({
        phoneNumber: identifier,
      });
    } catch (error) {
      logger.error(`Failed to fetch user session for ${identifier}`, error);
    }
    return null;
  }

  async update(data: WAUserSessionType): Promise<WhatsAppUser | null> {
    try {
      const user = await this.retrieve(data.phoneNumber);
      const session = new Session();

      if (user) {
        if (
          new Date().getTime() - user.lastSession.updatedAt.getTime() >
          30 * 60 * 1000
        ) {
          // remove and delete the old session
          const oldSession = user.lastSession;
          oldSession.remove();

          session.isFirstSession = false;
          session.language = data.lastSession.language;
          session.messages = data.lastSession.messages.map((msg) => {
            const message = new Message();
            message.query = msg.query;
            message.options = msg.options;
            return message;
          });
        } else {
          user.lastSession.language = data.lastSession.language;
          const msg = getLastEntryOrNull(data.lastSession.messages);

          if (msg) {
            const message = new Message();
            message.query = msg.query;
            message.options = msg.options;
            user.lastSession.messages =
              user.lastSession.messages.concat(message);
          }
        }

        return await user.save();
      }
    } catch (error) {
      logger.error(
        `Failed to update session with id ${data.lastSession.id}`,
        error
      );
    }
    return null;
  }

  async delete(identifier: string) {
    const user = await this.retrieve(identifier);
    if (user) {
      try {
        await user.remove();
      } catch (error) {
        logger.error(`Failed to delete session for ${user.id}`, error);
      }
    }
    logger.error(`Failed to fetch session for ${identifier}`);
  }

  serialize(message: WAUserSessionType) {
    return this.WhatsAppUser;
  }
}
