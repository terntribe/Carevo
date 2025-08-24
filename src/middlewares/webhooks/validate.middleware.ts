import { Request, Response, NextFunction } from 'express';
import { isValidIncomingWhatsAppMessageData } from '#utils/helpers.js';

export const validateWebhookRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const body = req.body;

  // Parse the webhook event, inspect and handle event type here
  const changes = body.entry && body.entry[0] && body.entry[0].changes;
  const status =
    changes && changes[0] && changes[0].field && changes[0].value.statuses;

  // Check if its a whatsapp event status message i.e. read, delivered, sent e.t.c. we create a type for this to cast
  if (changes && status) {
    console.log('Status recieved: ', status);
    return res.status(200).send({ status: status });
  }

  if (!changes) {
    console.error('No changes found');
    return res
      .status(400)
      .send('Bad Request: No changes found in the webhook data');
  }

  console.log('EVENT_RECEIVED');

  if (isValidIncomingWhatsAppMessageData(body)) {
    // Handle messages in the chat handlers
    next();
  } else {
    console.log('THIS IS NOT A MSG');
    return res.status(400).send('Bad Request: Invalid webhook data');
  }
};
