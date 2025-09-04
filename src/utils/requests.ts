import { Request } from './types.js';
import { initRequestClient } from './helpers.js';
import { getLogger, rootLogger } from '#config/logger.js';

const logger = getLogger(rootLogger, {
  microservice: 'whatsapp-bot-service',
  scope: 'RequestsManager',
});

export class RequestsManager {
  constructor(private client = initRequestClient()) {}

  async get(request: Request) {
    try {
      return await this.client.get(request.url, { headers: request.headers });
    } catch (error) {
      logger.error(`GET request error:, ${error}`);
    }
  }

  async post(request: Request) {
    try {
      return await this.client.post(request.url, request.body, {
        headers: request.headers,
      });
    } catch (error) {
      logger.error(`POST request error:',${error}`);
    }
  }
}
