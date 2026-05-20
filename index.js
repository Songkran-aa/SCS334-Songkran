// อ้างอิง: https://github.com/line/line-bot-sdk-nodejs
// Synopsis: https://line.github.io/line-bot-sdk-nodejs/getting-started/basic-usage.html#synopsis

require('dotenv').config();

const express = require('express');
const line = require('@line/bot-sdk');
const { getSupabase } = require('./lib/supabase');
const {
  generateLineReply,
  classifyAnimalImage,
  formatGeminiError,
} = require('./lib/gemini');

const app = express();

// Middleware ใช้เฉพาะ channelSecret (ตามเอกสารทางการ)
const middlewareConfig = {
  channelSecret: process.env.CHANNEL_SECRET || 'YOUR_CHANNEL_SECRET',
};

const client = line.LineBotClient.fromChannelAccessToken({
  channelAccessToken:
    process.env.CHANNEL_ACCESS_TOKEN || 'YOUR_CHANNEL_ACCESS_TOKEN',
});

const channelAccessToken =
  process.env.CHANNEL_ACCESS_TOKEN ||
  process.env.LINE_CHANNEL_ACCESS_TOKEN ||
  '';

// 1. สร้าง Blob Client สำหรับดึงข้อมูลไฟล์โดยเฉพาะ (ของ v9+)
const lineBlobClient = new line.messagingApi.MessagingApiBlobClient({
  channelAccessToken,
});

function detectMimeType(buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png';
  return 'image/jpeg';
}

const downloadLineContent = async (messageId) => {
  const stream = await lineBlobClient.getMessageContent(messageId);
  const chunks = [];

  if (stream.arrayBuffer) {
    const arrayBuffer = await stream.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = stream.type || detectMimeType(buffer);
    return {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType,
      },
      buffer: buffer,
    };
  }

  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  const mimeType = detectMimeType(buffer);
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType,
    },
    buffer: buffer,
  };
};

async function handleImage(event) {
  const messageId = event.message.id;
  const userId = event.source.userId || 'unknown';
  const replyToken = event.replyToken || '';
  const supabase = getSupabase();

  let imageUrl = null;
  let uploadOk = false;
  let animalName = null;
  const replyMessages = [];

  try {
    const imageContent = await downloadLineContent(messageId);

    if (!supabase) {
      console.error(
        'Skip Storage upload: ตั้ง SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY ใน .env'
      );
    } else if (!imageContent.buffer?.length) {
      console.error('Skip Storage upload: ดาวน์โหลดรูปจาก LINE ไม่ได้ (buffer ว่าง)');
    } else {
      const fileName = `${messageId}.jpg`;
      const storagePath = `bot-uploads/${fileName}`;
      const contentType = imageContent.inlineData.mimeType || 'image/jpeg';

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(storagePath, imageContent.buffer, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError.message, uploadError);
      } else {
        uploadOk = true;
        console.log('Storage upload ok:', uploadData?.path || storagePath);
        const { data: publicUrlData } = supabase.storage
          .from('uploads')
          .getPublicUrl(storagePath);
        imageUrl = publicUrlData.publicUrl;
      }
    }

    try {
      animalName = await classifyAnimalImage(imageContent.inlineData);
    } catch (err) {
      console.error('Gemini classify error:', formatGeminiError(err));
    }

    replyMessages.push({
      type: 'text',
      text: uploadOk ? 'ส่งรูปภาพสำเร็จ' : 'ส่งรูปภาพไม่สำเร็จ',
    });

    if (animalName) {
      replyMessages.push({
        type: 'text',
        text: animalName.includes('ไม่พบสัตว์')
          ? animalName
          : `สัตว์ชนิด: ${animalName}`,
      });
    } else {
      replyMessages.push({
        type: 'text',
        text: 'จำแนกรูปสัตว์ไม่สำเร็จ',
      });
    }
  } catch (error) {
    console.error('Error ในการดึงรูปภาพด้วย SDK v9:', error);
    replyMessages.length = 0;
    replyMessages.push(
      { type: 'text', text: 'ส่งรูปภาพไม่สำเร็จ' },
      { type: 'text', text: 'จำแนกรูปสัตว์ไม่สำเร็จ' }
    );
  }

  const replyContent = replyMessages.map((m) => m.text).join('\n');
  const content = imageUrl || `[image] ${replyContent}`;

  try {
    if (supabase) {
      const { error } = await supabase.from('messages').insert([
        {
          user_id: userId,
          message_id: messageId,
          type: 'image',
          content: content,
          reply_token: replyToken,
          reply_content: replyContent,
        },
      ]);

      if (error) {
        console.error('Supabase Insert Error:', error.message);
      }
    }

    return await client.replyMessage({
      replyToken: replyToken,
      messages: replyMessages,
    });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการประมวลผลรูปภาพ:', error);
  }
}

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
  if (event.type === 'message' && event.message.type === 'image') {
    return handleImage(event);
  }

  if (event.type !== 'message' || event.message.type !== 'text') {
    return null;
  }

  const userId = event.source.userId || 'unknown';
  const replyToken = event.replyToken || '';
  const messageId = event.message.id;
  const content = event.message.text;

  let botReplyText = content;
  try {
    const geminiReply = await generateLineReply(content);
    botReplyText = geminiReply || content;
  } catch (err) {
    console.error('Gemini Error:', formatGeminiError(err));
    botReplyText = `ขออภัย Gemini ไม่พร้อมตอบตอนนี้\n${content}`;
  }

  try {
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('messages').insert([
        {
          user_id: userId,
          message_id: messageId,
          type: 'text',
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
      messages: [{ type: 'text', text: botReplyText }],
    });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการประมวลผลระบบ:', error);
  }
}

const PORT = process.env.PORT || 3021;
app.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
  if (getSupabase()) console.log('Supabase: configured');
  else console.log('Supabase: not configured (set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env)');
  if (process.env.GEMINI_API_KEY?.trim()) {
    console.log('Gemini: configured (gemini-2.5-flash-lite with fallbacks)');
  }
  else console.log('Gemini: not configured (set GEMINI_API_KEY in .env)');
});
