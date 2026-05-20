const { GoogleGenAI } = require('@google/genai');

const MODEL = 'gemini-2.0-flash-lite';

let client;

function getGemini() {
  if (client) return client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  client = new GoogleGenAI({ apiKey });
  return client;
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
  if (!ai) return null;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text:
              'จำแนกสัตว์ในรูปนี้ ตอบเป็นชื่อสัตว์ภาษาไทยเท่านั้น สั้นกระชับ หนึ่งชื่อ ไม่ต้องอธิบายเพิ่ม ถ้าไม่ใช่รูปสัตว์หรือมองไม่ชัด ตอบว่า: ไม่พบสัตว์ในรูป',
          },
          {
            inlineData: {
              mimeType: inlineData.mimeType || 'image/jpeg',
              data: inlineData.data,
            },
          },
        ],
      },
    ],
  });

  const text = response.text?.trim();
  return text || null;
}

module.exports = { getGemini, generateLineReply, classifyAnimalImage, MODEL };
