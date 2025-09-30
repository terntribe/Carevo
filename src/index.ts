import 'reflect-metadata';
import express from 'express';
import initDatabase from '#config/db.js';
import { rootLogger as logger } from '#config/logger.js';
import { config } from '#config/index.js';
import webhookRouter from '#routes/webhook.routes.js';

const app = express();

app.use(express.json());
app.use('/api/v1/webhook', webhookRouter);

app.get('/', async (req, res) => {
  res.send('Hello World!');
  console.log('Received a request at /');
});

try {
  initDatabase();
  logger.info('Database configured successfully');

  // start server
  app.listen(config.port, () => {
    logger.info(`Server is running at http://localhost:${config.port}`);
  });
} catch (error) {
  logger.error('Error during Database configuration', error);
  process.exit(1);
}
