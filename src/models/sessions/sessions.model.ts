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
  static create(phoneNumber: string, sessions: MessageSessionType[]) {
    // creates and adds a new session
    const timestamp = new Date();
    const seshId = crypto.randomUUID();
    const session: MessageSessionType = {
      id: seshId,
      phoneNumber: phoneNumber,
      language: 'default:english',
      createdAt: timestamp.toISOString(),
      updatedAt: timestamp.toISOString(),
    };
    sessions.push(session);

    return { sessions, session };
  }

  static update(sesh: MessageSessionType, sessions: MessageSessionType[]) {
    // updates a session
    sesh.updatedAt = new Date().toISOString();
    const updated = MessageSession.safeParse(sesh); // might move to validators...??
    if (!updated.success) {
      console.log(updated.error.issues[0].message);
      return null;
    } else {
      sessions = sessions.map((session) => {
        if (session.id === updated.data.id) {
          return updated.data;
        }
        return session;
      });
    }
    return sessions;
  }

  static retrieve(
    identifier: string,
    sessions: MessageSessionType[]
  ): MessageSessionType | undefined {
    return sessions.find(
      (session) =>
        session.id === identifier || session.phoneNumber === identifier
    );
  }
  delete(identifier: string, sessions: MessageSessionType[]) {
    return sessions.filter(
      (session) =>
        session.id !== identifier || session.phoneNumber !== identifier
    );
  }
}
