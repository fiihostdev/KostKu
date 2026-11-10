/**
 * KOSTKU WA Bot — Multi-Session Baileys
 *
 * Setiap admin kost punya session WA sendiri (per kostId).
 * Satu bot server bisa handle banyak nomor WA sekaligus.
 *
 * API:
 *   GET  /api/status/:kostId        → status session kost ini
 *   POST /api/start/:kostId         → mulai koneksi, generate QR
 *   GET  /qr-image/:kostId          → QR image (PNG) untuk dashboard
 *   POST /api/reset/:kostId         → logout & hapus session kost ini
 *   POST /api/send-notification     → kirim pesan dari session kost
 *   POST /api/broadcast             → broadcast ke semua penyewa kost
 */

process.on("uncaughtException", (err) => console.error("[FATAL]", err.message));
process.on("unhandledRejection", (r) => console.error("[UNHANDLED]", r));

const express = require("express");
const cron    = require("node-cron");
const qrcode  = require("qrcode");
const WebSocket = require("ws");
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
} = require("@whiskeysockets/baileys");
const pino = require("pino");

// ── Express ───────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

const PORT       = process.env.PORT || 4000;
const BOT_SECRET = process.env.BOT_API_SECRET || "kostku_wa_secret_2026_fiihost";
const BASE_AUTH  = process.env.AUTH_DIR || "./wa_auth";

// ── Supabase ──────────────────────────────────────────────────────────────────
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { realtime: { transport: WebSocket }, auth: { persistSession: false } }
  );
  console.log("✅ Supabase: connected");
}

// ── Auth middleware ───────────────────────────────────────────────────────────
function auth(req, res, next) {
  const token = (req.headers["authorization"] || "").replace("Bearer ", "");
  if (token !== BOT_SECRET) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// ── Multi-session store ───────────────────────────────────────────────────────
// Map<kostId, SessionState>
const sessions = new Map();

/*
  SessionState = {
    kostId:        string
    status:        "idle" | "connecting" | "qr_ready" | "connected" | "disconnected"
    sock:          WASocket | null
    qrCodeData:    string | null   (base64 PNG)
    connectedPhone: string | null
    isConnecting:  boolean
    reconnectTimer: NodeJS.Timeout | null
  }
*/

function getSession(kostId) {
  if (!sessions.has(kostId)) {
    sessions.set(kostId, {
      kostId,
      status: "idle",
      sock: null,
      qrCodeData: null,
      connectedPhone: null,
      isConnecting: false,
      reconnectTimer: null,
    });
  }
  return sessions.get(kostId);
}

function authDir(kostId) {
  const dir = path.join(BASE_AUTH, kostId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function hasSession(kostId) {
  try {
    return fs.readdirSync(authDir(kostId)).some((f) => f === "creds.json");
  } catch { return false; }
}

function toJid(phone) {
  let n = (phone || "").replace(/[^0-9]/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  if (!n.endsWith("@s.whatsapp.net")) n += "@s.whatsapp.net";
  return n;
}

// ── Core: connect WA untuk satu kost ─────────────────────────────────────────
async function connectWA(kostId) {
  const s = getSession(kostId);

  if (s.isConnecting) {
    console.log(`[${kostId}] ⚠️  Sudah connecting — diabaikan`);
    return;
  }

  s.isConnecting = true;
  s.status = "connecting";
  s.qrCodeData = null;

  try {
    const dir = authDir(kostId);
    const { state, saveCreds } = await useMultiFileAuthState(dir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: "silent" }),
      browser: ["KOSTKU Bot", "Chrome", "1.0.0"],
      connectTimeoutMs: 90000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 20000,
      retryRequestDelayMs: 3000,
      maxMsgRetryCount: 3,
    });
    s.sock = sock;

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        s.status = "qr_ready";
        s.isConnecting = false;
        try {
          s.qrCodeData = await qrcode.toDataURL(qr, { width: 280, margin: 2 });
          console.log(`[${kostId}] 📱 QR tersedia`);
        } catch (e) { console.error("QR gen error:", e.message); }
      }

      if (connection === "close") {
        const code = lastDisconnect?.error?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;
        console.log(`[${kostId}] 🔌 Koneksi terputus (${code})`);

        s.isConnecting = false;
        s.qrCodeData = null;
        s.connectedPhone = null;

        if (loggedOut) {
          // Logout sengaja — hapus session, kembali idle
          try { fs.rmSync(authDir(kostId), { recursive: true, force: true }); } catch {}
          s.status = "idle";
          s.sock = null;
          console.log(`[${kostId}] 🚪 Logged out — session dihapus`);
        } else if (s.status === "connected" || hasSession(kostId)) {
          // Disconnect tidak disengaja — reconnect
          s.status = "disconnected";
          if (s.reconnectTimer) clearTimeout(s.reconnectTimer);
          s.reconnectTimer = setTimeout(() => connectWA(kostId), 8000);
          console.log(`[${kostId}] 🔄 Reconnect dalam 8 detik...`);
        } else {
          // QR timeout — kembali idle, tunggu admin klik lagi
          s.status = "idle";
          s.sock = null;
          console.log(`[${kostId}] ⏹️  QR timeout — idle`);
        }
      }

      if (connection === "open") {
        s.status = "connected";
        s.isConnecting = false;
        s.qrCodeData = null;
        s.connectedPhone = jidNormalizedUser(sock.user?.id || "");
        console.log(`[${kostId}] ✅ Terhubung! Nomor: ${s.connectedPhone}`);
      }
    });

    sock.ev.on("creds.update", saveCreds);

    // Auto-reply sederhana
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;
      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;
        const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
        if (body.toLowerCase().includes("tagihan") || body.toLowerCase().includes("info")) {
          await sock.sendMessage(msg.key.remoteJid, {
            text: "Halo! 👋 Untuk info tagihan, silakan hubungi pengelola kost Anda.",
          });
        }
      }
    });

  } catch (err) {
    console.error(`[${kostId}] connectWA error:`, err.message);
    s.isConnecting = false;
    s.status = "idle";
    s.sock = null;
  }
}

