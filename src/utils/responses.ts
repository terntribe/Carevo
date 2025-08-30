import { config } from '#config/index.js';
import { JSONFileHandler } from './files.js';
import * as z from 'zod';

/*
'onboard:select_language',
'onboard:greet',
'topic',
'support:unknown_input',
'support:contact'
*/

const Message = z.object({
  id: z.coerce.string(),
  type: z.literal(['topic', 'onboard', 'support']),
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
const systemMessages = {
  '11': 'more_information',
  '10': 'onboard:change_language',
  '22': 'topic:topics',
} as const;

export type MessageType = z.infer<typeof Message>;

/* MessageConfig class to handle operations involving 
messages/system prompts from the JSON config file. */
export class MessageConfig {
  private messages: MessageType[];
  private languages: string[];

  constructor() {
    this.messages = [];
    this.languages = [];
  }

  // Load messages from the JSON file
  async loadMessages(): Promise<boolean> {
    try {
      const results = await JSONFileHandler.readJSONFile(
        config.storage.messages_location
      );

      this.messages = results.messages;
      this.languages = results.languages;
    } catch (error) {
      console.error(
        `Failed to load messages from ${config.storage.messages_location}:`,
        error
      );
      return false;
    }
    return true;
  }

  getMessageByQueryOrId(query: string) {
    return this.messages.find((msg) => msg.query == query || msg.id == query);
  }

  async saveMessage(message: MessageType) {
    // update the messages in memory and disk
    const safeMsg = Message.safeParse(message);

    if (!safeMsg.success) {
      console.log(typeof message.id);
      console.log(safeMsg.error.issues);
      return null;
    } else {
      this.messages = this.messages.map((msg) => {
        if (msg.id === safeMsg.data.id) {
          return safeMsg.data;
        }
        return msg;
      });
      await JSONFileHandler.saveJSONFile(config.storage.messages_location, {
        langages: this.languages,
        messages: this.messages,
      });
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

  static checkSysPrompt(
    query: string
  ): (typeof systemMessages)[keyof typeof systemMessages] | false {
    if (query in systemMessages) {
      return systemMessages[query as keyof typeof systemMessages];
    }
    return false;
  }
}
