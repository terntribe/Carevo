import { JSONFileHandler } from '#utils/files.js';
import * as z from 'zod';
import { rootLogger, getLogger } from '#config/logger.js';

const logger = getLogger(rootLogger, {
  service: 'whatsapp-bot-service',
  component: 'session-manager',
});

const MessageSession = z.object({
  id: z.uuid(),
  phoneNumber: z.coerce.string().min(10),
  language: z.union([z.literal('english'), z.string()]),
  lastMessage: z.object({
    query: z.string(),
    options: z.array(z.coerce.string()),
  }),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
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
      createdAt: timestamp.toISOString(),
      updatedAt: timestamp.toISOString(),
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

  async update(sesh: MessageSessionType) {
    // updates a session
    sesh.updatedAt = new Date().toISOString();
    const updated = MessageSession.safeParse(sesh); // might move to validators...??

    if (!updated.success) {
      logger.error(`Validation Error: ${updated.error.issues[0].message}`, {
        session: sesh,
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
        logger.error('Failed to save updated session', { session: sesh });
        return null;
      }
    }

    return sesh;
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
      return null;
    }
    return;
  }
}
