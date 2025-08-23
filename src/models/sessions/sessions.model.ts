import * as z from 'zod';

const MessageSession = z.object({
  id: z.uuid(),
  phoneNumber: z.coerce.string().length(10),
  language: z.union([z.literal('default:english'), z.string()]),
  lastQueryKeyword: z.string().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type MessageSessionType = z.infer<typeof MessageSession>;

export class SessionManager {
  constructor(private sessions: MessageSessionType[] = []) {} // using in mem store for now

  create(phoneNumber: string) {
    // creates and adds a new session
    const timestamp = new Date();
    const seshId = crypto.randomUUID();
    this.sessions.push({
      id: seshId,
      phoneNumber: phoneNumber,
      language: 'default:english',
      createdAt: timestamp.toISOString(),
      updatedAt: timestamp.toISOString(),
    });
    return seshId;
  }
  update(sesh: MessageSessionType) {
    // updates a session
    sesh.updatedAt = new Date().toISOString();
    const updated = MessageSession.safeParse(sesh); // might move to validators...??
    if (!updated.success) {
      console.log(updated.error.issues[0].message);
      return null;
    } else {
      this.sessions = this.sessions.map((session) => {
        if (session.id === updated.data.id) {
          return updated.data;
        }
        return session;
      });
    }
  }
  retrieve(identifier: string): MessageSessionType | undefined {
    return this.sessions.find(
      (session) =>
        session.id === identifier || session.phoneNumber === identifier
    );
  }
  delete(identifier: string) {
    this.sessions = this.sessions.filter(
      (session) =>
        session.id !== identifier || session.phoneNumber !== identifier
    );
  }
}

export default new SessionManager();
