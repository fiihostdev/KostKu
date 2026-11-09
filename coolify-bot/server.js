const http = require("http");
const express = require("express");
const cron = require("node-cron");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Bot-Secret");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

const PORT = process.env.PORT || 4000;
const BOT_API_SECRET = process.env.BOT_API_SECRET || "kostku_wa_secret_2026_fiihost";

// Supabase
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

// Format nomor HP
function sanitizePhone(phone) {
  let n = phone.replace(/[^0-9]/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  return n;
}

// Kirim WA via gateway atau simulasi
async function sendWA(phone, message) {
  const cleanPhone = sanitizePhone(phone);
  const waUrl = process.env.WA_GATEWAY_URL;
  const waToken = process.env.WA_GATEWAY_TOKEN;

  if (waUrl && waToken) {
    try {
      const resp = await fetch(waUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": waToken },
        body: JSON.stringify({ target: cleanPhone, message }),
      });
      const data = await resp.json();
      console.log(`WA sent to ${cleanPhone}`);
      return { success: true, data };
    } catch (err) {
      console.error(`WA failed to ${cleanPhone}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  // Simulasi
  console.log(`[SIM WA] -> ${cleanPhone}: ${message.slice(0, 80)}...`);
  return { success: true, simulated: true };
}

// Auth middleware
function auth(req, res, next) {
  const token = (req.headers["authorization"] || "").replace("Bearer ", "");
  if (token !== BOT_API_SECRET) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// ── Routes ──────────────────────────────────────────────────────────────────

app.get("/", (req, res) => res.json({
  status: "online",
  service: "KOSTKU WA Bot",
  version: "2.1.0",
  supabase: !!supabase,
  wa_gateway: !!(process.env.WA_GATEWAY_URL),
  timestamp: new Date().toISOString(),
}));

app.get("/health", (req, res) => res.json({ status: "ok" }));

// Kirim notifikasi ke 1 nomor
app.post("/api/send-notification", auth, async (req, res) => {
  const { phone, name, message, invoiceId, kostId } = req.body;
  if (!phone || !message) return res.status(400).json({ error: "phone & message required" });

  const result = await sendWA(phone, message);

  if (supabase) {
    await supabase.from("notification_queue").insert({
      kost_id: kostId || null,
      recipient_phone: phone,
      recipient_name: name || "Penyewa",
      message_text: message,
      invoice_id: invoiceId || null,
      status: result.success ? "SENT" : "FAILED",
      sent_at: result.success ? new Date().toISOString() : null,
      error_message: result.error || null,
    }).catch(console.error);
  }

  res.json(result);
});

// Broadcast ke semua penyewa kost
app.post("/api/broadcast", auth, async (req, res) => {
  const { kostId, message } = req.body;
  if (!kostId || !message) return res.status(400).json({ error: "kostId & message required" });
  if (!supabase) return res.status(503).json({ error: "Supabase not configured" });

  const { data: tenants } = await supabase.from("tenants").select("nama, phone").eq("kost_id", kostId);
  const results = [];
  for (const t of (tenants || [])) {
    const r = await sendWA(t.phone, message.replace("{nama}", t.nama));
    results.push({ nama: t.nama, ...r });
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  res.json({ success: true, sent: results.length, results });
});

// ── CRON: Reminder tagihan jatuh tempo, setiap hari 08:00 WIB (01:00 UTC) ──
cron.schedule("0 1 * * *", async () => {
  if (!supabase) return;
  console.log("[CRON] Checking overdue invoices...");
  const today = new Date().toISOString().split("T")[0];

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*, kost_profiles!inner(nama, telepon)")
    .eq("status", "Menunggu")
    .lte("jatuh_tempo", today);

  for (const inv of (invoices || [])) {
    const { data: tenant } = await supabase.from("tenants").select("phone")
      .eq("nama", inv.penyewa).eq("kost_id", inv.kost_id).single();
    if (!tenant?.phone) continue;

    const msg = `🏠 *Pengingat Tagihan - ${inv.kost_profiles?.nama}*\n\n` +
      `Halo *${inv.penyewa}*, tagihan sewa ${inv.kamar} sebesar *Rp ${Number(inv.nominal).toLocaleString("id-ID")}* ` +
      `jatuh tempo ${inv.jatuh_tempo}.\n\nNo: \`${inv.no_invoice}\`\n\nMohon segera bayar. 🙏`;

    await sendWA(tenant.phone, msg);
    await supabase.from("invoices").update({ status: "Jatuh Tempo" }).eq("id", inv.id);
    await new Promise(r => setTimeout(r, 1500));
  }
  console.log(`[CRON] Done. ${(invoices || []).length} reminders sent.`);
});

// ── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log("================================================");
  console.log(`KOSTKU WA Bot running on port ${PORT}`);
  console.log(`Supabase: ${supabase ? "connected" : "simulation mode"}`);
  console.log(`WA Gateway: ${process.env.WA_GATEWAY_URL ? "configured" : "simulation mode"}`);
  console.log("================================================");
});
