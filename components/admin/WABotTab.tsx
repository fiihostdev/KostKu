"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface BotStatus {
  status: "disconnected" | "connecting" | "qr_ready" | "connected" | "logged_out" | "unknown";
  phone: string | null;
  qr_available: boolean;
  supabase: boolean;
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
    supabase: false,
    uptime: "0s",
  });
  const [loadingStatus, setLoadingStatus] = useState(false);

  // QR inline state
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const qrIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [testPhone, setTestPhone] = useState("");
  const [testMsg, setTestMsg] = useState("Halo! Ini pesan test dari KOSTKU Bot 🤖");
  const [sendingTest, setSendingTest] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Cek status bot ───────────────────────────────────────────────────────────
  const checkStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch(`/api/notify/bot-status`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setBotStatus(data);
      }
    } catch {
      setBotStatus((prev) => ({ ...prev, status: "disconnected" }));
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  // ── Ambil QR image dari proxy Next.js ────────────────────────────────────────
  const fetchQR = useCallback(async () => {
    setQrLoading(true);
    try {
      // Tambahkan timestamp agar browser tidak cache
      const res = await fetch(`/api/notify/bot-qr?t=${Date.now()}`, { cache: "no-store" });
      if (res.status === 200) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setQrSrc((prev) => {
          // Revoke URL lama untuk mencegah memory leak
          if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
          return url;
        });
      } else {
        // 204 = bot connected atau QR belum siap
        setQrSrc(null);
      }
    } catch {
      setQrSrc(null);
    } finally {
      setQrLoading(false);
    }
  }, []);

  // ── Auto-refresh status setiap 10 detik ──────────────────────────────────────
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  // ── Jika status qr_ready → ambil QR + auto-refresh setiap 25 detik ──────────
  useEffect(() => {
    // Bersihkan interval lama
    if (qrIntervalRef.current) {
      clearInterval(qrIntervalRef.current);
      qrIntervalRef.current = null;
    }

    if (botStatus.status === "qr_ready") {
      // Langsung ambil QR
      fetchQR();
      // Refresh QR setiap 25 detik (QR WA expire ~20-30 detik)
      qrIntervalRef.current = setInterval(fetchQR, 25000);
    } else {
      // Bukan qr_ready — bersihkan QR
      setQrSrc((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return null;
      });
    }

    return () => {
      if (qrIntervalRef.current) clearInterval(qrIntervalRef.current);
    };
  }, [botStatus.status, fetchQR]);

  // ── Reset bot (ganti nomor WA) ────────────────────────────────────────────────
  const handleReset = async () => {
    setResetLoading(true);
    try {
      const res = await fetch("/api/notify/bot-reset", { method: "POST" });
      if (res.ok) {
        showToast("success", "Bot di-reset. QR baru akan muncul dalam beberapa detik...");
        // Cek status ulang setelah 3 detik
        setTimeout(checkStatus, 3000);
      } else {
        showToast("error", "Gagal reset bot.");
      }
    } catch {
      showToast("error", "Gagal menghubungi bot service.");
    } finally {
      setResetLoading(false);
    }
  };

  // ── Kirim test message ────────────────────────────────────────────────────────
  const handleTestSend = async () => {
    if (!testPhone.trim()) {
      showToast("error", "Isi nomor HP tujuan terlebih dahulu.");
      return;
    }
    if (!testMsg.trim()) {
      showToast("error", "Isi pesan test terlebih dahulu.");
      return;
    }
    setSendingTest(true);
    try {
      const res = await fetch("/api/notify/send-wa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone, message: testMsg }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", `✅ Pesan test berhasil dikirim ke ${testPhone}!`);
      } else {
        showToast("error", `Gagal: ${data.error || "Unknown error"}`);
      }
    } catch {
      showToast("error", "Gagal menghubungi bot service.");
    } finally {
      setSendingTest(false);
    }
  };

  const statusConfig = {
    connected:    { dot: "bg-emerald-500",             text: "text-emerald-700", label: "Terhubung & Aktif" },
    qr_ready:     { dot: "bg-amber-500 animate-pulse",  text: "text-amber-700",  label: "Menunggu Scan QR" },
    connecting:   { dot: "bg-blue-500 animate-pulse",   text: "text-blue-700",   label: "Sedang Menghubungkan..." },
    disconnected: { dot: "bg-red-500",                  text: "text-red-700",    label: "Tidak Terhubung" },
    logged_out:   { dot: "bg-slate-400",                text: "text-slate-600",  label: "Logged Out" },
    unknown:      { dot: "bg-slate-300",                text: "text-slate-500",  label: "Mengecek status..." },
  };

  const sc = statusConfig[botStatus.status] ?? statusConfig.unknown;
  const isConnected = botStatus.status === "connected";
  const isQrReady   = botStatus.status === "qr_ready";

  return (
    <div className="space-y-6 text-xs">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-fadeInUp ${
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

          {/* ── Status + QR inline ── */}
          <div className="skeu-card p-5 rounded-2xl space-y-4">

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/60">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-emerald-600">phone_android</span>
                Status WhatsApp Bot
              </h2>
              <button
                onClick={checkStatus}
                disabled={loadingStatus}
                className="skeu-button-secondary text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1"
              >
                <span className={`material-symbols-outlined text-[14px] ${loadingStatus ? "animate-spin" : ""}`}>refresh</span>
                Refresh
              </button>
            </div>

            {/* Status baris */}
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

            {/* ── QR Code Inline ─────────────────────────────────────────────── */}
            {isQrReady && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-amber-600 text-[20px]">qr_code_scanner</span>
                  <div>
                    <p className="font-bold text-amber-800 text-xs">Scan QR dengan WhatsApp</p>
                    <p className="text-[11px] text-amber-600">QR refresh otomatis setiap 25 detik</p>
                  </div>
                  <span className="ml-auto text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                    ● LIVE
                  </span>
                </div>

                {/* QR Image */}
                <div className="flex justify-center">
                  {qrLoading && !qrSrc ? (
                    <div className="w-56 h-56 flex items-center justify-center rounded-2xl bg-white border-2 border-amber-200">
                      <div className="text-center">
                        <span className="material-symbols-outlined text-[32px] text-amber-400 animate-spin">sync</span>
                        <p className="text-[11px] text-amber-600 mt-1">Memuat QR...</p>
                      </div>
                    </div>
                  ) : qrSrc ? (
                    <div className="relative">
                      <img
                        src={qrSrc}
                        alt="QR Code WhatsApp"
                        width={224}
                        height={224}
                        className="rounded-2xl border-4 border-white shadow-lg"
                        style={{ imageRendering: "pixelated" }}
                      />
                      {/* Overlay loading saat refresh */}
                      {qrLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-2xl">
                          <span className="material-symbols-outlined text-[28px] text-primary animate-spin">sync</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center rounded-2xl bg-white border-2 border-amber-200">
                      <div className="text-center">
                        <span className="material-symbols-outlined text-[32px] text-slate-300">qr_code_2</span>
                        <p className="text-[11px] text-slate-400 mt-1">QR belum tersedia</p>
                        <button onClick={fetchQR} className="mt-2 text-[10px] text-primary font-bold hover:underline">
                          Coba Lagi
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Instruksi */}
                <div className="mt-3 space-y-1.5 text-[11px] text-amber-700">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] font-bold shrink-0">1</span>
                    Buka WhatsApp di HP kamu
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] font-bold shrink-0">2</span>
                    Ketuk menu ⋮ → <strong>Linked Devices</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] font-bold shrink-0">3</span>
                    Ketuk <strong>Link a Device</strong> → scan QR di atas
                  </div>
                </div>
              </div>
            )}

            {/* ── Sukses: Bot terhubung ─────────────────────────────────────── */}
            {isConnected && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-emerald-600 text-[28px]">check_circle</span>
                </div>
                <div>
                  <p className="font-bold text-emerald-800">Bot WhatsApp aktif!</p>
                  <p className="text-[11px] text-emerald-600 mt-0.5">
                    Terhubung sebagai <strong className="font-mono">+{botStatus.phone?.replace("@s.whatsapp.net", "")}</strong>
                  </p>
                  <p className="text-[11px] text-emerald-600">
                    Notifikasi tagihan otomatis siap dikirim ke penyewa.
                  </p>
                </div>
              </div>
            )}

            {/* ── Action Buttons ─────────────────────────────────────────────── */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/60">

              {/* Tombol Scan QR — tampil saat bukan connected, bukan qr_ready */}
              {!isConnected && !isQrReady && (
                <button
                  onClick={() => { checkStatus(); }}
                  disabled={loadingStatus}
                  className="skeu-button text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <span className={`material-symbols-outlined text-[16px] ${loadingStatus ? "animate-spin" : ""}`}>
                    {loadingStatus ? "sync" : "qr_code_2"}
                  </span>
                  {loadingStatus ? "Memeriksa Bot..." : "Hubungkan WhatsApp"}
                </button>
              )}

              {/* Tombol Ganti Nomor WA — selalu tampil */}
              {/* Fungsi: logout bot dari WA saat ini, generate QR baru untuk scan dengan nomor berbeda */}
              <button
                onClick={handleReset}
                disabled={resetLoading}
                className="skeu-button-secondary text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 text-amber-700"
              >
                <span className={`material-symbols-outlined text-[16px] ${resetLoading ? "animate-spin" : ""}`}>
                  {resetLoading ? "sync" : "phone_callback"}
                </span>
                {isConnected ? "Ganti Nomor WA" : "Scan QR Ulang"}
              </button>

            </div>

            {/* Info uptime */}
            {botStatus.uptime && botStatus.uptime !== "0s" && (
              <p className="text-[10px] text-slate-400 text-right">
                Bot uptime: {botStatus.uptime}
              </p>
            )}
          </div>

          {/* ── Template Editor ── */}
          <div className="skeu-card p-5 rounded-2xl space-y-4">
            <h2 className="font-bold text-slate-900 text-sm pb-3 border-b border-white/60">
              Custom Template Pesan WhatsApp
            </h2>

            {/* Toggle otomatis */}
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

            {/* Reminder timing */}
            <div>
              <label className="font-bold text-slate-700 block mb-2">
                Kirim Pengingat Sebelum Jatuh Tempo
              </label>
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
              <p className="text-[10px] text-slate-500 mt-1.5">
                Contoh: H-3 = pengingat dikirim 3 hari sebelum tanggal jatuh tempo.
              </p>
            </div>

            {/* Template */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">Template Pesan</label>
                <button
                  type="button"
                  onClick={() => setWaTemplate(DEFAULT_TEMPLATE)}
                  className="text-[10px] text-primary hover:underline font-bold"
                >
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
              {/* Variable pills */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {["{nama_kost}", "{nama_penyewa}", "{kamar}", "{nominal}", "{tanggal}", "{no_invoice}"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setWaTemplate((waTemplate || "") + v)}
                    className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-mono text-[10px] font-bold hover:bg-primary/20 transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Klik variabel untuk menyisipkan. Gunakan *teks* untuk bold.
              </p>
            </div>

            {/* Preview */}
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <p className="text-[11px] font-bold text-emerald-800 mb-1.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">preview</span>
                Preview Pesan:
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

            <button
              onClick={onSave}
              className="skeu-button w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              Simpan Template & Pengaturan
            </button>
          </div>
        </div>

        {/* ── Kolom Kanan: Test + Panduan ── */}
        <div className="lg:col-span-4 space-y-4">

          {/* Test Kirim Pesan */}
          <div className="skeu-card p-5 rounded-2xl space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-3 border-b border-white/60">
              <span className="material-symbols-outlined text-[18px] text-primary">send</span>
              Test Kirim Pesan
            </h3>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Nomor HP Tujuan</label>
              <input
                type="text"
                placeholder="081234567890"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-mono"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Pesan Test</label>
              <textarea
                rows={3}
                placeholder="Halo! Ini pesan test dari KOSTKU Bot 🤖"
                value={testMsg}
                onChange={(e) => setTestMsg(e.target.value)}
                className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
              />
            </div>
            <button
              onClick={handleTestSend}
              disabled={sendingTest || !isConnected}
              className="w-full skeu-button py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md disabled:opacity-60"
            >
              {sendingTest ? (
                <><span className="material-symbols-outlined text-[16px] animate-spin">sync</span> Mengirim...</>
              ) : (
                <><span className="material-symbols-outlined text-[16px]">send</span> Kirim Test</>
              )}
            </button>
            {!isConnected && (
              <p className="text-[10px] text-amber-700 font-bold text-center">
                ⚠️ Bot harus terhubung untuk kirim pesan
              </p>
            )}
          </div>

          {/* Panduan */}
          <div className="skeu-card p-5 rounded-2xl space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">help_center</span>
              Cara Hubungkan WhatsApp
            </h3>
            <div className="space-y-3 text-[11px] text-slate-600">
              {[
                { n: 1, t: "Pastikan bot berjalan di server (status bukan Tidak Terhubung)." },
                { n: 2, t: "Tunggu status berubah menjadi \"Menunggu Scan QR\"." },
                { n: 3, t: "QR Code akan muncul otomatis di halaman ini — tanpa buka link baru." },
                { n: 4, t: "Buka WhatsApp → Menu ⋮ → Linked Devices → Link a Device." },
                { n: 5, t: "Scan QR dengan kamera WA. Bot langsung aktif." },
                { n: 6, t: "Test kirim pesan untuk verifikasi bot berjalan." },
              ].map((s) => (
                <div key={s.n} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                    {s.n}
                  </span>
                  <span>{s.t}</span>
                </div>
              ))}
            </div>

            <div className="skeu-inset p-2.5 rounded-xl">
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Info Tombol</p>
              <div className="space-y-1.5 text-[11px] text-slate-600">
                <div className="flex items-start gap-1.5">
                  <span className="font-bold text-primary shrink-0">Ganti Nomor WA</span>
                  <span>→ Logout dari WA aktif. QR baru akan muncul untuk sambungkan nomor berbeda.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="font-bold text-primary shrink-0">Scan QR Ulang</span>
                  <span>→ Jika bot disconnect, klik ini untuk generate QR baru tanpa buka link baru.</span>
                </div>
              </div>
            </div>

            <div className="skeu-inset p-2.5 rounded-xl">
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Catatan</p>
              <p className="text-[11px] text-slate-600">
                Session WA tersimpan di server — tidak perlu scan ulang setiap restart Coolify. Scan hanya diperlukan saat pertama kali atau ganti nomor.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
