require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cron = require("node-cron");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.json());

// CORS agar bisa dipanggil dari Vercel
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Bot-Secret");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

const PORT = process.env.PORT || 4000;
const BOT_API_SECRET = process.env.BOT_API_SECRET || "kostku_wa_secret_2026_fiihost";

// ── Supabase Admin Client ─────────────────────────────────────────────────────
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

if (supabase) {
  console.log("✅ Terhubung ke Supabase Database");
} else {
  console.warn("⚠️  SUPABASE credentials belum diisi — mode simulasi aktif");
}

// ── Helper: Format nomor telepon ke format internasional ──────────────────────
function sanitizePhone(phone) {
  let cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) cleaned = "62" + cleaned.slice(1);
  return cleaned;
}

// ── Helper: Kirim pesan via WA Gateway ───────────────────────────────────────
async function sendWhatsAppMessage(targetPhone, message) {
  const cleanPhone = sanitizePhone(targetPhone);
  const waUrl = process.env.WA_GATEWAY_URL;
  const waToken = process.env.WA_GATEWAY_TOKEN;

  if (waUrl && waToken) {
    try {
      const response = await axios.post(
        waUrl,
        { target: cleanPhone, message },
        { headers: { Authorization: waToken }, timeout: 10000 }
      );
      console.log(`✅ WA terkirim ke ${cleanPhone}`);
      return { success: true, response: response.data };
    } catch (err) {
      console.error(`❌ Gagal kirim WA ke ${cleanPhone}:`, err.message);
      return { success: false, error: err.message };
    }
  } else {
    // Simulasi — log ke console Coolify
    console.log(`📱 [SIMULASI WA] → ${cleanPhone}`);
    console.log(`   Pesan: "${message.replace(/\n/g, " ").slice(0, 120)}..."`);
    return { success: true, simulated: true };
  }
}

// ── Middleware: Validasi secret token ────────────────────────────────────────
function requireSecret(req, res, next) {
  const auth = req.headers["authorization"] || req.headers["x-bot-secret"] || "";
  const token = auth.replace("Bearer ", "");
  if (token !== BOT_API_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// 1. Health check — dipanggil Coolify & Vercel untuk cek status bot
app.get("/health", (req, res) => {
  res.json({
    status: "online",
    service: "KOSTKU WA Bot (Coolify)",
    version: "2.0.0",
    supabase_connected: !!supabase,
    wa_gateway_configured: !!(process.env.WA_GATEWAY_URL),
    timestamp: new Date().toISOString(),
  });
});

// 2. Send Notification — dipanggil dari Vercel Next.js API route
//    Saat admin buat tagihan / klik "Kirim Tagihan via WA"
app.post("/api/send-notification", requireSecret, async (req, res) => {
  const { phone, name, message, invoiceId, kostId } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ error: "phone dan message wajib diisi" });
  }

  const sendResult = await sendWhatsAppMessage(phone, message);

  // Log ke Supabase notification_queue
  if (supabase) {
    try {
      await supabase.from("notification_queue").insert({
        kost_id: kostId || null,
        recipient_phone: phone,
        recipient_name: name || "Penyewa",
        message_text: message,
        invoice_id: invoiceId || null,
        status: sendResult.success ? "SENT" : "FAILED",
        sent_at: sendResult.success ? new Date().toISOString() : null,
        error_message: sendResult.error || null,
      });
    } catch (dbErr) {
      console.error("DB log error:", dbErr.message);
    }
  }

  return res.json({ success: sendResult.success, result: sendResult });
});

// 3. Broadcast — kirim ke semua penyewa dalam satu kost
app.post("/api/broadcast", requireSecret, async (req, res) => {
  const { kostId, message } = req.body;

  if (!kostId || !message) {
    return res.status(400).json({ error: "kostId dan message wajib diisi" });
  }

  if (!supabase) {
    return res.status(503).json({ error: "Supabase belum terkonfigurasi" });
  }

  const { data: tenants, error } = await supabase
    .from("tenants")
    .select("nama, phone")
    .eq("kost_id", kostId);

  if (error) return res.status(500).json({ error: error.message });

  const results = [];
  for (const tenant of tenants) {
    const personalMsg = message.replace("{nama}", tenant.nama);
    const result = await sendWhatsAppMessage(tenant.phone, personalMsg);
    results.push({ nama: tenant.nama, ...result });
    // Delay 1 detik antar pesan agar tidak spam
    await new Promise((r) => setTimeout(r, 1000));
  }

  return res.json({ success: true, sent: results.length, results });
});

// ─────────────────────────────────────────────────────────────────────────────
// CRON JOB: Pengingat tagihan jatuh tempo — setiap hari pukul 08:00 WIB
// ─────────────────────────────────────────────────────────────────────────────
cron.schedule("0 1 * * *", async () => {
  console.log("⏰ [CRON] Cek tagihan jatuh tempo...");

  if (!supabase) {
    console.log("⏭️  CRON skip: Supabase belum dikonfigurasi");
    return;
  }

  try {
    const today = new Date().toISOString().split("T")[0];

    // Ambil semua invoice yang belum lunas dan jatuh temponya hari ini / lewat
    const { data: invoices, error } = await supabase
      .from("invoices")
      .select("*, kost_profiles!inner(nama, telepon)")
      .eq("status", "Menunggu")
      .lte("jatuh_tempo", today);

    if (error) throw error;

    console.log(`📋 Ditemukan ${invoices.length} tagihan yang perlu diingatkan`);

    for (const inv of invoices) {
      // Cari nomor HP penyewa
      const { data: tenant } = await supabase
        .from("tenants")
        .select("phone")
        .eq("nama", inv.penyewa)
        .eq("kost_id", inv.kost_id)
        .limit(1)
        .single();

      if (!tenant?.phone) {
        console.log(`⚠️  Nomor HP tidak ditemukan untuk ${inv.penyewa}`);
        continue;
      }

      const msg =
        `🏠 *Pengingat Tagihan Sewa*\n` +
        `*${inv.kost_profiles?.nama || "KOSTKU"}*\n\n` +
        `Halo Sdr/i *${inv.penyewa}*,\n\n` +
        `Tagihan sewa ${inv.kamar} sebesar *Rp ${Number(inv.nominal).toLocaleString("id-ID")}* ` +
        `telah jatuh tempo pada ${inv.jatuh_tempo}.\n\n` +
        `No. Invoice: \`${inv.no_invoice}\`\n\n` +
        `Mohon segera melakukan pembayaran agar hunian tetap nyaman. 🙏\n\n` +
        `_Hubungi pengelola: ${inv.kost_profiles?.telepon || "-"}_`;

      await sendWhatsAppMessage(tenant.phone, msg);

      // Update status invoice ke "Jatuh Tempo"
      await supabase
        .from("invoices")
        .update({ status: "Jatuh Tempo" })
        .eq("id", inv.id);

      console.log(`✅ Reminder terkirim ke ${inv.penyewa}`);
      await new Promise((r) => setTimeout(r, 1500));
    }

    console.log("✅ [CRON] Selesai memproses semua tagihan jatuh tempo");
  } catch (err) {
    console.error("❌ [CRON] Error:", err.message);
  }
});

// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log("================================================");
  console.log(`🤖 KOSTKU WA Bot Service — Port ${PORT}`);
  console.log(`🌐 Health: http://localhost:${PORT}/health`);
  console.log(`📱 WA Gateway: ${process.env.WA_GATEWAY_URL ? "✅ Configured" : "⚠️  Not set (simulation mode)"}`);
  console.log("================================================");
});