// ── Send message dari session kost ───────────────────────────────────────────
async function sendMessage(kostId, phone, text) {
  const s = getSession(kostId);
  if (!s.sock || s.status !== "connected") {
    return { success: false, error: `Bot kost ${kostId} tidak terhubung. Status: ${s.status}` };
  }
  try {
    await s.sock.sendMessage(toJid(phone), { text });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── ROUTES ────────────────────────────────────────────────────────────────────

// Health check global
app.get("/", (req, res) => {
  const summary = {};
  sessions.forEach((s, id) => {
    summary[id] = { status: s.status, phone: s.connectedPhone };
  });
  res.json({
    service: "KOSTKU WA Bot (Multi-Session)",
    version: "5.0.0",
    uptime: Math.floor(process.uptime()) + "s",
    sessions: sessions.size,
    summary,
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => res.json({ status: "ok", sessions: sessions.size }));

// ── Status per kost ───────────────────────────────────────────────────────────
app.get("/api/status/:kostId", auth, (req, res) => {
  const { kostId } = req.params;
  const s = getSession(kostId);
  res.json({
    status: s.status,
    phone: s.connectedPhone,
    qr_available: !!s.qrCodeData,
    has_session: hasSession(kostId),
    uptime: Math.floor(process.uptime()) + "s",
  });
});

// ── Start koneksi per kost ────────────────────────────────────────────────────
app.post("/api/start/:kostId", auth, (req, res) => {
  const { kostId } = req.params;
  const s = getSession(kostId);

  if (s.status === "connected") {
    return res.json({ success: true, status: "connected", message: "Sudah terhubung" });
  }
  if (s.isConnecting || s.status === "connecting" || s.status === "qr_ready") {
    return res.json({ success: true, status: s.status, message: "Sedang dalam proses koneksi" });
  }

  console.log(`[${kostId}] ▶️  Admin meminta start koneksi...`);
  connectWA(kostId).catch(console.error);
  res.json({ success: true, status: "connecting", message: "Proses koneksi dimulai. QR akan tersedia dalam beberapa detik." });
});

// ── QR Image per kost (binary PNG) ───────────────────────────────────────────
app.get("/qr-image/:kostId", auth, (req, res) => {
  const { kostId } = req.params;
  const s = getSession(kostId);

  if (s.status === "connected") return res.status(204).end();
  if (s.status === "qr_ready" && s.qrCodeData) {
    const buf = Buffer.from(s.qrCodeData.replace(/^data:image\/png;base64,/, ""), "base64");
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "no-store");
    return res.send(buf);
  }
  return res.status(204).end();
});

// ── QR HTML fallback per kost ─────────────────────────────────────────────────
app.get("/qr/:kostId", (req, res) => {
  const { kostId } = req.params;
  const s = getSession(kostId);
  if (s.status === "connected") {
    return res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px">
      <h2>✅ [${kostId}] Terhubung</h2><p>Nomor: <strong>${s.connectedPhone}</strong></p>
    </body></html>`);
  }
  if (s.status === "qr_ready" && s.qrCodeData) {
    return res.send(`<html><head><meta http-equiv="refresh" content="30"></head><body style="font-family:sans-serif;text-align:center;padding:40px">
      <h2>Scan QR — Kost ${kostId}</h2>
      <img src="${s.qrCodeData}" width="260" style="border:4px solid #3525cd;border-radius:12px"/>
      <p>Buka WhatsApp → ⋮ → Linked Devices → Link a Device</p>
    </body></html>`);
  }
  return res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px">
    <h2>Status: ${s.status}</h2><p>Kost: ${kostId}</p>
  </body></html>`);
});

// ── Reset / Putuskan per kost ─────────────────────────────────────────────────
app.post("/api/reset/:kostId", auth, async (req, res) => {
  const { kostId } = req.params;
  const s = getSession(kostId);

  if (s.reconnectTimer) { clearTimeout(s.reconnectTimer); s.reconnectTimer = null; }
  if (s.sock) { try { await s.sock.logout(); } catch {} s.sock = null; }
  try { fs.rmSync(authDir(kostId), { recursive: true, force: true }); } catch {}

  s.status = "idle";
  s.connectedPhone = null;
  s.qrCodeData = null;
  s.isConnecting = false;

  console.log(`[${kostId}] 🔄 Session di-reset`);
  res.json({ success: true, message: "Session dihapus. Klik Hubungkan WA untuk sambung ulang." });
});

// ── Kirim notifikasi (dengan kostId) ─────────────────────────────────────────
app.post("/api/send-notification", auth, async (req, res) => {
  const { kostId, phone, name, message, invoiceId } = req.body || {};
  if (!phone || !message || !kostId) {
    return res.status(400).json({ error: "kostId, phone & message wajib diisi" });
  }

  const result = await sendMessage(kostId, phone, message);

  if (supabase) {
    supabase.from("notification_queue").insert({
      kost_id: kostId,
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

// ── Broadcast ke semua penyewa kost ──────────────────────────────────────────
app.post("/api/broadcast", auth, async (req, res) => {
  const { kostId, message } = req.body || {};
  if (!kostId || !message) return res.status(400).json({ error: "kostId & message wajib" });
  if (!supabase) return res.status(503).json({ error: "Supabase tidak terkonfigurasi" });

  const s = getSession(kostId);
  if (s.status !== "connected") {
    return res.status(503).json({ error: `Bot kost ini belum terhubung. Status: ${s.status}` });
  }

  const { data: tenants } = await supabase.from("tenants").select("nama, phone").eq("kost_id", kostId);
  const results = [];
  for (const t of tenants || []) {
    const r = await sendMessage(kostId, t.phone, message.replace("{nama}", t.nama));
    results.push({ nama: t.nama, ...r });
    await new Promise((res) => setTimeout(res, 1200));
  }
  res.json({ success: true, sent: results.length, results });
});

// ── CRON: Reminder tagihan 08:00 WIB ─────────────────────────────────────────
cron.schedule("0 1 * * *", async () => {
  if (!supabase) return;
  console.log("[CRON] Cek tagihan jatuh tempo...");
  const today = new Date().toISOString().split("T")[0];

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*, kost_profiles!inner(nama)")
    .eq("status", "Menunggu")
    .lte("jatuh_tempo", today);

  let count = 0;
  for (const inv of invoices || []) {
    const s = getSession(inv.kost_id);
    if (s.status !== "connected") continue;

    const { data: tenant } = await supabase
      .from("tenants").select("phone").eq("nama", inv.penyewa).eq("kost_id", inv.kost_id).single();
    if (!tenant?.phone) continue;

    const msg = `🏠 *Pengingat Tagihan*\n*${inv.kost_profiles?.nama}*\n\nHalo *${inv.penyewa}*, tagihan *${inv.kamar}* sebesar *Rp ${Number(inv.nominal).toLocaleString("id-ID")}* jatuh tempo *${inv.jatuh_tempo}*.\n\nNo: \`${inv.no_invoice}\`\n\nTerima kasih! 🙏`;

    const result = await sendMessage(inv.kost_id, tenant.phone, msg);
    if (result.success) {
      await supabase.from("invoices").update({ status: "Jatuh Tempo" }).eq("id", inv.id);
      count++;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  console.log(`[CRON] ${count} reminder terkirim`);
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log("================================================");
  console.log(`  KOSTKU WA Bot v5 (Multi-Session) — Port ${PORT}`);
  console.log("================================================");

  // Auto-reconnect semua kost yang punya session tersimpan
  if (fs.existsSync(BASE_AUTH)) {
    const dirs = fs.readdirSync(BASE_AUTH).filter((d) => {
      return fs.existsSync(path.join(BASE_AUTH, d, "creds.json"));
    });
    if (dirs.length > 0) {
      console.log(`🔑 Ditemukan ${dirs.length} session tersimpan — auto-reconnect...`);
      dirs.forEach((kostId) => {
        setTimeout(() => connectWA(kostId), 1000);
      });
    } else {
      console.log("⏹️  Tidak ada session tersimpan — bot idle.");
    }
  }
});
