/**
 * KOSTKU WA Bot — Self-hosted dengan Baileys
 * Tidak memerlukan WA Gateway berbayar
 * Scan QR Code sekali → Bot aktif permanen
 */

process.on("uncaughtException", (err) => {
  console.error("[FATAL]", err.message, err.stack);
});
process.on("unhandledRejection", (reason) => {
  console.error("[UNHANDLED]", reason);
});

const express = require("express");
const cron = require("node-cron");
const qrcode = require("qrcode");
const WebSocket = require("ws");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const fs = require("fs");

// ── Baileys Import ────────────────────────────────────────────────────────────
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  jidNormalizedUser,
} = require("@whiskeysockets/baileys");
const pino = require("pino");

// ── Express Setup ─────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

const PORT = process.env.PORT || 4000;
const BOT_SECRET = process.env.BOT_API_SECRET || "kostku_wa_secret_2026_fiihost";
const AUTH_DIR = process.env.AUTH_DIR || "./wa_auth";

// ── Supabase ──────────────────────────────────────────────────────────────────
let supabase = null;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { realtime: { transport: WebSocket }, auth: { persistSession: false } }
    );
    console.log("✅ Supabase: connected");
  }
} catch (e) {
  console.error("Supabase init error:", e.message);
}

// ── State Bot ─────────────────────────────────────────────────────────────────
let sock = null;
let qrCodeData = null;       // QR dalam format base64 (untuk ditampilkan di browser)
let qrCodeString = null;     // QR string mentah
let botStatus = "disconnected"; // disconnected | connecting | qr_ready | connected
let connectedPhone = null;
let reconnectTimer = null;

