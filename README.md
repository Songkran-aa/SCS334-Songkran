# SCS334-Songkran

โปรเจกต์เซิร์ฟเวอร์ **Node.js + Express** สำหรับบทเรียน / สาธิตการผูก **LINE Messaging API** (LINE Official Account) แบบ Echo Bot — ข้อความจากผู้ใช้จะถูกตอบกลับเป็นข้อความเดียวกัน

อ้างอิง SDK อย่างเป็นทางการ: [line-bot-sdk-nodejs](https://github.com/line/line-bot-sdk-nodejs) · [Basic Usage (Synopsis)](https://line.github.io/line-bot-sdk-nodejs/getting-started/basic-usage.html#synopsis)

---

## ความสามารถ

- **HTTP / Express 5** — หน้าแรก `Hello World!` และ route ตัวอย่างสำหรับเรียนรู้ REST (`GET/POST /`, `PUT/DELETE /user`)
- **LINE Webhook** — `POST /webhook` ใช้ `line.middleware` ตรวจลายเซ็น + `LineBotClient.replyMessage` ตอบข้อความ text แบบ echo
- **GET /webhook** — ใช้เปิดทดสอบในเบราว์เซอร์ว่า URL ถูกต้อง (LINE ส่งเหตุการณ์จริงด้วย **POST** เท่านั้น)
- โหลดค่าคอนฟิกจาก **`.env`** (ไม่ commit ขึ้น Git)

---

## ความต้องการของระบบ

- **Node.js** แนะนำเวอร์ชัน **20 ขึ้นไป** (แพ็กเกจ `@line/bot-sdk` v11 ระบุ `engines` ≥ 20)
- บัญชี [LINE Developers](https://developers.line.biz/) และช่อง Messaging API

---

## การติดตั้ง

```bash
git clone https://github.com/Songkran-aa/SCS334-Songkran.git
cd SCS334-Songkran
npm install
```

---

## ค่าคอนฟิก (Environment)

1. คัดลอกไฟล์ตัวอย่าง:

   ```bash
   copy .env.example .env
   ```

   (บน macOS/Linux: `cp .env.example .env`)

2. แก้ไฟล์ **`.env`** ใส่ค่าจาก **LINE Developers Console** → ช่องของ Messaging API:

   | ตัวแปร | ความหมาย |
   |--------|-----------|
   | `CHANNEL_ACCESS_TOKEN` | Channel access token (long-lived) |
   | `CHANNEL_SECRET` | Channel secret |
   | `LINE_CHANNEL_ID` | (ไม่บังคับ) ใช้อ้างอิงเท่านั้น |
| `SUPABASE_URL` | Project URL จาก Supabase → Settings → API / Data API |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role จาก Settings → API (ใช้บน server เท่านั้น) |

**อย่า commit ไฟล์ `.env`** — โปรเจกต์นี้มี `.gitignore` ไว้แล้ว

### Supabase (Database)

1. สร้างโปรเจกต์ที่ [supabase.com](https://supabase.com)
2. Copy โค้ดจาก `sql/create_message.sql` ไป **Run ใน Supabase SQL Editor**
3. ใส่ค่า API ใน `.env` แล้วรีสตาร์ทแอป — ข้อความ text จาก LINE จะบันทึกลงตาราง `messages`

---

## การรันในเครื่อง

รันแบบธรรมดา (แก้โค้ดแล้วต้องรีสตาร์ทเอง):

```bash
npm start
```

รันแบบพัฒนา — ใช้ **nodemon** รีสตาร์ทอัตโนมัติเมื่อบันทึกไฟล์:

```bash
npm run dev
```

เซิร์ฟเวอร์ฟังพอร์ต **`3000`** (หรือตาม `process.env.PORT` เมื่อ deploy)

---

## LINE Webhook บน localhost (ต้องใช้ HTTPS)

LINE รับ Webhook เป็น **HTTPS** เท่านั้น จึงใช้ **ngrok** (หรือเครื่องมือ tunnel อื่น) ชี้จากอินเทอร์เน็ตเข้า `http://localhost:3000`

1. ติดตั้ง [ngrok](https://ngrok.com/download) และลงทะเบียน authtoken (ครั้งแรก):

   ```bash
   ngrok config add-authtoken <YOUR_AUTHTOKEN>
   ```

2. เปิดเทอร์มินัลหนึ่งรันแอป (`npm start` หรือ `npm run dev`)

3. เปิดอีกเทอร์มินัลรัน:

   ```bash
   ngrok http 3000
   ```

4. นำ URL แบบ `https://xxxx.ngrok-free.app` (หรือ `.dev`) ไปตั้งใน LINE Developers → **Webhook URL**:

   ```text
   https://<subdomain>.ngrok-free.app/webhook
   ```

5. เปิดใช้ Webhook และทดสอบส่งข้อความในแชท OA

ดู request ผ่าน tunnel ได้ที่ **http://127.0.0.1:4040** (หน้า inspect ของ ngrok)

---

## เส้นทาง (Routes) หลัก

| Method | Path | คำอธิบาย |
|--------|------|-----------|
| GET | `/` | ข้อความ `Hello World!` |
| POST | `/` | ตัวอย่าง POST (เรียนรู้ Express) |
| PUT | `/user` | ตัวอย่าง PUT |
| DELETE | `/user` | ตัวอย่าง DELETE |
| GET | `/webhook` | ตรวจสอบว่า URL เปิดได้ (ไม่ใช่ช่องทางเหตุการณ์ของ LINE) |
| POST | `/webhook` | Webhook จริงจาก LINE — ต้องผ่าน signature middleware |

---

## โครงสร้างโปรเจกต์ (สรุป)

```
SCS334-Songkran/
├── index.js          # เซิร์ฟเวอร์หลัก + LINE webhook
├── lib/supabase.js   # Supabase client
├── sql/create_message.sql
├── package.json
├── .env              # สร้างเอง (ไม่ขึ้น Git)
├── .env.example      # ตัวอย่างตัวแปรสภาพแวดล้อม
└── README.md
```

---

## หมายเหตุด้านความปลอดภัย

- ไม่แชร์ **Channel secret** / **Channel access token** ในแชทหรือที่สาธารณะ
- หากรั่ว ให้ไปออก token ใหม่ / หมุน secret ใน LINE Developers

---

## License / ชั้นเรียน

โปรเจกต์นี้ใช้ในวิชา / กิจกรรม **SCS334** — ชื่อโปรเจกต์ **SCS334-Songkran**
