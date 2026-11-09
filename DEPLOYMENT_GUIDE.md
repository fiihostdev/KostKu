# PANDUAN DEPLOYMENT LENGKAP: SUPABASE + VERCEL + COOLIFY (BOT NOTIFIKASI)

Panduan arsitektur produksi untuk sistem SaaS Multi-Tenant **KOSTKU**.

---

## 1. SETUP DATABASE (SUPABASE)

1. Buka [Supabase Dashboard](https://supabase.com/dashboard) dan buat project baru.
2. Masuk ke menu **SQL Editor**.
3. Buka file `supabase_schema.sql` yang ada di proyek ini, salin seluruh kodenya, lalu klik **Run**.
4. Masuk ke menu **Project Settings -> API**:
   - Salin **Project URL**
   - Salin **anon/public Key**
   - Salin **service_role Key** (Penting: Hanya untuk bot Coolify dan backend Next.js).

---

## 2. DEPLOY FRONTEND SAAS (VERCEL)

1. Pastikan kode Anda sudah di-push ke GitHub / GitLab:
   ```bash
   git add .
   git commit -m "feat: setup supabase, vercel, and coolify bot architecture"
   git push origin master
   ```
2. Buka [Vercel Dashboard](https://vercel.com) -> **Add New...** -> **Project**.
3. Import repositori GitHub Anda.
4. Pada bagian **Environment Variables**, tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL`: `URL project Supabase Anda`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `anon key Supabase Anda`
   - `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`: `Client Key Midtrans Anda`
   - `MIDTRANS_SERVER_KEY`: `Server Key Midtrans Anda`
   - `NOTIFICATION_BOT_URL`: `https://domain-bot-anda-di-coolify.com/api/send-notification`
   - `NOTIFICATION_BOT_SECRET`: `kunci_rahasia_kostku_2026`
5. Klik **Deploy**. Website Anda langsung aktif dengan domain otomatis `https://xxx.vercel.app` atau custom domain Anda.

---

## 3. DEPLOY BOT NOTIFIKASI WHATSAPP DI COOLIFY (NODE.JS)

Folder `coolify-bot` telah disiapkan dengan Dockerfile dan Express server lengkap.

### Langkah di Dashboard Coolify:
1. Masuk ke Coolify Dashboard Anda.
2. Pilih Project / Environment -> **New Resource** -> **Public/Private Repository** (atau Dockerfile).
3. Arahkan direktori root aplikasi ke: `/coolify-bot` (Base Directory).
4. Masukkan **Environment Variables** di Coolify:
   - `PORT`: `4000`
   - `SUPABASE_URL`: `https://xxxxxxxxxxxx.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: `ey... (service_role key)`
   - `BOT_API_SECRET`: `kunci_rahasia_kostku_2026`
   - `WA_GATEWAY_URL`: `https://api.fonnte.com/send` (atau gateway WA pilihan Anda)
   - `WA_GATEWAY_TOKEN`: `token-wa-gateway-anda`
5. Klik **Deploy**. Coolify akan otomatis membangun container Docker dan menyalakan bot.
6. Buat Domain Proxy di Coolify (misal `bot.kostku.id` atau gunakan domain internal/tunnel).

### Fitur Otomatis Bot Coolify:
- **Instant Dispatch**: Menerima request dari Vercel untuk mengirimkan invoice atau tanda terima seketika.
- **Auto CRON (Setiap Hari Pukul 08:00 WIB)**: Mengecek tabel Supabase untuk tagihan yang mencapai tanggal jatuh tempo dan mengirimkan pesan WA santun ke nomor penyewa.
- **Log Database**: Setiap pengiriman berhasil/gagal tercatat rapi di tabel `notification_queue` di Supabase.

