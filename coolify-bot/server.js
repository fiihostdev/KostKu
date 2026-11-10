/**
 * KOSTKU WA Bot — Self-hosted dengan Baileys
 * 
 * ALUR YANG BENAR:
 * 1. Saat server start → cek apakah ada session tersimpan di AUTH_DIR
 *    - Ada session → auto-reconnect (tidak perlu QR lagi)
 *    - Tidak ada session → idle, tidak connect
 * 2. Admin klik "Hubungkan WA" → panggil POST /api/start → generate QR
 * 3. Admin scan QR → connected, session tersimpan permanen
 * 4. Admin klik "Putuskan WA" → POST /api/reset → hapus session, kembali idle
 * 
 * TIDAK ADA auto-connect/generate QR tanpa permintaan dari admin.
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

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
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
let qrCodeData = null;    // base64 PNG untuk ditampilkan di dashboard
let botStatus = "idle";   // idle | connecting | qr_ready | connected | disconnected
let connectedPhone = null;
let reconnectTimer = null;
let isConnecting = false; // mencegah double-connect

// ── Helper: cek apakah session tersimpan ada ──────────────────────────────────
function hasSession() {
  try {
    const files = fs.readdirSync(AUTH_DIR);
    // Session valid jika ada file creds.json
    return files.some((f) => f === "creds.json");
  } catch {
    return false;
  }
}

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

// ── Log ke Supabase ───────────────────────────────────────────────────────────
async function logNotification(data) {
  if (!supabase) return;
  try {
    await supabase.from("notification_queue").insert(data);
  } catch (e) {
    console.error("DB log error:", e.message);
  }
}

// ── Core: Inisialisasi koneksi WA ─────────────────────────────────────────────
// Dipanggil hanya jika:
// 1. Ada session tersimpan (auto-reconnect saat server start)
// 2. Admin klik "Hubungkan WA" via POST /api/start
async function connectWA() {
  if (isConnecting) {
    console.log("⚠️  connectWA dipanggil saat masih connecting — diabaikan");
    return;
  }
  isConnecting = true;
  botStatus = "connecting";
  qrCodeData = null;

  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();
    console.log(`📦 Baileys version: ${version.join(".")}`);

    sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: "silent" }),
      // printQRInTerminal TIDAK dipakai — kita handle sendiri
      browser: ["KOSTKU Bot", "Chrome", "1.0.0"],
      connectTimeoutMs: 90000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 20000,
      retryRequestDelayMs: 3000,
      maxMsgRetryCount: 3,
    });

    // ── QR Code muncul ──────────────────────────────────────────────────────
    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        botStatus = "qr_ready";
        isConnecting = false;
        try {
          qrCodeData = await qrcode.toDataURL(qr, { width: 280, margin: 2 });
          console.log("📱 QR tersedia — menunggu scan dari admin dashboard");
        } catch (e) {
          console.error("QR gen error:", e.message);
        }
      }

      if (connection === "close") {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;

        console.log(`🔌 Koneksi terputus (${statusCode})`);
        isConnecting = false;
        qrCodeData = null;
        connectedPhone = null;

        if (isLoggedOut) {
          // Logout sengaja (admin klik "Putuskan") — hapus session, kembali idle
          console.log("🚪 Bot logged out — session dihapus, status: idle");
          try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch {}
          botStatus = "idle";
          sock = null;
        } else if (botStatus === "connected" || hasSession()) {
          // Sudah pernah connected dan disconnect tidak disengaja → reconnect
          console.log("🔄 Disconnect tidak disengaja — reconnect dalam 8 detik...");
          botStatus = "disconnected";
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(connectWA, 8000);
        } else {
          // Belum pernah connected, QR timeout / gagal — kembali idle
          // Admin harus klik tombol lagi untuk generate QR baru
          console.log("⏹️  QR timeout atau gagal connect — status: idle");
          botStatus = "idle";
          sock = null;
        }
      }

      if (connection === "open") {
        botStatus = "connected";
        isConnecting = false;
        qrCodeData = null;
        connectedPhone = jidNormalizedUser(sock.user?.id || "");
        console.log(`✅ Bot WhatsApp terhubung! Nomor: ${connectedPhone}`);
      }
    });

    sock.ev.on("creds.update", saveCreds);

    // ── Auto-reply sederhana ────────────────────────────────────────────────
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;
      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;
        const from = msg.key.remoteJid;
        const body =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text || "";
        if (body.toLowerCase().includes("info") || body.toLowerCase().includes("tagihan")) {
          await sock.sendMessage(from, {
            text: "Halo! 👋 Untuk info tagihan sewa, silakan hubungi pengelola kost Anda.",
          });
        }
      }
    });

  } catch (err) {
    console.error("connectWA error:", err.message);
    isConnecting = false;
    botStatus = "idle";
    sock = null;
  }
}

// ── ROUTES ────────────────────────────────────────────────────────────────────

// Health check
app.get("/", (req, res) => {
  res.json({
    service: "KOSTKU WA Bot",
    version: "4.0.0",
    status: botStatus,
    phone: connectedPhone || null,
    qr_available: !!qrCodeData,
    has_session: hasSession(),
    uptime: Math.floor(process.uptime()) + "s",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => res.json({ status: "ok", bot: botStatus }));

// ── QR Image (binary PNG) — dipanggil dari Next.js proxy ─────────────────────
// Hanya tersedia saat botStatus === "qr_ready"
app.get("/qr-image", (req, res) => {
  if (botStatus === "connected") {
    return res.status(204).end(); // Sudah connected, tidak perlu QR
  }
  if (botStatus === "qr_ready" && qrCodeData) {
    const base64 = qrCodeData.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(base64, "base64");
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "no-store");
    return res.send(buffer);
  }
  return res.status(204).end(); // QR belum siap
});

// ── QR HTML Page (fallback, bisa dibuka langsung di browser) ─────────────────
app.get("/qr", (req, res) => {
  if (botStatus === "connected") {
    return res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px">
      <h2>✅ Bot Terhubung</h2><p>Nomor: <strong>${connectedPhone}</strong></p>
    </body></html>`);
  }
  if (botStatus === "qr_ready" && qrCodeData) {
    return res.send(`<html><head><meta http-equiv="refresh" content="30"><style>
      body{font-family:sans-serif;text-align:center;padding:40px;background:#f5f5f5}
      img{border:4px solid #3525cd;border-radius:12px;padding:8px;background:white}
    </style></head><body>
      <h2>📱 Scan QR dengan WhatsApp</h2>
      <img src="${qrCodeData}" width="260"/><br><br>
      <p>Buka WhatsApp → ⋮ → Linked Devices → Link a Device</p>
    </body></html>`);
  }
  return res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px">
    <h2>⏳ Status: ${botStatus}</h2>
    <p>Bot belum dalam mode QR. Gunakan dashboard admin untuk memulai koneksi.</p>
  </body></html>`);
});

// ── POST /api/start — Admin klik "Hubungkan WA" ───────────────────────────────
// Memulai proses koneksi dan generate QR
app.post("/api/start", auth, (req, res) => {
  if (botStatus === "connected") {
    return res.json({ success: true, status: "connected", message: "Bot sudah terhubung" });
  }
  if (isConnecting || botStatus === "connecting" || botStatus === "qr_ready") {
    return res.json({ success: true, status: botStatus, message: "Bot sedang dalam proses koneksi" });
  }

  console.log("▶️  Admin meminta start koneksi WA...");
  connectWA().catch((e) => console.error("start error:", e.message));
  res.json({ success: true, status: "connecting", message: "Proses koneksi dimulai. QR akan tersedia dalam beberapa detik." });
});

// ── POST /api/reset — Admin klik "Putuskan WA" / "Ganti Nomor" ───────────────
// Logout + hapus session. Bot kembali idle.
app.post("/api/reset", auth, async (req, res) => {
  console.log("🔄 Admin meminta reset/putuskan WA...");

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (sock) {
    try { await sock.logout(); } catch {}
    sock = null;
  }

  try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch {}

  botStatus = "idle";
  connectedPhone = null;
  qrCodeData = null;
  isConnecting = false;

  res.json({ success: true, message: "Bot diputuskan. Klik 'Hubungkan WA' untuk menyambungkan ulang." });
});

// ── POST /api/send-notification — Kirim notifikasi ke penyewa ────────────────
app.post("/api/send-notification", auth, async (req, res) => {
  const { phone, name, message, invoiceId, kostId } = req.body || {};
  if (!phone || !message) {
    return res.status(400).json({ error: "phone & message wajib diisi" });
  }

  const result = await sendMessage(phone, message);

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

// ── POST /api/broadcast ───────────────────────────────────────────────────────
app.post("/api/broadcast", auth, async (req, res) => {
  const { kostId, message } = req.body || {};
  if (!kostId || !message) {
    return res.status(400).json({ error: "kostId & message wajib diisi" });
  }
  if (!supabase) return res.status(503).json({ error: "Supabase tidak terkonfigurasi" });
  if (botStatus !== "connected") {
    return res.status(503).json({ error: `Bot belum terhubung. Status: ${botStatus}` });
  }

  const { data: tenants, error } = await supabase
    .from("tenants").select("nama, phone").eq("kost_id", kostId);
  if (error) return res.status(500).json({ error: error.message });

  const results = [];
  for (const t of tenants || []) {
    const personalMsg = message.replace("{nama}", t.nama);
    const r = await sendMessage(t.phone, personalMsg);
    results.push({ nama: t.nama, phone: t.phone, ...r });
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  res.json({ success: true, sent: results.length, results });
});

// ── CRON: Reminder tagihan — 08:00 WIB (01:00 UTC) ───────────────────────────
cron.schedule("0 1 * * *", async () => {
  if (!supabase || botStatus !== "connected") {
    console.log(`[CRON] Skip: bot=${botStatus}`);
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*, kost_profiles!inner(nama)")
    .eq("status", "Menunggu")
    .lte("jatuh_tempo", today);

  let count = 0;
  for (const inv of invoices || []) {
    const { data: tenant } = await supabase
      .from("tenants").select("phone").eq("nama", inv.penyewa).eq("kost_id", inv.kost_id).single();
    if (!tenant?.phone) continue;

    const msg = `🏠 *Pengingat Tagihan Sewa*\n*${inv.kost_profiles?.nama || "KOSTKU"}*\n\nHalo *${inv.penyewa}*, tagihan sewa *${inv.kamar}* sebesar *Rp ${Number(inv.nominal).toLocaleString("id-ID")}* jatuh tempo *${inv.jatuh_tempo}*.\n\nNo: \`${inv.no_invoice}\`\n\nMohon segera bayar. Terima kasih! 🙏`;

    const result = await sendMessage(tenant.phone, msg);
    if (result.success) {
      await supabase.from("invoices").update({ status: "Jatuh Tempo" }).eq("id", inv.id);
      count++;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  console.log(`[CRON] ${count} reminder terkirim`);
});

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log("================================================");
  console.log(`  KOSTKU WA Bot v4 — Port ${PORT}`);
  console.log("================================================");

  // Cek apakah ada session tersimpan
  if (hasSession()) {
    console.log("🔑 Session tersimpan ditemukan — auto-reconnect...");
    connectWA().catch((e) => console.error("auto-reconnect error:", e.message));
  } else {
    console.log("⏹️  Tidak ada session — bot idle. Admin perlu klik 'Hubungkan WA'.");
    botStatus = "idle";
  }
});
