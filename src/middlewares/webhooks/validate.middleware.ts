import { Request, Response, NextFunction } from 'express';
import { isValidIncomingWhatsAppMessageData } from '#utils/helpers.js';
import { rootLogger, getLogger } from '#config/logger.js';

const logger = getLogger(rootLogger, {
  microservice: 'whastapp-bot-service',
  scope: 'webhook',
});

type MessageStatus = {
  id: string;
  status: 'sent' | 'delivered';
  timestamp: number;
  recipient_id: string;
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

    const { id, status, timestamp, recipient_id } = messageStatusData;
    const statusData: MessageStatus = { id, status, timestamp, recipient_id };

    logger.info(`Status recieved: ${statusData.status}`, {
      status: statusData,
    });

    return res.status(200).send({ status: status });
  }

  if (!changes) {
    logger.warn('No changes found in the webhook data'); // might need to log more info here
    return res
      .status(400)
      .send('Bad Request: No changes found in the webhook data');
  }

  logger.info(
    'New whatsapp message event recieved',
    changes.length > 0
      ? {
          field: changes[0].field,
          metadata: changes[0].value.metadata,
          contacts: changes[0].value.contacts,
          messages: changes[0].value.messages,
        }
      : {}
  );

  if (isValidIncomingWhatsAppMessageData(body)) {
    // Handle messages in the chat handlers
    next();
  } else {
    logger.error(`Invalid webhook data: ${body}`);
    return res.status(400).send('Bad Request: Invalid webhook data');
  }
};
