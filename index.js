// อ้างอิง: https://github.com/line/line-bot-sdk-nodejs
// Synopsis: https://line.github.io/line-bot-sdk-nodejs/getting-started/basic-usage.html#synopsis

require('dotenv').config();

const express = require('express');
const line = require('@line/bot-sdk');
const { getSupabase } = require('./lib/supabase');
const { generateLineReply } = require('./lib/gemini');

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

// 4. ฟังก์ชันหลักในการจัดการ Event และบันทึกข้อมูล
async function handleEvent(event) {
  if (event.type !== 'message') {
    return null;
  }

  const userId = event.source.userId || 'unknown';
  const replyToken = event.replyToken || '';

  const messageId = event.message.id;
  const messageType = event.message.type;

  let content = null;
  let botReplyText = '';

  if (event.message.type === 'text') {
    content = event.message.text;
    try {
      const geminiReply = await generateLineReply(content);
      botReplyText = geminiReply || content;
    } catch (err) {
      console.error('Gemini Error:', err.message);
      botReplyText = content;
    }
  } else {
    content = `[Received ${messageType} message]`;
    botReplyText = `ได้รับข้อความประเภท ${messageType} แล้วครับ`;
  }

  try {
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('messages').insert([
        {
          user_id: userId,
          message_id: messageId,
          type: messageType,
          content: content,
          reply_token: replyToken,
          reply_content: botReplyText,
        },
      ]);

      if (error) {
        console.error('Supabase Insert Error:', error.message);
      }
    }

    return await client.replyMessage({
      replyToken: replyToken,
      messages: [
        {
          type: 'text',
          text: botReplyText,
        },
      ],
    });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการประมวลผลระบบ:', error);
  }
}

const PORT = process.env.PORT || 3021;
app.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
  if (getSupabase()) console.log('Supabase: configured');
  else console.log('Supabase: not configured (set SUPABASE_URL + key in .env)');
  if (process.env.GEMINI_API_KEY) console.log('Gemini: configured (gemini-2.0-flash-lite)');
  else console.log('Gemini: not configured (set GEMINI_API_KEY in .env)');
});
