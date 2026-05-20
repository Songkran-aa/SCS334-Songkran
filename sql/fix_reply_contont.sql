-- แก้คอลัมน์ที่สะกดผิด reply_contont → reply_content
-- Run ใน Supabase SQL Editor ถ้า Table Editor แสดงชื่อ reply_contont
alter table messages rename column reply_contont to reply_content;
