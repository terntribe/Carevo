import { chatController } from '#controllers/chat.controllers.js';
import { validateWebhookRequest } from '#middlewares/webhooks/validate.middleware.js';
import { Router } from 'express';

const webhookRouter = Router();

webhookRouter.get('', (req, res) => {
  // verify webhook subscription
  const mode = req.query['hub.mode'];
  const verifyToken = req.query['hub.verify_token'];

  if (mode && verifyToken) {
    if (mode === 'subscribe' && verifyToken === process.env.VERIFY_TOKEN) {
      console.log('Webhook verified');
      // echo back the challenge token
      return res.status(200).send(req.query['hub.challenge']);
    } else {
      console.error('Webhook verification failed:', mode, verifyToken);
      return res.status(403).send('Forbidden');
    }
  } else {
    return res
      .status(400)
      .send('Bad Request: Missing parameters or invalid token');
  }
});

webhookRouter.post('/', validateWebhookRequest, chatController); // controller will be next
