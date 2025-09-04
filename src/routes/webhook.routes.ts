import { chatController } from '#controllers/chat.controllers.js';
import { validateWebhookRequest } from '#middlewares/webhooks/validate.middleware.js';
import { Router } from 'express';
import { config } from '#config/index.js';
import { rootLogger, getLogger } from '#config/logger.js';

const webhookRouter = Router();
const logger = getLogger(rootLogger, {
  microservice: 'whastapp-bot-service',
  scope: 'webhook',
});

webhookRouter.get('', (req, res) => {
  // verify webhook subscription
  const mode = req.query['hub.mode'];
  const verifyToken = req.query['hub.verify_token'];

  if (mode && verifyToken) {
    if (
      mode === 'subscribe' &&
      verifyToken === config.whatsapp.wa_verify_token
    ) {
      logger.info('WhatsApp Business API App Webhook verified successfully');

      // echo back the challenge token
      return res.status(200).send(req.query['hub.challenge']);
    } else {
      logger.error('Webhook verification failed', {
        mode: mode,
        verifyToken: verifyToken,
        url: req.url,
      });
      return res.status(403).send('Forbidden');
    }
  } else {
    logger.error('Bad request', {
      url: req.url,
    });
    return res
      .status(400)
      .send('Bad Request: Missing parameters or invalid token');
  }
});

webhookRouter.post('/', validateWebhookRequest, chatController); // controller will be next

export default webhookRouter;
