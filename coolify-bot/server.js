require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cron = require("node-cron");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;
const BOT_API_SECRET = process.env.BOT_API_SECRET || "kunci_rahasia_kostku_2026";

// Supabase Admin Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log(" Connected to Supabase Database");
} else {
  console.warn("⚠️ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diisi. Menjalankan mode simulasi.");
}

// Helper: Format phone number ke format WhatsApp internasional
function sanitizePhone(phone) {
  let cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  }
  return cleaned;
}

// Helper: Kirim Pesan WhatsApp via Provider Gateway
async function sendWhatsAppMessage(targetPhone, message) {
  const cleanPhone = sanitizePhone(targetPhone);
  const waUrl = process.env.WA_GATEWAY_URL;
  const waToken = process.env.WA_GATEWAY_TOKEN;

  if (waUrl && waToken) {
    try {
      const response = await axios.post(
        waUrl,
        {
          target: cleanPhone,
          message: message,
        },
        {
          headers: {
            Authorization: waToken,
          },
        }
      );
      return { success: true, response: response.data };
    } catch (err) {
      console.error("❌ Gagal mengirim pesan via WhatsApp API:", err.message);
      return { success: false, error: err.message };
    }
  } else {
    // Mode Simulasi (Logging ke Coolify console)
    console.log(`[SIMULASI WA BOT] Ke: ${cleanPhone} | Pesan: "${message.replace(/\n/g, " ")}"`);
    return { success: true, simulated: true };
  }
}

// ---------------------------------------------------------
// 1. HEALTHCHECK ENDPOINT
// ---------------------------------------------------------
app.get("/health", (req, res) => {
  res.json({
    status: "online",
    service: "KOSTKU Notification Dispatcher (Coolify)",
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------
// 2. DISPATCH ENDPOINT: Kirim notifikasi instan dari Vercel
// ---------------------------------------------------------
app.post("/api/send-notification", async (req, res) => {
  const authHeader = req.headers["authorization"] || req.headers["x-bot-secret"];

  if (authHeader !== BOT_API_SECRET && authHeader !== `Bearer ${BOT_API_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized access token" });
  }

  const { phone, name, message, invoiceId, kostId } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ error: "phone dan message wajib diisi" });
  }

  const sendResult = await sendWhatsAppMessage(phone, message);

  // Rekam status ke tabel notification_queue di Supabase jika terhubung
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
      console.error("Failed to insert notification log:", dbErr.message);
    }
  }

  return res.json({
    success: sendResult.success,
    result: sendResult,
  });
});

// ---------------------------------------------------------
// 3. BACKGROUND CRON JOB: Otomatis periksa invoice jatuh tempo
// Berjalan setiap hari pukul 08:00 WIB (01:00 UTC)
// ---------------------------------------------------------
cron.schedule("0 1 * * *", async () => {
  console.log("⏰ [CRON] Menjalankan pengecekan tagihan jatuh tempo harian...");

  if (!supabase) {
    console.log("CRON dilewati: Supabase belum dikonfigurasi.");
    return;
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    
    // Ambil invoice berstatus Menunggu yang jatuh temponya hari ini atau lewat
    const { data: overdueInvoices, error } = await supabase
      .from("invoices")
      .select("*, kost_profiles(nama, telepon)")
      .eq("status", "Menunggu")
      .lte("jatuh_tempo", today);

    if (error) throw error;

    console.log(`Ditemukan ${overdueInvoices.length} tagihan yang perlu diingatkan.`);

    for (const inv of overdueInvoices) {
      const msg = `🏠 *Pengingat Tagihan Sewa - ${inv.kost_profiles?.nama || "KOSTKU"}*\n\nHalo Sdr/i ${inv.penyewa},\n\nTagihan sewa untuk *${inv.kamar}* sebesar *Rp ${Number(inv.nominal).toLocaleString("id-ID")}* telah mencapai tanggal jatuh tempo (${inv.jatuh_tempo}).\n\nNo Invoice: ${inv.no_invoice}\nSilakan melakukan pembayaran tepat waktu agar hunian tetap nyaman. Terima kasih! 🙏`;

      // Cari nomor telepon penyewa
      const { data: tenant } = await supabase
        .from("tenants")
        .select("phone")
        .eq("nama", inv.penyewa)
        .limit(1)
        .single();

      if (tenant && tenant.phone) {
        await sendWhatsAppMessage(tenant.phone, msg);
        console.log(` Notifikasi terkirim ke ${inv.penyewa} (${tenant.phone})`);
      }
    }
  } catch (err) {
    console.error("❌ Error saat eksekusi CRON jatuh tempo:", err.message);
  }
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🤖 KOSTKU Bot Service is running on port ${PORT}`);
  console.log(` Endpoint: http://localhost:${PORT}/health`);
  console.log(`===============================================`);
});

