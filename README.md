# SCS334-Songkran

โปรเจกต์เซิร์ฟเวอร์ **Node.js + Express 5** สำหรับบทเรียน / Challenge — ผูก **LINE Messaging API** กับ **Supabase** และ **Google Gemini** ตอบข้อความและจำแนกรูปสัตว์

อ้างอิง SDK: [line-bot-sdk-nodejs](https://github.com/line/line-bot-sdk-nodejs) · [Basic Usage (Synopsis)](https://line.github.io/line-bot-sdk-nodejs/getting-started/basic-usage.html#synopsis)

**Production:** `https://songkran.csbootstrap.com/webhook` (พอร์ต `3021`, process `scs334-songkran` บน PM2)

---

## ความสามารถ

| ประเภท | พฤติกรรม |
|--------|-----------|
| **ข้อความ (text)** | ตอบด้วย Gemini (ภาษาไทย สั้น กระชับ) — ถ้า AI ล้มทุกโมเดลจะ echo ข้อความผู้ใช้ |
| **รูปภาพ (image)** | อัปโหลดไป Supabase Storage (`uploads/bot-uploads/`) แล้วจำแนกสัตว์ด้วย Gemini |
| **LINE ตอบกลับ (รูป)** | 2 ข้อความ: `ส่งรูปภาพสำเร็จ` / `ส่งรูปภาพไม่สำเร็จ` และ `สัตว์ชนิด: …` / `จำแนกรูปสัตว์ไม่สำเร็จ` |
| **Database** | บันทึกข้อความและคำตอบลงตาราง `messages` (ถ้าตั้ง Supabase แล้ว) |
| **Webhook** | `POST /webhook` — `line.middleware` + `handleEvent` / `handleImage` |
| **Deploy** | Push ขึ้น `main` → GitHub Actions SSH `git pull` + `pm2 restart scs334-songkran` |

---

## Gemini — ลำดับ fallback โมเดล

ใช้ **ทีละตัวจากบนลงล่าง** ตัวแรกที่สำเร็จจะถูกใช้ (ไม่เรียกครบทุกตัวทุกครั้ง):

1. `gemini-2.5-flash-lite`
2. `gemini-2.5-flash`
3. `gemini-flash-latest`
4. `gemini-2.0-flash-lite`
5. `gemini-2.0-flash`

โค้ดอยู่ใน `lib/gemini.js` — ทั้ง `generateLineReply()` (ข้อความ) และ `classifyAnimalImage()` (รูป)

> โมเดล `2.0` บน free tier อาจได้ **429** (โควต้าหมด); `2.5-flash` บางช่วงได้ **503** (overload) — fallback ช่วยสลับไปตัวที่ยังใช้ได้

---

## ความต้องการของระบบ

- **Node.js** ≥ 18 (แนะนำ 20+ สำหรับ `@line/bot-sdk` v11)
- บัญชี [LINE Developers](https://developers.line.biz/)
- โปรเจกต์ [Supabase](https://supabase.com) + bucket Storage ชื่อ `uploads`
- API key [Google AI Studio](https://aistudio.google.com/apikey) (`GEMINI_API_KEY`)

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

   (macOS/Linux: `cp .env.example .env`)

2. แก้ **`.env`** ใส่ค่าจริง:

   | ตัวแปร | ความหมาย |
   |--------|-----------|
   | `CHANNEL_ACCESS_TOKEN` | Channel access token (LINE Developers) |
   | `CHANNEL_SECRET` | Channel secret |
   | `LINE_CHANNEL_ID` | (ไม่บังคับ) Channel ID |
   | `PORT` | พอร์ตเซิร์ฟเวอร์ — production ใช้ `3021` |
   | `SUPABASE_URL` | Project URL เช่น `https://xxxxx.supabase.co` (**ไม่ใส่** `/rest/v1/`) |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role (server เท่านั้น อย่า commit) |
   | `GEMINI_API_KEY` | API key จาก Google AI Studio |

**อย่า commit ไฟล์ `.env`** — มีใน `.gitignore` แล้ว

### Supabase

1. รัน `sql/create_message.sql` ใน **SQL Editor** (สร้างตาราง `messages`)
2. สร้าง bucket **`uploads`** (public หรือตามที่อาจารย์กำหนด)
3. ถ้าอัปโหลดรูปไม่ผ่าน policy ให้รัน `sql/storage_policies.sql`
4. ถ้าคอลัมน์สะกดผิด `reply_contont` ให้รัน `sql/fix_reply_contont.sql`

---

## การรันในเครื่อง

```bash
npm start
```

พัฒนา (รีสตาร์ทอัตโนมัติ):

```bash
npm run dev
```

ตอนสตาร์ทจะ log สถานะ Supabase / Gemini ใน console

พอร์ตตาม `PORT` ใน `.env` (ตัวอย่าง `3021`)

---

## LINE Webhook บน localhost (HTTPS)

LINE รับ Webhook เป็น **HTTPS** เท่านั้น — ใช้ [ngrok](https://ngrok.com/download):

1. รันแอป: `npm run dev`
2. อีกเทอร์มินัล: `ngrok http 3021` (หรือพอร์ตใน `.env`)
3. ตั้ง Webhook URL: `https://<subdomain>.ngrok-free.app/webhook`
4. เปิดใช้ Webhook แล้วทดสอบในแชท OA

---

## เส้นทาง (Routes) หลัก

| Method | Path | คำอธิบาย |
|--------|------|-----------|
| GET | `/` | `hello world, Songkran` |
| GET | `/webhook` | ตรวจว่า endpoint เปิดได้ |
| POST | `/webhook` | Webhook จาก LINE (text + image) |

---

## โครงสร้างโปรเจกต์

```
SCS334-Songkran/
├── index.js              # Express + LINE webhook + handleImage
├── lib/
│   ├── gemini.js         # Gemini client + fallback โมเดล
│   └── supabase.js       # Supabase client (service role)
├── sql/
│   ├── create_message.sql
│   ├── storage_policies.sql
│   └── fix_reply_contont.sql
├── .github/workflows/
│   └── deploy.yml        # deploy ขึ้นเซิร์ฟเวอร์เมื่อ push main
├── package.json
├── .env.example
└── README.md
```

---

## Deploy (เซิร์ฟเวอร์)

- Path: `/var/www/songkran.csbootstrap.com/SCS334-Songkran`
- หลัง push `main`: GitHub Actions รัน `git pull`, `npm install`, `pm2 restart scs334-songkran`
- แก้ `.env` บนเซิร์ฟเวอร์แล้ว: `pm2 restart scs334-songkran --update-env`

---

## หมายเหตุด้านความปลอดภัย

- ไม่แชร์ Channel secret / access token / Supabase service role / Gemini API key ในที่สาธารณะ
- หากรั่ว ให้หมุน key ใน LINE Developers, Supabase, Google AI Studio

---

## License / ชั้นเรียน

โปรเจกต์ใช้ในวิชา **SCS334** — **SCS334-Songkran**
