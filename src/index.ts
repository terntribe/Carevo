import express from 'express';

const app = express();
const port = process.env.PORT ?? 5173;

app.get('/', (req, res) => {
  res.send('Hello World!');
  console.log('Received a request at /');
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
