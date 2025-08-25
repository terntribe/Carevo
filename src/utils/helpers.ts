import axios from 'axios';

type messageData = {
  id: any;
  from: string;
  timestamp: any;
  text: string;
  type: any;
  attachments: any;
};

export type deliveredMessage = {
  phone: string;
  text: string;
  expires: Date;
};

let messages: deliveredMessage[] = [];

export const isValidIncomingWhatsAppMessageData = (data: any): boolean => {
  // Validates that webhook event data has a valid "message" structure
  const changes =
    data &&
    data.entry &&
    data.entry[0] &&
    data.entry[0].changes &&
    data.entry[0].changes[0];

  const eventType = changes.field;
  const messages =
    changes.value && changes.value.messages && changes.value.messages[0];

  if (eventType === 'messages' && messages) {
    return true;
  }
  return false;
};

export const parseIncomingWhatAppMessageData = (
  data: any
): messageData | null => {
  // Validates the structure of the webhook payload and parses out the message data
  // args -> data: payload
  //returns -> message (false if the structure does not conform with that of an incoming whatsapp message)

  const changes =
    data &&
    data.entry &&
    data.entry[0] &&
    data.entry[0].changes &&
    data.entry[0].changes[0];

  const eventType = changes ? changes.field : null;
  const messages = changes ? changes.value.messages : null;

  if (eventType === 'messages') {
    if (messages && messages.length > 0) {
      const message = messages[0];
      const messageData = {
        id: message.id,
        from: message.from,
        timestamp: message.timestamp,
        text: message.text ? message.text.body : null,
        type: message.type,
        attachments: message.attachments || [],
      };
      return messageData;
    }
  }

  return null;
};

export function initRequestClient() {
  const client = axios.create({ timeout: 6 * 10000 });

  //attach debug log for requests
  client.interceptors.request.use(
    (request) => {
      console.log(`${request.method} - pinging ${request.url}`);
      return request;
    },
    (error) => error // we will come back here to log errors
  );

  // attach retry logic for timeouts and network errors
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (
        (axios.isAxiosError(error) && !error.response) ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ERR_NETWORK' ||
        error.code === 'ERR_BAD_RESPONSE'
      ) {
        // Retry logic for network errors or timeouts
        const config = error.config;

        if (!config || !config.__retryCount) {
          config.__retryCount = 0;
          config._backOff = 1;
        }

        if (config.__retryCount < 4) {
          config.__retryCount += 1;
          config._backOff =
            config.__retryCount > 1 ? config._backOff * 2 : config._backOff;

          const delay = config.__retryCount > 1 ? config._backOff * 1000 : 1000;

          console.log(
            `attempt ${config.__retryCount} failed, retrying in ${delay / 1000} seconds...`
          );
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(client(config));
            }, delay); // Wait a bit before retrying...
          });
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
}

export function inProcessLine(msg: { phone: string; text: string }): boolean {
  const now = new Date();
  const expiry = new Date(now.getTime() + 5 * 60 * 1000);
  const newEntry = { ...msg, expires: expiry };
  const message = messages.find(
    (m) => m.phone == msg.phone && m.text == msg.text
  );

  if (message) {
    if (now > message.expires) {
      messages = messages.map((m) => {
        if (m.phone == msg.phone && m.text == msg.text) return newEntry;
        return m;
      });
      return false;
    } else {
      return true;
    }
  }
  messages.push(newEntry);
  return false;
}
