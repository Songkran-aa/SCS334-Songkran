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

app.get('/', (req, res) => {
  res.send('hello world, Songkran');
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

// GET /webhook — ให้เปิดทดสอบในเบราว์เซอร์ได้ 200 (LINE ส่งเหตุการณ์จริงด้วย POST เท่านั้น)
app.get('/webhook', function (req, res) {
  res.status(200).type('text/plain').send('Webhook endpoint OK — LINE sends POST here');
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

const PORT = process.env.PORT || 3021;
app.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});
