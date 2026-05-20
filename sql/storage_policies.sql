-- Run ใน Supabase → SQL Editor หลังสร้าง bucket ชื่อ uploads (Public)
-- ใช้เมื่ออัปโหลด error เรื่อง RLS / policy

-- อ่านไฟล์ได้ (public bucket)
create policy "Public read uploads"
on storage.objects for select
to public
using (bucket_id = 'uploads');

-- อัปโหลดได้ (service_role มัก bypass RLS อยู่แล้ว — ใส่เผื่อใช้ anon key)
create policy "Service role insert uploads"
on storage.objects for insert
to service_role
with check (bucket_id = 'uploads');

create policy "Service role update uploads"
on storage.objects for update
to service_role
using (bucket_id = 'uploads');
