# VÉRSE E-Commerce Starter

ระบบร้านค้าออนไลน์ที่ใช้ HTML/CSS/JavaScript + Supabase (Auth, PostgreSQL, Storage) และ deploy ได้บน Vercel

## ก่อนเริ่ม
- บัญชี Supabase และ Vercel
- VS Code
- อินเทอร์เน็ต
- ใช้เฉพาะ Supabase Project URL และ publishable/anon key ใน `config.js` เท่านั้น
- ห้ามใส่ `service_role` key ใน frontend

## A. ตั้งค่า Supabase
1. สร้างโปรเจกต์ที่ https://supabase.com/
2. ไปที่ SQL Editor > New query
3. เปิด `schema.sql` ในโฟลเดอร์นี้ คัดลอกทั้งหมดไปวาง แล้วกด Run
4. ไปที่ Project Settings > API แล้วคัดลอก Project URL และ publishable/anon key
5. เปิด `config.js` แล้วใส่ค่า:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - BANK_NAME
   - BANK_ACCOUNT
   - BANK_OWNER
6. ไปที่ Authentication > URL Configuration:
   - ตั้ง Site URL เป็น URL ที่ใช้จริง (ตอนพัฒนาท้องถิ่นใช้ http://localhost:5500)
   - เพิ่ม Redirect URL ที่จำเป็น เช่น http://localhost:5500/** และ URL Vercel ของคุณ
7. สำหรับทดสอบ สมัครบัญชีผ่านหน้าเว็บก่อน หากเปิด email confirmation ให้ยืนยันอีเมลด้วย

## B. ให้บัญชีของคุณเป็น Admin
1. สมัครบัญชีลูกค้าจากหน้า index.html ด้วยอีเมลของคุณ
2. ไปที่ Supabase > SQL Editor
3. รันคำสั่งนี้ โดยเปลี่ยนอีเมลให้เป็นอีเมลที่สมัคร:
   update public.profiles
   set role='admin'
   where id=(select id from auth.users where email='YOUR_EMAIL');
4. ออกจากระบบแล้วเข้าสู่ระบบใหม่
5. เปิด admin.html เพื่อจัดการร้าน
6. ห้ามให้สิทธิ์ admin กับบัญชีที่ไม่ใช่เจ้าของร้าน

## C. เพิ่มสินค้า
1. เข้า admin.html ด้วยบัญชี Admin
2. ใส่ชื่อ ราคา หมวดหมู่ จำนวนสต็อก และ URL รูปภาพ HTTPS
3. กดบันทึกสินค้า สินค้าจะปรากฏในหน้าร้าน
4. URL รูปภาพต้องเป็นลิงก์รูปที่เข้าถึงได้จากเบราว์เซอร์

## D. ทดลองใน VS Code
1. เปิดโฟลเดอร์นี้ใน VS Code
2. ติดตั้งส่วนขยาย Live Server
3. คลิกขวา index.html > Open with Live Server
4. เปิด admin.html ในแท็บใหม่เพื่อทดสอบหลังตั้ง role admin แล้ว
5. ถ้าเปิด email confirmation ต้องยืนยันอีเมลก่อน login ได้

## E. นำขึ้นออนไลน์ด้วย Vercel (เริ่มต้นได้ด้วยแผนฟรี)
1. สร้าง GitHub repository แล้วอัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้
2. เข้า https://vercel.com/ แล้ว Sign up ด้วย GitHub
3. กด Add New > Project แล้วเลือก repository
4. Framework Preset เลือก Other; Build Command และ Output Directory เว้นว่าง (ไฟล์ static)
5. กด Deploy
6. นำ URL ที่ Vercel ให้ไปใส่ใน Supabase Authentication > URL Configuration เป็น Site URL และ Redirect URL
7. ทดสอบสมัครสมาชิก สั่งซื้อ และหน้า Admin จาก URL จริง

## ระบบทำงานอย่างไร
- ข้อมูลสินค้าและออเดอร์เก็บใน Supabase ไม่ได้เก็บแค่ในเครื่องลูกค้า
- ลูกค้าต้องสมัครสมาชิก/เข้าสู่ระบบก่อนสั่งซื้อ
- การสร้างออเดอร์เรียก SQL RPC `place_verse_order` ซึ่งตรวจราคาและสต็อกจากฐานข้อมูลเอง คำนวณยอด และตัดสต็อกใน transaction
- สลิปเก็บใน private Storage bucket และ Admin เปิดดูผ่าน signed URL อายุ 90 วินาที
- Row Level Security จำกัดลูกค้าให้เห็นเฉพาะออเดอร์/สลิปของตนเอง และจำกัดการจัดการสินค้า/ออเดอร์ให้ Admin
- สถานะออเดอร์: รอตรวจสอบสลิป > ชำระเงินแล้ว > กำลังจัดส่ง > จัดส่งสำเร็จ (หรือยกเลิก)

## สำคัญก่อนเปิดขายจริง
1. แก้ข้อมูลบัญชีธนาคารใน config.js ให้ถูกต้อง
2. ตรวจสอบเงื่อนไขทางกฎหมาย ภาษี นโยบายคืนสินค้า และประกาศความเป็นส่วนตัวของร้าน
3. ทดสอบการสั่งซื้อด้วยบัญชีลูกค้าทดสอบและตรวจสอบว่า Admin เห็นออเดอร์และเปิดสลิปได้
4. อย่าใช้ภาพ/ข้อความที่ไม่มีสิทธิ์ใช้งาน
5. แผนฟรีมีโควตาและเงื่อนไขการพักโปรเจกต์/จำกัดการใช้งาน เปลี่ยนแปลงได้ ตรวจสอบราคาและข้อจำกัดจากผู้ให้บริการก่อนเปิดร้าน
6. การแนบสลิปและการโอนเงินในชุดนี้เป็นการตรวจสอบโดย Admin ด้วยตนเอง ยังไม่มีการยืนยันยอดจากธนาคารอัตโนมัติ
7. ก่อนเปิดขายจริง แนะนำเพิ่มระบบแจ้งเตือนออเดอร์, สำรองข้อมูล, rate limiting/CAPTCHA, การตรวจสลิปปลอม และระบบ log/monitoring

## ขอบเขตที่ยังไม่ได้รวม
- ไม่มี gateway บัตร/QR payment อัตโนมัติ
- ไม่มีระบบส่งอีเมลยืนยันออเดอร์
- ไม่มีระบบขนส่ง/เลขพัสดุ
- ไม่มีการจัดการตัวเลือกไซซ์/สีแยกสต็อกในฐานข้อมูล (เริ่มต้นใช้สินค้าแบบ SKU เดียว)
- ระบบนี้เป็น starter สำหรับนำไปตั้งค่าและทดสอบ ไม่ใช่การรับประกันว่าพร้อมเปิดรับเงินจริงโดยไม่ทดสอบ
