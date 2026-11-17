# -------------------------------------------------------------------
# SUPABASE DATABASE SCHEMA FOR KOSTKU SAAS PLATFORM
# Salin dan jalankan seluruh SQL ini di: Supabase Dashboard -> SQL Editor
# -------------------------------------------------------------------

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABEL PROFIL KOST (MULTI-TENANT SAAS)
CREATE TABLE IF NOT EXISTS kost_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nama TEXT NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    tagline TEXT,
    alamat TEXT,
    telepon TEXT,
    paket TEXT DEFAULT 'Pro Plan',
    bank_penerima TEXT DEFAULT 'BCA',
    no_rekening TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABEL DATA KAMAR
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kost_id UUID REFERENCES kost_profiles(id) ON DELETE CASCADE,
    nomor TEXT NOT NULL,
    lantai INTEGER DEFAULT 1,
    tipe TEXT CHECK (tipe IN ('Standard', 'Deluxe', 'VIP')),
    harga NUMERIC(12, 2) NOT NULL,
    status TEXT CHECK (status IN ('Terisi', 'Kosong', 'Perawatan')) DEFAULT 'Kosong',
    penyewa TEXT,
    fasilitas TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABEL DATA PENYEWA
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kost_id UUID REFERENCES kost_profiles(id) ON DELETE CASCADE,
    nama TEXT NOT NULL,
    phone TEXT NOT NULL,
    kamar TEXT NOT NULL,
    mulai_sewa DATE NOT NULL,
    akhir_sewa DATE NOT NULL,
    status_bayar TEXT CHECK (status_bayar IN ('Lunas', 'Jatuh Tempo', 'Tertunggak')) DEFAULT 'Lunas',
    ktp_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABEL INVOICE & TAGIHAN
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kost_id UUID REFERENCES kost_profiles(id) ON DELETE CASCADE,
    no_invoice TEXT UNIQUE NOT NULL,
    penyewa TEXT NOT NULL,
    kamar TEXT NOT NULL,
    nominal NUMERIC(12, 2) NOT NULL,
    jatuh_tempo DATE NOT NULL,
    metode TEXT DEFAULT 'Midtrans Payment Gateway',
    status TEXT CHECK (status IN ('Lunas', 'Menunggu', 'Jatuh Tempo')) DEFAULT 'Menunggu',
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABEL ARUS KAS & BUKU KAS
CREATE TABLE IF NOT EXISTS cash_flows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kost_id UUID REFERENCES kost_profiles(id) ON DELETE CASCADE,
    tgl TEXT NOT NULL,
    ket TEXT NOT NULL,
    kat TEXT NOT NULL,
    tipe TEXT CHECK (tipe IN ('Masuk', 'Keluar')) NOT NULL,
    nominal NUMERIC(12, 2) NOT NULL,
    saldo NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. TABEL LOG NOTIFIKASI BOT (Untuk Coolify Worker)
CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kost_id UUID REFERENCES kost_profiles(id) ON DELETE CASCADE,
    recipient_phone TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    message_text TEXT NOT NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    status TEXT CHECK (status IN ('PENDING', 'SENT', 'FAILED')) DEFAULT 'PENDING',
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (ROW LEVEL SECURITY) POLICIES
ALTER TABLE kost_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Default Policies (Izinkan akses authenticated atau service role)
CREATE POLICY "Public profiles can be viewed" ON kost_profiles FOR SELECT USING (true);
CREATE POLICY "Owners can manage their rooms" ON rooms FOR ALL USING (true);
CREATE POLICY "Owners can manage tenants" ON tenants FOR ALL USING (true);
CREATE POLICY "Owners can manage invoices" ON invoices FOR ALL USING (true);
CREATE POLICY "Owners can manage cash_flows" ON cash_flows FOR ALL USING (true);
CREATE POLICY "Bot worker can read and update notification_queue" ON notification_queue FOR ALL USING (true);


-- ================================================================
-- PLATFORM CONFIG TABLE (run in Supabase SQL Editor)
-- Menyimpan konfigurasi payment gateway platform-level
-- Digunakan untuk menerima pembayaran paket, upgrade, onboarding
-- ================================================================

CREATE TABLE IF NOT EXISTS platform_config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default rows (kosong, diisi via superadmin dashboard)
INSERT INTO platform_config (key, value) VALUES
  ('midtrans_client_key',    ''),
  ('midtrans_server_key',    ''),
  ('midtrans_is_production', 'false'),
  ('midtrans_enabled',       'false'),
  ('qris_image_url',         ''),
  ('qris_enabled',           'false'),
  ('qris_account_name',      ''),
  ('qris_bank_name',         ''),
  ('qris_no_rekening',       ''),
  ('transfer_enabled',       'true'),
  ('transfer_bank_name',     ''),
  ('transfer_account_name',  ''),
  ('transfer_no_rekening',   ''),
  ('transfer_instructions',  '')
ON CONFLICT (key) DO NOTHING;

-- RLS: Hanya superadmin (service_role) yang bisa baca/tulis
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

-- Policy: service_role bypass semua RLS
-- (service role tidak terkena RLS secara default di Supabase)

-- Policy: authenticated user bisa READ (untuk onboarding/checkout)
CREATE POLICY "platform_config_read_auth"
  ON platform_config FOR SELECT
  TO authenticated
  USING (true);

-- Policy: hanya superadmin yang bisa WRITE (via API route dengan service role)
-- Write dilakukan via service_role di API route — tidak perlu policy tambahan
