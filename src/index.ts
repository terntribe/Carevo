import express from 'express';
import { RequestsManager } from '#utils/requests.js';
import { config } from '#config/index.js';
import webhookRouter from '#routes/webhook.routes.js';

const app = express();
// const requests = new RequestsManager();

app.use(express.json());
app.use('/api/v1/webhook', webhookRouter);

app.get('/', async (req, res) => {
  res.send('Hello World!');
  console.log('Received a request at /');
  // await requests.get({ url: 'http://localhost:8080/timeout/11' });
  // console.log('Network request finished: success');
});

app.listen(config.port, () => {
  console.log(`Server is running at http://localhost:${config.port}`);
});
