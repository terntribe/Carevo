import { Request } from './types.js';
import { initRequestClient } from './helpers.js';

export class RequestsManager {
  constructor(private client = initRequestClient()) {}

  async get(request: Request) {
    return await this.client.get(request.url, { headers: request.headers });
  }

  async post(request: Request) {
    return await this.client.post(request.url, request.body, {
      headers: request.headers,
    });
  }
}
