// json file handler
import fs from 'fs/promises';
import { rootLogger as logger } from '#config/logger.js';

export class JSONFileHandler {
  static async readJSONFile(filePath: string): Promise<any> {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      logger.error(`Error reading JSON file at ${filePath}: ${error}`);
      throw error;
    }
  }

  static async saveJSONFile(filePath: string, data: any): Promise<void> {
    try {
      const jsonData = JSON.stringify(data, null, 2);
      await fs.writeFile(filePath, jsonData, 'utf-8');
      logger.info(`JSON data saved to ${filePath}`);
    } catch (error) {
      logger.error(`Error saving JSON file at ${filePath}: ${error}`);
      throw error;
    }
  }
}
