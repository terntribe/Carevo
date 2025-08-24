import { config } from '#config/index.js';
import { JSONFileHandler } from './files.js';
import * as z from 'zod';

const Message = z.object({
  id: z.uuid(),
  type: z.literal([
    'onboard:select_language',
    'onboard:greet',
    'topic',
    'support:unknown_input',
    'support:contact',
  ]),
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
  options: z.object({
    prompt: z.string(),
    moreInfo: z.uuid(),
    relatedQuestions: z.array(z.uuid()),
  }),
});

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
      this.languages = results.langauges;
    } catch (error) {
      console.error(
        `Failed to load messages from ${config.storage.messages_location}:`,
        error
      );
      return false;
    }
    return true;
  }

  getMessageByKeyword(keyword: string) {
    return this.messages.find(
      (msg) => msg.keyword === keyword || msg.query === keyword
    );
  }

  getMessageById(id: string) {
    return this.messages.find((msg) => msg.id === id);
  }

  async saveMessage(message: MessageType) {
    const safeMsg = Message.safeParse(message);
    if (!safeMsg.success) {
      console.log(safeMsg.error.issues[0].message);
      return null;
    } else {
      this.messages = this.messages.filter((msg) => msg.id === safeMsg.data.id);
      await JSONFileHandler.saveJSONFile(
        config.storage.messages_location,
        this.messages
      );
    }
  }

  supportedLanguage(text: string) {
    return this.languages.includes(text);
  }
}
