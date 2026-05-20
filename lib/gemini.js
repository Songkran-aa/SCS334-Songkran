const { GoogleGenAI } = require('@google/genai');

const MODEL = 'gemini-2.0-flash-lite';
const IMAGE_MODELS = ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-2.5-flash'];

let client;

function getGemini() {
  if (client) return client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  client = new GoogleGenAI({ apiKey });
  return client;
}

function formatGeminiError(err) {
  if (!err) return 'unknown error';
  const parts = [err.message];
  if (err.status) parts.push(`status=${err.status}`);
  if (err.code) parts.push(`code=${err.code}`);
  return parts.filter(Boolean).join(' ');
}

function normalizeInlineData(inlineData) {
  let data = inlineData?.data || '';
  if (data.includes(',')) {
    data = data.split(',')[1];
  }
  return {
    mimeType: inlineData?.mimeType || 'image/jpeg',
    data,
  };
}

async function generateLineReply(userText) {
  const ai = getGemini();
  if (!ai) return null;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `คุณเป็นผู้ช่วยใน LINE ตอบสั้น กระชับ เป็นภาษาไทย ไม่เกิน 500 ตัวอักษร\n\nผู้ใช้: ${userText}`,
  });

  const text = response.text?.trim();
  return text || null;
}

async function classifyAnimalImage(inlineData) {
  const ai = getGemini();
  if (!ai) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const image = normalizeInlineData(inlineData);
  if (!image.data || image.data.length < 100) {
    throw new Error('Invalid image data (empty or too small)');
  }

  const prompt =
    'จำแนกสัตว์ในรูปนี้ ตอบเป็นชื่อสัตว์ภาษาไทยเท่านั้น สั้นกระชับ หนึ่งชื่อ ไม่ต้องอธิบายเพิ่ม ถ้าไม่ใช่รูปสัตว์หรือมองไม่ชัด ตอบว่า: ไม่พบสัตว์ในรูป';

  let lastError;

  for (const model of IMAGE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ inlineData: image }, prompt],
      });

      const text = response.text?.trim();
      if (text) {
        console.log('Gemini classify ok:', model, '->', text);
        return text;
      }
    } catch (err) {
      lastError = err;
      console.error(`Gemini classify failed (${model}):`, formatGeminiError(err));
    }
  }

  throw lastError || new Error('Gemini returned empty response');
}

module.exports = {
  getGemini,
  generateLineReply,
  classifyAnimalImage,
  formatGeminiError,
  MODEL,
};
