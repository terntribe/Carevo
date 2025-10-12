import { Request, Response, NextFunction } from 'express';
import { isValidIncomingWhatsAppMessageData } from '#utils/helpers.js';
import { rootLogger, getLogger } from '#config/logger.js';

const logger = getLogger(rootLogger, {
  service: 'whastapp-bot-service',
});

type MessageStatus = {
  id: string;
  status: 'sent' | 'delivered' | 'failed';
  timestamp: number;
};

export const validateWebhookRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const body = req.body;

  // Parse the webhook event, inspect and handle event type here
  const changes = body.entry && body.entry[0] && body.entry[0].changes;
  const messageStatus =
    changes && changes[0] && changes[0].field && changes[0].value.statuses;

  // Check if its a whatsapp event status message i.e. read, delivered, sent e.t.c.
  if (changes && messageStatus) {
    const messageStatusData =
      messageStatus.length > 0 ? messageStatus[0] : null;

    const { id, status, timestamp } = messageStatusData;
    const statusData: MessageStatus = { id, status, timestamp };

    logger.info(`Status recieved: ${statusData.status}`, {
      status: statusData,
    });

    if (statusData.status == 'failed') {
      const error = changes[0].value.statuses[0].errors[0];
      logger.error(`Failed to send message: ${error.error_data.details}`);
    }

    return res.status(200).send({ status: status });
  }

  if (!changes) {
    logger.warn('No changes found in the webhook data'); // might need to log more info here
    return res
      .status(400)
      .send('Bad Request: No changes found in the webhook data');
  }

  logger.info('New whatsapp message event recieved', {
    eventData: parseEventLogData(changes),
  });

  if (isValidIncomingWhatsAppMessageData(body)) {
    // Handle messages in the chat handlers
    next();
  } else {
    logger.error(`Invalid webhook data: ${body}`);
    return res.status(400).send('Bad Request: Invalid webhook data');
  }
};

type EventLogData = {
  id: string;
  text: Record<string, string>;
  timestamp: string;
  type: string;
};

function parseEventLogData(data: any[]): EventLogData | null {
  /**
   * Parses webhook data for logging (filters out the phone number)
   */

  if (!data || data.length === 0) {
    return null;
  }

  const value = data[0].value;

  if (value?.messages?.length > 0) {
    const { from, ...messageWithoutPhone } = value.messages[0];
    return messageWithoutPhone;
  }
  return null;
}
