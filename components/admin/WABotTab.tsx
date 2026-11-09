"use client";

import { useState, useEffect, useCallback } from "react";

const BOT_URL = process.env.NEXT_PUBLIC_APP_URL
  ? "https://wiya3dh8uopgirnwkgmuolug.fiihosting.my.id"
  : "https://wiya3dh8uopgirnwkgmuolug.fiihosting.my.id";

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
  const [testPhone, setTestPhone] = useState("");
  const [testMsg, setTestMsg] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // Cek status bot
  const checkStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch(`/api/notify/bot-status`);
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

  // Auto-refresh status setiap 10 detik
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  // Reset bot (ganti nomor WA)
  const handleReset = async () => {
    if (!confirm("Reset bot akan logout dari WA. Anda perlu scan QR ulang. Lanjutkan?")) return;
    setResetLoading(true);
    try {
      const res = await fetch("/api/notify/bot-reset", { method: "POST" });
      if (res.ok) {
        showToast("success", "Bot di-reset. Buka halaman QR untuk scan ulang.");
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

  // Kirim test message
  const handleTestSend = async () => {
    if (!testPhone || !testMsg) {
      showToast("error", "Isi nomor HP dan pesan test terlebih dahulu.");
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
    connected: { color: "text-emerald-700", bg: "bg-emerald-500", label: "Terhubung & Aktif" },
    qr_ready: { color: "text-amber-700", bg: "bg-amber-500 animate-pulse", label: "Menunggu Scan QR" },
    connecting: { color: "text-blue-700", bg: "bg-blue-500 animate-pulse", label: "Sedang Menghubungkan..." },
    disconnected: { color: "text-red-700", bg: "bg-red-500", label: "Tidak Terhubung" },
    logged_out: { color: "text-slate-700", bg: "bg-slate-400", label: "Logged Out" },
    unknown: { color: "text-slate-500", bg: "bg-slate-300", label: "Mengecek status..." },
  };

  const sc = statusConfig[botStatus.status] || statusConfig.unknown;

  return (
    <div className="space-y-6 text-xs">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-fadeInUp ${
          toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
        }`}>
          <span className="material-symbols-outlined text-[18px]">
            {toast.type === "success" ? "check_circle" : "error"}
          </span>
          <span>{toast.msg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── Kolom Kiri: Status + Template ── */}
        <div className="lg:col-span-8 space-y-5">

          {/* Status Card */}
          <div className="skeu-card p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/60">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-emerald-600">phone_android</span>
                Status WhatsApp Bot (Baileys)
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Status */}
              <div className="skeu-inset p-3 rounded-xl col-span-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Status</span>
                <span className={`font-bold flex items-center gap-1.5 ${sc.color}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${sc.bg} shrink-0`}></span>
                  {sc.label}
                </span>
              </div>
              {/* Nomor WA */}
              <div className="skeu-inset p-3 rounded-xl col-span-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Nomor Aktif</span>
                <span className="font-bold text-slate-800 font-mono text-[11px]">
                  {botStatus.phone ? `+${botStatus.phone.replace("@s.whatsapp.net", "")}` : "—"}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/60">
              {/* Scan QR */}
              {(botStatus.status === "qr_ready" || botStatus.status === "disconnected" || botStatus.status === "connecting") && (
                <a
                  href={`${BOT_URL}/qr`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="skeu-button text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                  {botStatus.status === "qr_ready" ? "Scan QR Sekarang →" : "Buka Halaman QR"}
                </a>
              )}

              {/* Reset / Ganti Nomor */}
              <button
                onClick={handleReset}
                disabled={resetLoading}
                className="skeu-button-secondary text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 text-amber-700"
              >
                <span className={`material-symbols-outlined text-[16px] ${resetLoading ? "animate-spin" : ""}`}>
                  {resetLoading ? "sync" : "phone_callback"}
                </span>
                Ganti Nomor WA
              </button>

              {/* Status di server */}
              <a
                href={`${BOT_URL}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="skeu-button-secondary text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 text-slate-600"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                Buka Bot Panel
              </a>
            </div>

            {/* QR Banner */}
            {botStatus.status === "qr_ready" && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0">qr_code_scanner</span>
                <div>
                  <p className="font-bold text-amber-800 text-xs">QR Code tersedia — perlu di-scan!</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Buka WhatsApp → Menu ⋮ → Linked Devices → Link a Device → Scan QR
                  </p>
                  <a
                    href={`${BOT_URL}/qr`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary font-bold text-[11px] mt-1 hover:underline"
                  >
                    Buka QR Code →
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Template Editor */}
          <div className="skeu-card p-5 rounded-2xl space-y-4">
            <h2 className="font-bold text-slate-900 text-sm pb-3 border-b border-white/60">
              Custom Template Pesan WhatsApp
            </h2>

            {/* Toggle */}
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
              <label className="font-bold text-slate-700 block mb-2">Kirim Pengingat Sebelum Jatuh Tempo</label>
              <div className="flex items-center gap-2 flex-wrap">
                {[1, 3, 5, 7].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setWaReminderDays(d)}
                    className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${waReminderDays === d ? "skeu-button text-white shadow-sm" : "skeu-card text-slate-600"}`}
                  >
                    H-{d}
                  </button>
                ))}
              </div>
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
                    onClick={() => setWaTemplate(waTemplate + v)}
                    className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-mono text-[10px] font-bold hover:bg-primary/20 transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Klik variabel untuk menyisipkan. Gunakan *teks* untuk bold, `teks` untuk kode.
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

        {/* ── Kolom Kanan: Test Send + Panduan ── */}
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
              disabled={sendingTest || botStatus.status !== "connected"}
              className="w-full skeu-button py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md disabled:opacity-60"
            >
              {sendingTest ? (
                <><span className="material-symbols-outlined text-[16px] animate-spin">sync</span> Mengirim...</>
              ) : (
                <><span className="material-symbols-outlined text-[16px]">send</span> Kirim Test</>
              )}
            </button>
            {botStatus.status !== "connected" && (
              <p className="text-[10px] text-amber-700 font-bold text-center">
                ⚠️ Bot harus terhubung untuk kirim pesan
              </p>
            )}
          </div>

          {/* Panduan Setup */}
          <div className="skeu-card p-5 rounded-2xl space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">help_center</span>
              Panduan Setup Bot
            </h3>
            <div className="space-y-3 text-[11px] text-slate-600">
              {[
                { n: 1, t: "Bot sudah berjalan di server Coolify." },
                { n: 2, t: "Klik tombol \"Scan QR Sekarang\" saat status QR tersedia." },
                { n: 3, t: "Buka WhatsApp → Menu ⋮ → Linked Devices → Link a Device." },
                { n: 4, t: "Scan QR dengan kamera WA. Bot langsung aktif." },
                { n: 5, t: "Test kirim pesan untuk verifikasi bot berjalan." },
              ].map((s) => (
                <div key={s.n} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">{s.n}</span>
                  <span>{s.t}</span>
                </div>
              ))}
            </div>
            <div className="skeu-inset p-2.5 rounded-xl">
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Catatan Penting</p>
              <p className="text-[11px] text-slate-600">
                Session WA tersimpan di server — tidak perlu scan ulang setiap restart. Ganti nomor WA dengan tombol "Ganti Nomor WA".
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