// ── Helper: format nomor telepon ──────────────────────────────────────────────
function toJid(phone) {
  let n = (phone || "").replace(/[^0-9]/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  if (!n.endsWith("@s.whatsapp.net")) n = n + "@s.whatsapp.net";
  return n;
}

// ── Auth middleware ───────────────────────────────────────────────────────────
function auth(req, res, next) {
  const token = (req.headers["authorization"] || "").replace("Bearer ", "");
  if (token !== BOT_SECRET) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// ── Kirim pesan WA ────────────────────────────────────────────────────────────
async function sendMessage(phone, text) {
  if (!sock || botStatus !== "connected") {
    return { success: false, error: `Bot tidak terhubung. Status: ${botStatus}` };
  }

  try {
    const jid = toJid(phone);
    await sock.sendMessage(jid, { text });
    console.log(`📱 WA terkirim -> ${phone}`);
    return { success: true };
  } catch (err) {
    console.error(`❌ Gagal kirim WA -> ${phone}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ── Log ke Supabase notification_queue ───────────────────────────────────────
async function logNotification(data) {
  if (!supabase) return;
  try {
    await supabase.from("notification_queue").insert(data);
  } catch (e) {
    console.error("DB log error:", e.message);
  }
}

// ── Inisialisasi Baileys WA Connection ───────────────────────────────────────
async function connectWA() {
  console.log("🔄 Menghubungkan ke WhatsApp...");
  botStatus = "connecting";
  qrCodeData = null;
  qrCodeString = null;

  // Pastikan direktori auth ada
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  console.log(`📦 Baileys version: ${version.join(".")}`);

  sock = makeWASocket({
    version,
    auth: state,
    // Logger minimal agar log tidak terlalu verbose di Coolify
    logger: pino({ level: "silent" }),
    printQRInTerminal: true,
    browser: ["KOSTKU Bot", "Chrome", "1.0.0"],
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 30000,
    keepAliveIntervalMs: 25000,
    retryRequestDelayMs: 2000,
    maxMsgRetryCount: 5,
  });

  // ── Event: QR Code muncul (perlu di-scan) ──────────────────────────────────
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      botStatus = "qr_ready";
      qrCodeString = qr;
      try {
        qrCodeData = await qrcode.toDataURL(qr, { width: 256 });
      } catch (e) {
        console.error("QR gen error:", e.message);
      }
      console.log("📱 QR Code tersedia — buka /qr untuk scan");
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`🔌 Koneksi terputus (${statusCode}). Reconnect: ${shouldReconnect}`);

      botStatus = "disconnected";
      qrCodeData = null;
      connectedPhone = null;

      if (shouldReconnect) {
        // Auto-reconnect setelah 5 detik
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connectWA, 5000);
      } else {
        // Logged out — hapus auth dan minta scan ulang
        console.log("🚪 Bot logged out — hapus auth dan restart untuk scan ulang");
        try {
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        } catch {}
        botStatus = "logged_out";
      }
    }

    if (connection === "open") {
      botStatus = "connected";
      qrCodeData = null;
      qrCodeString = null;
      connectedPhone = jidNormalizedUser(sock.user?.id || "");
      console.log(`✅ Bot WhatsApp terhubung! Nomor: ${connectedPhone}`);
    }
  });

  // ── Event: Simpan credentials ──────────────────────────────────────────────
  sock.ev.on("creds.update", saveCreds);

  // ── Event: Pesan masuk (optional — untuk fitur balas otomatis) ──────────────
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const from = msg.key.remoteJid;
      const body =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        "";

      console.log(`📩 Pesan masuk dari ${from}: ${body.slice(0, 80)}`);

      // Auto-reply sederhana
      if (body.toLowerCase().includes("info") || body.toLowerCase().includes("tagihan")) {
        await sock.sendMessage(from, {
          text: "Halo! 👋 Untuk info tagihan sewa, silakan hubungi pengelola kost Anda atau kunjungi website kost di platform KOSTKU.",
        });
      }
    }
  });
}

// ── ROUTES ────────────────────────────────────────────────────────────────────

// ── QR Image (binary PNG) — dipanggil dari Next.js proxy ─────────────────────
// Berbeda dengan /qr (HTML page), endpoint ini return image/png mentah
// Digunakan agar QR bisa di-embed langsung di <img> tag di dashboard admin
app.get("/qr-image", (req, res) => {
  if (botStatus === "connected") {
    // Bot sudah terhubung — return 204 (no content) agar front-end tahu
    return res.status(204).end();
  }

  if (botStatus === "qr_ready" && qrCodeData) {
    // qrCodeData = "data:image/png;base64,iVBORw..." — ambil bagian base64-nya
    const base64 = qrCodeData.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(base64, "base64");
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.send(buffer);
  }

  // QR belum siap (connecting / disconnected)
  return res.status(204).end();
});

// Root / Health check
app.get("/", (req, res) => {
  res.json({
    service: "KOSTKU WA Bot (Baileys)",
    version: "3.0.0",
    status: botStatus,
    phone: connectedPhone || null,
    qr_available: !!qrCodeData,
    supabase: !!supabase,
    uptime: Math.floor(process.uptime()) + "s",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => res.json({ status: "ok", bot: botStatus }));

// ── QR Code Page (untuk scan pertama kali) ────────────────────────────────────
app.get("/qr", (req, res) => {
  if (botStatus === "connected") {
    return res.send(`
      <html><head><title>KOSTKU WA Bot</title>
      <meta http-equiv="refresh" content="10">
      <style>body{font-family:sans-serif;text-align:center;padding:40px;background:#e6e9ec}</style>
      </head><body>
      <h2>✅ Bot WhatsApp Terhubung!</h2>
      <p>Nomor aktif: <strong>${connectedPhone}</strong></p>
      <p style="color:green">Bot siap mengirim notifikasi tagihan.</p>
      </body></html>
    `);
  }

  if (botStatus === "qr_ready" && qrCodeData) {
    return res.send(`
      <html><head><title>Scan QR - KOSTKU WA Bot</title>
      <meta http-equiv="refresh" content="30">
      <style>
        body{font-family:sans-serif;text-align:center;padding:40px;background:#e6e9ec}
        img{border:4px solid #3525cd;border-radius:12px;padding:8px;background:white}
        .badge{background:#3525cd;color:white;padding:8px 16px;border-radius:20px;font-size:12px;display:inline-block;margin:8px}
      </style>
      </head><body>
      <h2>📱 Scan QR Code dengan WhatsApp</h2>
      <span class="badge">● QR Aktif</span>
      <br><br>
      <img src="${qrCodeData}" width="260" alt="QR Code"/>
      <br><br>
      <p>Buka WhatsApp → Menu ⋮ → Linked Devices → Link a Device</p>
      <p style="color:#666;font-size:12px">Halaman refresh otomatis setiap 30 detik</p>
      </body></html>
    `);
  }

  return res.send(`
    <html><head><title>KOSTKU WA Bot</title>
    <meta http-equiv="refresh" content="5">
    <style>body{font-family:sans-serif;text-align:center;padding:40px;background:#e6e9ec}</style>
    </head><body>
    <h2>⏳ Bot sedang menghubungkan...</h2>
    <p>Status: <strong>${botStatus}</strong></p>
    <p style="color:#666;font-size:12px">Halaman refresh otomatis setiap 5 detik</p>
    </body></html>
  `);
});

// ── Kirim Notifikasi (dipanggil dari Vercel) ──────────────────────────────────
app.post("/api/send-notification", auth, async (req, res) => {
  const { phone, name, message, invoiceId, kostId } = req.body || {};

  if (!phone || !message) {
    return res.status(400).json({ error: "phone & message wajib diisi" });
  }

  const result = await sendMessage(phone, message);

  // Log ke Supabase
  await logNotification({
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

// ── Broadcast ke semua penyewa 1 kost ────────────────────────────────────────
app.post("/api/broadcast", auth, async (req, res) => {
  const { kostId, message } = req.body || {};

  if (!kostId || !message) {
    return res.status(400).json({ error: "kostId & message wajib diisi" });
  }

  if (!supabase) {
    return res.status(503).json({ error: "Supabase tidak terkonfigurasi" });
  }

  if (botStatus !== "connected") {
    return res.status(503).json({ error: `Bot belum terhubung. Status: ${botStatus}` });
  }

  const { data: tenants, error } = await supabase
    .from("tenants")
    .select("nama, phone")
    .eq("kost_id", kostId);

  if (error) return res.status(500).json({ error: error.message });

  const results = [];
  for (const t of tenants || []) {
    const personalMsg = message.replace("{nama}", t.nama);
    const r = await sendMessage(t.phone, personalMsg);
    results.push({ nama: t.nama, phone: t.phone, ...r });
    await new Promise((resolve) => setTimeout(resolve, 1200)); // delay antar pesan
  }

  res.json({ success: true, sent: results.length, results });
});

// ── Reset / Logout Bot (untuk ganti nomor WA) ─────────────────────────────────
app.post("/api/reset", auth, async (req, res) => {
  console.log("🔄 Reset bot diminta...");

  if (sock) {
    try { await sock.logout(); } catch {}
    sock = null;
  }

  try {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  } catch {}

  botStatus = "disconnected";
  connectedPhone = null;
  qrCodeData = null;

  // Reconnect untuk generate QR baru
  setTimeout(connectWA, 2000);

  res.json({ success: true, message: "Bot di-reset. Buka /qr untuk scan ulang." });
});

// ── CRON: Reminder tagihan jatuh tempo — 08:00 WIB (01:00 UTC) ───────────────
cron.schedule("0 1 * * *", async () => {
  if (!supabase || botStatus !== "connected") {
    console.log(`[CRON] Skip: supabase=${!!supabase}, bot=${botStatus}`);
    return;
  }

  console.log("[CRON] Cek tagihan jatuh tempo...");
  const today = new Date().toISOString().split("T")[0];

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*, kost_profiles!inner(nama, telepon)")
    .eq("status", "Menunggu")
    .lte("jatuh_tempo", today);

  let count = 0;
  for (const inv of invoices || []) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("phone")
      .eq("nama", inv.penyewa)
      .eq("kost_id", inv.kost_id)
      .single();

    if (!tenant?.phone) continue;

    // Ambil template dari Supabase (jika ada) atau pakai default
    const template = inv.kost_profiles?.wa_template ||
      `🏠 *Pengingat Tagihan Sewa*\n*{nama_kost}*\n\nHalo *{nama_penyewa}*, tagihan sewa *{kamar}* sebesar *Rp {nominal}* jatuh tempo *{tanggal}*.\n\nNo: \`{no_invoice}\`\n\nMohon segera bayar. Terima kasih! 🙏`;

    const msg = template
      .replace("{nama_kost}", inv.kost_profiles?.nama || "KOSTKU")
      .replace("{nama_penyewa}", inv.penyewa)
      .replace("{kamar}", inv.kamar)
      .replace("{nominal}", Number(inv.nominal).toLocaleString("id-ID"))
      .replace("{tanggal}", inv.jatuh_tempo)
      .replace("{no_invoice}", inv.no_invoice);

    const result = await sendMessage(tenant.phone, msg);

    if (result.success) {
      await supabase.from("invoices")
        .update({ status: "Jatuh Tempo" })
        .eq("id", inv.id);
      count++;
    }

    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log(`[CRON] Selesai — ${count} reminder terkirim`);
});

// ── Start ─────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log("================================================");
  console.log(`  KOSTKU WA Bot (Baileys) — Port ${PORT}`);
  console.log(`  QR Page: http://localhost:${PORT}/qr`);
  console.log(`  Health:  http://localhost:${PORT}/health`);
  console.log("================================================");

  // Start koneksi WA
  connectWA().catch((e) => console.error("connectWA error:", e.message));
});
