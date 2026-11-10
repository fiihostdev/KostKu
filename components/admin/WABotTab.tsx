"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface BotStatus {
  status: "idle" | "connecting" | "qr_ready" | "connected" | "disconnected" | "unknown";
  phone: string | null;
  qr_available: boolean;
  has_session: boolean;
  uptime: string;
}

interface WABotTabProps {
  waTemplate: string;
  setWaTemplate: (v: string) => void;
  waReminderDays: number;
  setWaReminderDays: (v: number) => void;
  waBotEnabled: boolean;
  setWaBotEnabled: (v: boolean) => void;
  onSave: () => void;
}

const DEFAULT_TEMPLATE =
  `🏠 *Pengingat Tagihan Sewa*\n*{nama_kost}*\n\nHalo *{nama_penyewa}*,\n\nTagihan sewa *{kamar}* sebesar *Rp {nominal}* telah jatuh tempo pada *{tanggal}*.\n\nNo. Invoice: \`{no_invoice}\`\n\nMohon segera melakukan pembayaran. Terima kasih! 🙏`;

export default function WABotTab({
  waTemplate,
  setWaTemplate,
  waReminderDays,
  setWaReminderDays,
  waBotEnabled,
  setWaBotEnabled,
  onSave,
}: WABotTabProps) {

  const [botStatus, setBotStatus] = useState<BotStatus>({
    status: "unknown",
    phone: null,
    qr_available: false,
    has_session: false,
    uptime: "0s",
  });

  // QR state
  const [qrSrc, setQrSrc] = useState<string | null>(null);

  // Loading flags
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [starting, setStarting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  // Test fields
  const [testPhone, setTestPhone] = useState("");
  const [testMsg, setTestMsg] = useState("Halo! Ini pesan test dari KOSTKU Bot 🤖");

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Refs untuk polling — HANYA aktif saat status connecting/qr_ready
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Bersihkan semua interval ──────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (qrPollRef.current) { clearInterval(qrPollRef.current); qrPollRef.current = null; }
  }, []);

  // ── Cek status bot (1x, tanpa loop) ──────────────────────────────────────
  const checkStatus = useCallback(async (silent = false) => {
    if (!silent) setCheckingStatus(true);
    try {
      const res = await fetch("/api/notify/bot-status", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setBotStatus(data);
        return data as BotStatus;
      }
    } catch {
      // bot offline — tidak ubah status agar tidak flicker
    } finally {
      if (!silent) setCheckingStatus(false);
    }
    return null;
  }, []);

  // ── Ambil QR image (1x, on-demand) ───────────────────────────────────────
  const fetchQR = useCallback(async () => {
    try {
      const res = await fetch(`/api/notify/bot-qr?t=${Date.now()}`, { cache: "no-store" });
      if (res.status === 200) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setQrSrc((prev) => {
          if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
          return url;
        });
      } else {
        setQrSrc(null);
      }
    } catch {
      setQrSrc(null);
    }
  }, []);

  // ── Mulai polling — HANYA saat proses koneksi aktif ──────────────────────
  // Polling berhenti otomatis saat status = connected/idle/disconnected
  const startPolling = useCallback(() => {
    stopPolling();

    // Cek status setiap 5 detik
    pollRef.current = setInterval(async () => {
      const data = await checkStatus(true);
      if (!data) return;

      if (data.status === "qr_ready") {
        // Ambil QR setiap 25 detik
        if (!qrPollRef.current) {
          fetchQR(); // langsung ambil QR pertama kali
          qrPollRef.current = setInterval(fetchQR, 25000);
        }
      }

      // Polling berhenti jika sudah connected atau kembali idle
      if (data.status === "connected" || data.status === "idle" || data.status === "disconnected") {
        stopPolling();
        if (data.status !== "qr_ready") {
          setQrSrc((prev) => {
            if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
            return null;
          });
        }
      }
    }, 5000);
  }, [checkStatus, fetchQR, stopPolling]);

  // ── Cek status 1x saat halaman dibuka (tidak loop) ───────────────────────
  useEffect(() => {
    checkStatus();
    return () => stopPolling();
  }, [checkStatus, stopPolling]);

  // ── Jika saat buka halaman status sudah qr_ready → ambil QR + mulai poll ─
  useEffect(() => {
    if (botStatus.status === "qr_ready" && !qrSrc) {
      fetchQR();
      // Hanya start polling jika belum berjalan
      if (!pollRef.current) startPolling();
    }
    if (botStatus.status === "connecting" && !pollRef.current) {
      startPolling();
    }
    // Cleanup QR saat sudah connected
    if (botStatus.status === "connected") {
      setQrSrc((prev) => {
        if (prev === null) return prev; // sudah null — React skip re-render
        if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return null;
      });
      stopPolling();
    }
  // Status berubah → reaksi. fetchQR, startPolling, stopPolling stabil (useCallback)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botStatus.status]);

  // ── Admin klik "Hubungkan WA" ─────────────────────────────────────────────
  const handleStart = async () => {
    setStarting(true);
    try {
      const res = await fetch("/api/notify/bot-start", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setBotStatus((prev) => ({ ...prev, status: data.status ?? "connecting" }));
        // Mulai polling untuk pantau progress
        startPolling();
      } else {
        showToast("error", data.error || "Gagal memulai koneksi bot.");
      }
    } catch {
      showToast("error", "Tidak dapat menghubungi bot service.");
    } finally {
      setStarting(false);
    }
  };

  // ── Admin klik "Putuskan / Ganti Nomor WA" ───────────────────────────────
  const handleReset = async () => {
    setResetting(true);
    stopPolling();
    try {
      const res = await fetch("/api/notify/bot-reset", { method: "POST" });
      if (res.ok) {
        setBotStatus((prev) => ({ ...prev, status: "idle", phone: null }));
        setQrSrc((prev) => {
          if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
          return null;
        });
        showToast("success", "WhatsApp diputuskan. Klik \"Hubungkan WA\" untuk menyambungkan ulang.");
      } else {
        showToast("error", "Gagal memutuskan koneksi.");
      }
    } catch {
      showToast("error", "Tidak dapat menghubungi bot service.");
    } finally {
      setResetting(false);
    }
  };

  // ── Kirim test message ────────────────────────────────────────────────────
  const handleTestSend = async () => {
    if (!testPhone.trim()) { showToast("error", "Isi nomor HP tujuan."); return; }
    if (!testMsg.trim())   { showToast("error", "Isi pesan test.");       return; }
    setSendingTest(true);
    try {
      const res = await fetch("/api/notify/send-wa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone, message: testMsg }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", `✅ Pesan berhasil dikirim ke ${testPhone}`);
      } else {
        showToast("error", `Gagal: ${data.error || "Unknown error"}`);
      }
    } catch {
      showToast("error", "Tidak dapat menghubungi bot service.");
    } finally {
      setSendingTest(false);
    }
  };

  // ── UI helpers ────────────────────────────────────────────────────────────
  const statusConfig = {
    connected:    { dot: "bg-emerald-500",            text: "text-emerald-700", label: "Terhubung & Aktif" },
    qr_ready:     { dot: "bg-amber-500 animate-pulse", text: "text-amber-700",  label: "Menunggu Scan QR" },
    connecting:   { dot: "bg-blue-500 animate-pulse",  text: "text-blue-700",   label: "Sedang Menghubungkan..." },
    disconnected: { dot: "bg-red-500",                 text: "text-red-700",    label: "Terputus" },
    idle:         { dot: "bg-slate-300",               text: "text-slate-500",  label: "Belum Dihubungkan" },
    unknown:      { dot: "bg-slate-300",               text: "text-slate-400",  label: "Mengecek..." },
  };
  const sc = statusConfig[botStatus.status] ?? statusConfig.unknown;
  const isConnected  = botStatus.status === "connected";
  const isQrReady    = botStatus.status === "qr_ready";
  const isConnecting = botStatus.status === "connecting";
  const isIdle       = botStatus.status === "idle" || botStatus.status === "unknown";

  return (
    <div className="space-y-6 text-xs">

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 font-bold animate-fadeInUp ${
          toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
        }`}>
          <span className="material-symbols-outlined text-[18px]">
            {toast.type === "success" ? "check_circle" : "error"}
          </span>
          {toast.msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── Kolom Kiri ── */}
        <div className="lg:col-span-8 space-y-5">

          {/* Status Card */}
          <div className="skeu-card p-5 rounded-2xl space-y-4">

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/60">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-emerald-600">phone_android</span>
                Koneksi WhatsApp Bot
              </h2>
              <button
                onClick={() => checkStatus()}
                disabled={checkingStatus}
                className="skeu-button-secondary text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1"
              >
                <span className={`material-symbols-outlined text-[14px] ${checkingStatus ? "animate-spin" : ""}`}>refresh</span>
                Refresh
              </button>
            </div>

            {/* Status + Nomor */}
            <div className="grid grid-cols-2 gap-3">
              <div className="skeu-inset p-3 rounded-xl">
                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Status</span>
                <span className={`font-bold flex items-center gap-1.5 text-xs ${sc.text}`}>
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${sc.dot}`}></span>
                  {sc.label}
                </span>
              </div>
              <div className="skeu-inset p-3 rounded-xl">
                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Nomor Aktif</span>
                <span className="font-bold text-slate-800 font-mono text-[11px]">
                  {botStatus.phone
                    ? `+${botStatus.phone.replace("@s.whatsapp.net", "")}`
                    : "—"}
                </span>
              </div>
            </div>

            {/* ── State: Idle — belum dihubungkan ── */}
            {isIdle && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-slate-400 text-[32px] shrink-0">link_off</span>
                  <div>
                    <p className="font-bold text-slate-700 mb-1">WhatsApp belum dihubungkan</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Klik tombol di bawah untuk memulai proses scan QR. QR hanya akan muncul setelah kamu klik tombol tersebut.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── State: Connecting — loading ── */}
            {isConnecting && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3">
                <span className="material-symbols-outlined text-blue-500 text-[28px] animate-spin shrink-0">sync</span>
                <div>
                  <p className="font-bold text-blue-800">Menyiapkan koneksi...</p>
                  <p className="text-[11px] text-blue-600 mt-0.5">QR Code akan muncul otomatis dalam beberapa detik.</p>
                </div>
              </div>
            )}

            {/* ── State: QR Ready — tampilkan QR inline ── */}
            {isQrReady && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-[20px]">qr_code_scanner</span>
                  <div className="flex-1">
                    <p className="font-bold text-amber-800 text-xs">Scan QR dengan WhatsApp sekarang</p>
                    <p className="text-[11px] text-amber-600">QR refresh otomatis setiap 25 detik</p>
                  </div>
                  <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full animate-pulse shrink-0">
                    ● LIVE
                  </span>
                </div>

                {/* QR Image */}
                <div className="flex justify-center py-2">
                  {qrSrc ? (
                    <img
                      src={qrSrc}
                      alt="QR Code WhatsApp"
                      width={224}
                      height={224}
                      className="rounded-2xl border-4 border-white shadow-lg"
                      style={{ imageRendering: "pixelated" }}
                    />
                  ) : (
                    <div className="w-56 h-56 flex flex-col items-center justify-center rounded-2xl bg-white border-2 border-amber-200 gap-2">
                      <span className="material-symbols-outlined text-[36px] text-amber-300 animate-spin">sync</span>
                      <span className="text-[11px] text-amber-600">Memuat QR Code...</span>
                    </div>
                  )}
                </div>

                {/* Instruksi */}
                <div className="space-y-1.5 text-[11px] text-amber-700">
                  {[
                    "Buka WhatsApp di HP kamu",
                    "Ketuk menu ⋮ → Linked Devices",
                    "Ketuk Link a Device → scan QR di atas",
                  ].map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                        {i + 1}
                      </span>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── State: Connected ── */}
            {isConnected && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-emerald-600 text-[26px]">check_circle</span>
                </div>
                <div>
                  <p className="font-bold text-emerald-800">Bot WhatsApp aktif!</p>
                  <p className="text-[11px] text-emerald-600 mt-0.5 font-mono">
                    +{botStatus.phone?.replace("@s.whatsapp.net", "")}
                  </p>
                  <p className="text-[11px] text-emerald-600">Notifikasi otomatis siap dikirim ke penyewa.</p>
                </div>
              </div>
            )}

            {/* ── Action Buttons ── */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/60">

              {/* Tombol Hubungkan — tampil saat idle/unknown */}
              {(isIdle || botStatus.status === "disconnected") && (
                <button
                  onClick={handleStart}
                  disabled={starting}
                  className="skeu-button text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <span className={`material-symbols-outlined text-[16px] ${starting ? "animate-spin" : ""}`}>
                    {starting ? "sync" : "qr_code_2"}
                  </span>
                  {starting ? "Menyiapkan QR..." : "Hubungkan WhatsApp"}
                </button>
              )}

              {/* Tombol Putuskan / Ganti Nomor — tampil saat connected atau qr_ready */}
              {(isConnected || isQrReady || isConnecting) && (
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="skeu-button-secondary text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 text-red-700"
                >
                  <span className={`material-symbols-outlined text-[16px] ${resetting ? "animate-spin" : ""}`}>
                    {resetting ? "sync" : "link_off"}
                  </span>
                  {isConnected ? "Putuskan / Ganti Nomor" : "Batalkan"}
                </button>
              )}

            </div>

            {/* Uptime */}
            {botStatus.uptime && botStatus.uptime !== "0s" && (
              <p className="text-[10px] text-slate-400 text-right">Bot uptime: {botStatus.uptime}</p>
            )}
          </div>

          {/* ── Template Editor ── */}
          <div className="skeu-card p-5 rounded-2xl space-y-4">
            <h2 className="font-bold text-slate-900 text-sm pb-3 border-b border-white/60">
              Custom Template Pesan WhatsApp
            </h2>

            <div className="flex items-center justify-between p-3 rounded-xl skeu-inset">
              <div>
                <span className="font-bold text-slate-800 block">Kirim Pengingat Otomatis (CRON)</span>
                <span className="text-[10px] text-slate-500">Otomatis setiap hari pukul 08.00 WIB</span>
              </div>
              <button
                type="button"
                onClick={() => setWaBotEnabled(!waBotEnabled)}
                className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${waBotEnabled ? "bg-emerald-500" : "bg-slate-300"}`}
              >
                <span className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-all ${waBotEnabled ? "right-0.5" : "left-0.5"}`}></span>
              </button>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-2">Kirim Pengingat Sebelum Jatuh Tempo</label>
              <div className="flex items-center gap-2 flex-wrap">
                {[1, 3, 5, 7].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setWaReminderDays(d)}
                    className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                      waReminderDays === d ? "skeu-button text-white shadow-sm" : "skeu-card text-slate-600"
                    }`}
                  >
                    H-{d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">Template Pesan</label>
                <button type="button" onClick={() => setWaTemplate(DEFAULT_TEMPLATE)}
                  className="text-[10px] text-primary hover:underline font-bold">
                  Reset ke Default
                </button>
              </div>
              <textarea
                rows={6}
                value={waTemplate}
                onChange={(e) => setWaTemplate(e.target.value)}
                className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none leading-relaxed font-mono text-[11px]"
                placeholder={DEFAULT_TEMPLATE}
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {["{nama_kost}", "{nama_penyewa}", "{kamar}", "{nominal}", "{tanggal}", "{no_invoice}"].map((v) => (
                  <button key={v} type="button"
                    onClick={() => setWaTemplate((waTemplate || "") + v)}
                    className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-mono text-[10px] font-bold hover:bg-primary/20 transition-colors">
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <p className="text-[11px] font-bold text-emerald-800 mb-1.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">preview</span>
                Preview:
              </p>
              <pre className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap break-words font-sans">
                {(waTemplate || DEFAULT_TEMPLATE)
                  .replace("{nama_kost}", "Kost Harmoni")
                  .replace("{nama_penyewa}", "Dimas Anggara")
                  .replace("{kamar}", "Kamar A-01")
                  .replace("{nominal}", "1.800.000")
                  .replace("{tanggal}", "05 Des 2026")
                  .replace("{no_invoice}", "INV/2026/12/001")}
              </pre>
            </div>

            <button onClick={onSave}
              className="skeu-button w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md">
              <span className="material-symbols-outlined text-[18px]">save</span>
              Simpan Template & Pengaturan
            </button>
          </div>
        </div>

        {/* ── Kolom Kanan ── */}
        <div className="lg:col-span-4 space-y-4">

          {/* Test Kirim */}
          <div className="skeu-card p-5 rounded-2xl space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-3 border-b border-white/60">
              <span className="material-symbols-outlined text-[18px] text-primary">send</span>
              Test Kirim Pesan
            </h3>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Nomor HP Tujuan</label>
              <input type="text" placeholder="081234567890" value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-mono" />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Pesan</label>
              <textarea rows={3} value={testMsg}
                onChange={(e) => setTestMsg(e.target.value)}
                className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none" />
            </div>
            <button onClick={handleTestSend} disabled={sendingTest || !isConnected}
              className="w-full skeu-button py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md disabled:opacity-60">
              {sendingTest
                ? <><span className="material-symbols-outlined text-[16px] animate-spin">sync</span> Mengirim...</>
                : <><span className="material-symbols-outlined text-[16px]">send</span> Kirim Test</>}
            </button>
            {!isConnected && (
              <p className="text-[10px] text-amber-700 font-bold text-center">
                ⚠️ Hubungkan WhatsApp terlebih dahulu
              </p>
            )}
          </div>

          {/* Panduan */}
          <div className="skeu-card p-5 rounded-2xl space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">help_center</span>
              Cara Kerja
            </h3>
            <div className="space-y-2.5 text-[11px] text-slate-600">
              {[
                { n: 1, t: "Klik \"Hubungkan WhatsApp\" untuk mulai proses koneksi." },
                { n: 2, t: "QR Code akan muncul di halaman ini — tidak perlu buka link baru." },
                { n: 3, t: "Scan QR dengan WA dalam waktu 60 detik." },
                { n: 4, t: "Setelah scan, bot aktif permanen. Tidak perlu scan ulang saat restart." },
                { n: 5, t: "Untuk ganti nomor WA, klik \"Putuskan / Ganti Nomor\" lalu hubungkan ulang." },
              ].map((s) => (
                <div key={s.n} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">{s.n}</span>
                  <span>{s.t}</span>
                </div>
              ))}
            </div>
            <div className="skeu-inset p-3 rounded-xl space-y-2 text-[11px] text-slate-600">
              <p className="font-bold text-slate-700 text-[10px] uppercase">Info Penting</p>
              <p>Bot ini adalah layanan platform — satu nomor WA digunakan untuk mengirim notifikasi ke semua penyewa di semua kost yang terdaftar.</p>
              <p>Fitur notifikasi WA tersedia sesuai paket yang kamu gunakan.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
