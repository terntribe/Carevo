import { config } from '#config/index.js';
import { JSONFileHandler } from './files.js';

// MessageConfig class to handle operations involving messages/system prompts from the JSON config file.
class MessageConfig {
  private messages: Record<string, any>;

  constructor() {
    this.messages = {};
  }

  // Load messages from the JSON file
  async loadMessages(): Promise<boolean> {
    try {
      this.messages = await JSONFileHandler.readJSONFile(
        config.storage.messages_location
      );
    } catch (error) {
      console.error(
        `Failed to load messages from ${config.storage.messages_location}:`,
        error
      );
      return false;
    }
    return true;
  }
}

export default new MessageConfig();
