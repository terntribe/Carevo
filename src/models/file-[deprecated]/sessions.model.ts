// deprecated

import { JSONFileHandler } from '#utils/files.js';
import * as z from 'zod';
import { rootLogger, getLogger } from '#config/logger.js';

const logger = getLogger(rootLogger, {
  service: 'whatsapp-bot-service',
  component: 'session-manager',
});

export const MessageSession = z.object({
  id: z.uuid(),
  phoneNumber: z.coerce.string().min(10),
  language: z.union([z.literal('english'), z.string()]),
  lastMessage: z.object({
    query: z.string(),
    options: z.array(z.coerce.string()),
  }),
  createdAt: z.date({
    error: (issue) => (issue.input === undefined ? 'Required' : 'Invalid date'),
  }),
  updatedAt: z.date({
    error: (issue) => (issue.input === undefined ? 'Required' : 'Invalid date'),
  }),
});

export type MessageSessionType = z.infer<typeof MessageSession>;

export class SessionManager {
  constructor(
    private sessions: MessageSessionType[] = [],
    private file: string = './sessions.json'
  ) {}

  async loadSessions() {
    // loads sessions from a file
    try {
      const results = await JSONFileHandler.readJSONFile(this.file);
      this.sessions = results.sessions;
    } catch (error) {
      logger.error(`Failed to load sessions from ${this.file}:`, error);
      return false;
    }
    return true;
  }

  async saveSessions() {
    // saves sessions to a file
    try {
      await JSONFileHandler.saveJSONFile(this.file, {
        sessions: this.sessions,
      });
    } catch (error) {
      logger.error(`Failed to save sessions to ${this.file}:`, error);
      return false;
    }
    return true;
  }

  async create(phoneNumber: string) {
    // creates and adds a new session
    const timestamp = new Date();
    const seshId = crypto.randomUUID();

    const session: MessageSessionType = {
      id: seshId,
      phoneNumber: phoneNumber,
      language: 'english',
      lastMessage: { query: '', options: [] },
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.sessions.push(session);
    // save
    const saved = await this.saveSessions();
    if (!saved) {
      logger.error('Failed to save new session', { session: session });
      return null;
    }

    return session;
  }

  async update(session: MessageSessionType) {
    // updates a session
    session.updatedAt = new Date();
    const updated = MessageSession.safeParse(session); // might move to validators...??

    if (!updated.success) {
      logger.error(`Validation Error: ${updated.error.issues[0].message}`, {
        session: { ...session },
      });
      return null;
    } else {
      this.sessions = this.sessions.map((session) => {
        if (session.id === updated.data.id) {
          return updated.data;
        }
        return session;
      });
      //save
      const saved = await this.saveSessions();
      if (!saved) {
        logger.error('Failed to save updated session', { session: session });
        return null;
      }
    }

    return session;
  }

  retrieve(identifier: string): MessageSessionType | undefined {
    return this.sessions.find(
      (session) =>
        session.id === identifier || session.phoneNumber === identifier
    );
  }
  async delete(identifier: string) {
    this.sessions = this.sessions.filter(
      (session) =>
        session.id !== identifier || session.phoneNumber !== identifier
    );
    // save
    const deleted = await this.saveSessions();
    if (!deleted) {
      logger.error('Failed to delete session', { identifier: identifier });
    }
  }

  serialize(message: MessageSessionType) {
    return message;
  }
}
