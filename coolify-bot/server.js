process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT:", err.message);
});
process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED:", reason);
});

const express = require("express");
const cron = require("node-cron");
const WebSocket = require("ws");
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

// Supabase — gunakan ws package untuk Node.js < 22
let supabase = null;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        realtime: { transport: WebSocket },
        auth: { persistSession: false },
      }
    );
    console.log("Supabase: connected");
  } else {
    console.log("Supabase: simulation mode (env not set)");
  }
} catch (e) {
  console.error("Supabase init error:", e.message);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function sanitizePhone(phone) {
  let n = (phone || "").replace(/[^0-9]/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  return n;
}

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
        signal: AbortSignal.timeout(10000),
      });
      const data = await resp.json();
      console.log(`WA sent -> ${cleanPhone}`);
      return { success: true, data };
    } catch (err) {
      console.error(`WA failed -> ${cleanPhone}: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  // Simulasi — log ke Coolify console
  console.log(`[SIM WA] -> ${cleanPhone}: ${message.slice(0, 100)}...`);
  return { success: true, simulated: true };
}

function auth(req, res, next) {
  const token = (req.headers["authorization"] || "").replace("Bearer ", "");
  if (token !== BOT_API_SECRET) return res.status(401).json({ error: "Unauthorized" });
  next();
}

async function dbLog(data) {
  if (!supabase) return;
  supabase.from("notification_queue").insert(data).catch((e) =>
    console.error("DB log error:", e.message)
  );
}

// ── Routes ────────────────────────────────────────────────────────────────────

// Root & Health
app.get("/", (req, res) => res.json({
  status: "online",
  service: "KOSTKU WA Bot",
  version: "2.0.0",
  supabase: !!supabase,
  wa_gateway: !!(process.env.WA_GATEWAY_URL),
  node: process.version,
  uptime: Math.floor(process.uptime()) + "s",
  timestamp: new Date().toISOString(),
}));

app.get("/health", (req, res) => res.json({ status: "ok" }));

// Send single notification — dipanggil dari Vercel
app.post("/api/send-notification", auth, async (req, res) => {
  const { phone, name, message, invoiceId, kostId } = req.body || {};
  if (!phone || !message) return res.status(400).json({ error: "phone & message required" });

  const result = await sendWA(phone, message);

  await dbLog({
    kost_id: kostId || null,
    recipient_phone: phone,
    recipient_name: name || "Penyewa",
    message_text: message,
    invoice_id: invoiceId || null,
    status: result.success ? "SENT" : "FAILED",
    sent_at: result.success ? new Date().toISOString() : null,
    error_message: result.error || null,
  });

  res.json(result);
});

// Broadcast ke semua penyewa 1 kost
app.post("/api/broadcast", auth, async (req, res) => {
  const { kostId, message } = req.body || {};
  if (!kostId || !message) return res.status(400).json({ error: "kostId & message required" });
  if (!supabase) return res.status(503).json({ error: "Supabase not configured" });

  const { data: tenants, error } = await supabase
    .from("tenants")
    .select("nama, phone")
    .eq("kost_id", kostId);

  if (error) return res.status(500).json({ error: error.message });

  const results = [];
  for (const t of (tenants || [])) {
    const msg = message.replace("{nama}", t.nama);
    const r = await sendWA(t.phone, msg);
    results.push({ nama: t.nama, phone: t.phone, ...r });
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  res.json({ success: true, sent: results.length, results });
});

// ── CRON: Reminder tagihan jatuh tempo — setiap hari 08:00 WIB (01:00 UTC) ──
cron.schedule("0 1 * * *", async () => {
  if (!supabase) {
    console.log("[CRON] Skip: Supabase not configured");
    return;
  }

  console.log("[CRON] Checking overdue invoices...");
  const today = new Date().toISOString().split("T")[0];

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*, kost_profiles!inner(nama, telepon)")
    .eq("status", "Menunggu")
    .lte("jatuh_tempo", today);

  let count = 0;
  for (const inv of (invoices || [])) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("phone")
      .eq("nama", inv.penyewa)
      .eq("kost_id", inv.kost_id)
      .single();

    if (!tenant?.phone) continue;

    const msg =
      `🏠 *Pengingat Tagihan - ${inv.kost_profiles?.nama || "KOSTKU"}*\n\n` +
      `Halo *${inv.penyewa}*, tagihan sewa *${inv.kamar}* sebesar ` +
      `*Rp ${Number(inv.nominal).toLocaleString("id-ID")}* ` +
      `telah jatuh tempo pada *${inv.jatuh_tempo}*.\n\n` +
      `No. Invoice: \`${inv.no_invoice}\`\n\n` +
      `Mohon segera melakukan pembayaran. Terima kasih! 🙏`;

    await sendWA(tenant.phone, msg);
    await supabase.from("invoices").update({ status: "Jatuh Tempo" }).eq("id", inv.id);
    count++;
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log(`[CRON] Done — ${count} reminders sent.`);
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log("================================================");
  console.log(`  KOSTKU WA Bot  •  Port ${PORT}`);
  console.log(`  Node: ${process.version}`);
  console.log(`  Supabase: ${supabase ? "connected ✓" : "simulation mode"}`);
  console.log(`  WA Gateway: ${process.env.WA_GATEWAY_URL ? "configured ✓" : "simulation mode"}`);
  console.log("================================================");
});
