import { config } from '#config/index.js';
import { JSONFileHandler } from './files.js';
import * as z from 'zod';
import { rootLogger as logger } from '#config/logger.js';

const Message = z.object({
  id: z.coerce.string(),
  type: z.literal(['topic', 'message', 'prompt']),
  category: z.optional(
    z.literal(['disease_prevention', 'childcare', 'hygiene'])
  ),
  keyword: z.string(),
  query: z.coerce.string(),
  response: z.string().max(5000),
  audio: z.record(
    z.string(),
    z.object({
      location: z.string(),
      whatsapp_media_id: z.string(),
    })
  ),
  actions: z.object({
    prompt: z.string(),
    options: z.array(z.coerce.string()),
  }),
});

// const systemMessages = {
//   '22': 'topic:categories',
// } as const;

export type MessageType = z.infer<typeof Message>;

/* MessageConfig class to handle operations involving 
messages/system prompts from the JSON config file. */
export class MessageConfig {
  private messages: MessageType[];
  private languages: string[];
  private systemPrompts: Record<string, string>;

  constructor() {
    this.messages = [];
    this.languages = [];
    this.systemPrompts = {};
  }

  // Load messages from the JSON file
  async loadMessages(): Promise<boolean> {
    try {
      const results = await JSONFileHandler.readJSONFile(
        config.storage.messages_location
      );

      this.messages = results.messages;
      this.languages = results.languages;
      const sysPrompts = this.messages.filter((msg) => msg.type === 'prompt');

      sysPrompts.forEach((msg) => {
        this.systemPrompts[msg.id.toString()] = msg.query;
      });
      logger.info(this.systemPrompts);
    } catch (error) {
      logger.error(
        `Failed to load messages from ${config.storage.messages_location}:
        ${error}`
      );
      return false;
    }
    return true;
  }

  getMessageByQueryOrId(query: string) {
    return this.messages.find((msg) => msg.query == query || msg.id == query);
  }

  async saveMessage(message: MessageType): Promise<void> {
    // update the messages in memory and disk
    const safeMsg = Message.safeParse(message);

    if (!safeMsg.success) {
      // console.log(typeof message.id);
      logger.error(`Validation error: ${safeMsg.error.issues[0].message}`, {
        message: { ...message },
      });
    } else {
      this.messages = this.messages.map((msg) => {
        if (msg.id === safeMsg.data.id) {
          return safeMsg.data;
        }
        return msg;
      });
      try {
        await JSONFileHandler.saveJSONFile(config.storage.messages_location, {
          // try catch this
          langages: this.languages,
          messages: this.messages,
        });
      } catch (error) {
        logger.error(
          `Failed to save messages to ${config.storage.messages_location}: ${error}`,
          { message: message }
        );
      }
    }
  }

  supportedLanguage(text: string) {
    return this.languages.includes(text);
  }

  getLangauge(index: number) {
    if (index >= 0 && index <= this.languages.length) {
      return this.languages[index];
    }
    return null;
  }

  checkSysPrompt(
    query: string
  ): (typeof this.systemPrompts)[keyof typeof this.systemPrompts] | false {
    if (query in this.systemPrompts) {
      return this.systemPrompts[query as keyof typeof this.systemPrompts];
    }
    return false;
  }
}
