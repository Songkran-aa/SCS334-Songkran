// อ้างอิง: https://github.com/line/line-bot-sdk-nodejs
// Synopsis: https://line.github.io/line-bot-sdk-nodejs/getting-started/basic-usage.html#synopsis

require('dotenv').config();

const express = require('express');
const line = require('@line/bot-sdk');

const app = express();

// Middleware ใช้เฉพาะ channelSecret (ตามเอกสารทางการ)
const middlewareConfig = {
  channelSecret: process.env.CHANNEL_SECRET || 'YOUR_CHANNEL_SECRET',
};

const client = line.LineBotClient.fromChannelAccessToken({
  channelAccessToken:
    process.env.CHANNEL_ACCESS_TOKEN || 'YOUR_CHANNEL_ACCESS_TOKEN',
});

// Respond with Hello World! on the homepage:
app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.post('/', function (req, res) {
  res.send('Got a POST request');
});

app.put('/user', function (req, res) {
  res.send('Got a PUT request at /user');
});

app.delete('/user', function (req, res) {
  res.send('Got a DELETE request at /user');
});

// Webhook — รูปแบบเดียวกับ synopsis (middleware + handler ใน app.post เดียว)
// ตั้ง Webhook URL ใน LINE Developers เป็น https://<โฮสต์>/webhook
app.post('/webhook', line.middleware(middlewareConfig), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const echo = { type: 'text', text: event.message.text };

  return client.replyMessage({
    replyToken: event.replyToken,
    messages: [echo],
  });
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
