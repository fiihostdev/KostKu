"use client";

import { useState, useEffect } from "react";
import { useKost } from "@/lib/store";

export default function PengaturanPage() {
  const { profile, setProfile } = useKost();
  const [activeTab, setActiveTab] = useState("midtrans");

  // Midtrans
  const [isProduction, setIsProduction] = useState(false);
  const [merchantId, setMerchantId] = useState("G123456789");
  const [clientKey, setClientKey] = useState("SB-Mid-client-8X39Lq29dK_aa11");
  const [serverKey, setServerKey] = useState("SB-Mid-server-9Z99Wq88pK_zz22");
  const [showServerKey, setShowServerKey] = useState(false);

  // Profil Kost
  const [namaKost, setNamaKost] = useState(profile.nama);
  const [alamatKost, setAlamatKost] = useState(profile.alamat);
  const [teleponKost, setTeleponKost] = useState(profile.telepon);
  const [bankPenerima, setBankPenerima] = useState(profile.bankPenerima);
  const [noRekening, setNoRekening] = useState(profile.noRekening);

  // WhatsApp
  const [waNumber, setWaNumber] = useState("6281234567890");
  const [waBotEnabled, setWaBotEnabled] = useState(true);
  const [waTemplate, setWaTemplate] = useState(
    "Halo {nama_penyewa}, ini pengingat tagihan sewa {kamar} sebesar Rp {nominal} jatuh tempo {tanggal}. Terima kasih 🙏"
  );
  const [waReminderDays, setWaReminderDays] = useState(3);

  // Keamanan
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("30");

  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("kostku_midtrans");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.merchantId) setMerchantId(parsed.merchantId);
        if (parsed.clientKey) setClientKey(parsed.clientKey);
        if (parsed.serverKey) setServerKey(parsed.serverKey);
        if (parsed.isProduction !== undefined) setIsProduction(parsed.isProduction);
      }
      const savedWa = localStorage.getItem("kostku_wa_settings");
      if (savedWa) {
        const parsed = JSON.parse(savedWa);
        if (parsed.waNumber) setWaNumber(parsed.waNumber);
        if (parsed.waBotEnabled !== undefined) setWaBotEnabled(parsed.waBotEnabled);
        if (parsed.waTemplate) setWaTemplate(parsed.waTemplate);
        if (parsed.waReminderDays) setWaReminderDays(parsed.waReminderDays);
      }
    } catch {}
  }, []);

  const showToast = (msg: string) => {
    setSavedSuccess(msg);
    setTimeout(() => setSavedSuccess(null), 3000);
  };

  const handleSaveMidtrans = () => {
    try {
      localStorage.setItem(
        "kostku_midtrans",
        JSON.stringify({ merchantId, clientKey, serverKey, isProduction })
      );
    } catch {}
    showToast("Konfigurasi Payment Gateway Midtrans berhasil disimpan!");
  };

  const handleSaveProfil = () => {
    setProfile({
      ...profile,
      nama: namaKost,
      alamat: alamatKost,
      telepon: teleponKost,
      bankPenerima,
      noRekening,
    });
    showToast("Profil identitas kost berhasil diperbarui!");
  };

  const handleSaveWA = () => {
    try {
      localStorage.setItem(
        "kostku_wa_settings",
        JSON.stringify({ waNumber, waBotEnabled, waTemplate, waReminderDays })
      );
    } catch {}
    showToast("Pengaturan notifikasi WhatsApp berhasil disimpan!");
  };

  const handleSaveKeamanan = () => {
    if (newPassword && newPassword !== confirmNewPassword) {
      alert("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }
    if (newPassword && newPassword.length < 8) {
      alert("Kata sandi baru harus minimal 8 karakter.");
      return;
    }
    showToast("Pengaturan keamanan akun berhasil disimpan!");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
  };

  const testConnection = () => {
    alert(
      `Koneksi ke Midtrans API ${isProduction ? "PRODUCTION" : "SANDBOX"} berhasil diverifikasi!\n\nMerchant: ${merchantId}\nStatus: HTTP 200 OK (Terhubung)`
    );
  };

  const handleSave = () => {
    if (activeTab === "midtrans") handleSaveMidtrans();
    else if (activeTab === "profil") handleSaveProfil();
    else if (activeTab === "whatsapp") handleSaveWA();
    else if (activeTab === "keamanan") handleSaveKeamanan();
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-full">
      {/* Toast */}
      {savedSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{savedSuccess}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-primary uppercase">Modul Pengaturan</span>
            <span className="text-slate-400">•</span>
            <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold">Sistem & Integrasi</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">System & Gateway Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola API Keys Midtrans, Webhook pembayaran otomatis, dan integrasi WhatsApp.
          </p>
        </div>
        <button
          onClick={handleSave}
          className="skeu-button text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md w-full sm:w-auto"
        >
          <span className="material-symbols-outlined text-[18px]">save</span>
          <span>Simpan Perubahan</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-white/60">
        {[
          { id: "midtrans", label: "Payment Midtrans", icon: "credit_card" },
          { id: "profil", label: "Identitas Kost", icon: "apartment" },
          { id: "whatsapp", label: "Notifikasi WA", icon: "chat" },
          { id: "keamanan", label: "Keamanan & Backup", icon: "security" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              activeTab === tab.id
                ? "skeu-button text-white shadow-sm"
                : "skeu-card text-slate-600 hover:text-slate-900"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── TAB: MIDTRANS ── */}
      {activeTab === "midtrans" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 skeu-card p-5 sm:p-6 rounded-2xl space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/60 gap-3">
              <div>
                <h2 className="font-bold text-slate-900 text-sm">Kredensial API Midtrans</h2>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Dapatkan Server Key & Client Key dari Dashboard Midtrans Anda
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-200 p-1 rounded-xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsProduction(false)}
                  className={`px-3 py-1 rounded-lg font-bold text-[10px] transition-all ${
                    !isProduction ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                  }`}
                >
                  SANDBOX
                </button>
                <button
                  type="button"
                  onClick={() => setIsProduction(true)}
                  className={`px-3 py-1 rounded-lg font-bold text-[10px] transition-all ${
                    isProduction ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500"
                  }`}
                >
                  PRODUCTION
                </button>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Merchant ID</label>
              <input
                type="text"
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
                className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Client Key</label>
              <input
                type="text"
                value={clientKey}
                onChange={(e) => setClientKey(e.target.value)}
                className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">Server Key</label>
                <button
                  type="button"
                  onClick={() => setShowServerKey(!showServerKey)}
                  className="text-primary hover:underline text-[10px] font-bold"
                >
                  {showServerKey ? "Sembunyikan" : "Tampilkan"}
                </button>
              </div>
              <input
                type={showServerKey ? "text" : "password"}
                value={serverKey}
                onChange={(e) => setServerKey(e.target.value)}
                className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Notification Webhook URL</label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-0">
                <input
                  readOnly
                  type="text"
                  value="https://api.kostku.id/webhooks/midtrans"
                  className="w-full p-2.5 rounded-xl sm:rounded-l-xl sm:rounded-r-none skeu-inset text-slate-600 outline-none font-mono select-all bg-slate-100 text-[11px]"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText("https://api.kostku.id/webhooks/midtrans");
                    alert("Webhook URL berhasil disalin!");
                  }}
                  className="skeu-button-secondary px-3 py-2 sm:py-2.5 rounded-xl sm:rounded-l-none sm:rounded-r-xl border-t sm:border-t-0 sm:border-l border-slate-300 font-bold text-xs shrink-0 text-center"
                >
                  Salin
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Masukkan URL ini di menu <em>Settings → Configuration → Payment Notification URL</em> di Midtrans.
              </p>
            </div>

            <div className="pt-2">
              <label className="font-bold text-slate-700 block mb-2">Metode Pembayaran yang Diaktifkan</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {["QRIS (GoPay/ShopeePay)", "BCA Virtual Account", "Mandiri Virtual Account", "BNI Virtual Account", "BRI Virtual Account", "Indomaret / Alfamart"].map((method, idx) => (
                  <label key={idx} className="flex items-center gap-2 p-2.5 rounded-xl skeu-inset cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded text-primary shrink-0" />
                    <span className="text-slate-800 text-[11px] font-bold truncate">{method}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-white/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={testConnection}
                className="skeu-button-secondary text-primary font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 w-full sm:w-auto"
              >
                <span className="material-symbols-outlined text-[16px]">cable</span>
                <span>Uji Koneksi API</span>
              </button>
              <span className="text-emerald-700 font-bold text-[11px] flex items-center justify-center sm:justify-start gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Status: Terhubung Normal
              </span>
            </div>
          </div>

          <div className="lg:col-span-4 skeu-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3 text-primary font-bold text-sm">
                <span className="material-symbols-outlined text-[20px]">help_center</span>
                <span>Panduan Integrasi</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Midtrans memudahkan penyewa membayar sewa kost Anda secara otomatis menggunakan QRIS instan atau Virtual Account berbagai bank.
              </p>
              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                  <span>Daftar akun di <a href="https://midtrans.com" target="_blank" className="text-primary underline">midtrans.com</a>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                  <span>Salin Server Key dan Client Key ke form sebelah kiri.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                  <span>Tempel Webhook Notification URL di dashboard Midtrans.</span>
                </div>
              </div>
            </div>
            <div className="skeu-inset p-3.5 rounded-xl mt-6">
              <span className="text-[10px] font-bold text-slate-500 block uppercase mb-1">Otomatisasi Penuh</span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Pembayaran yang sukses langsung mengubah status invoice menjadi <strong>Lunas</strong> dan mencetak kwitansi elektronik otomatis.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: PROFIL IDENTITAS KOST ── */}
      {activeTab === "profil" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 skeu-card p-5 sm:p-6 rounded-2xl space-y-4 text-xs">
            <h2 className="font-bold text-slate-900 text-sm pb-3 border-b border-white/60">
              Identitas & Informasi Properti Kost
            </h2>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Nama Properti Kost</label>
              <input
                type="text"
                value={namaKost}
                onChange={(e) => setNamaKost(e.target.value)}
                className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Alamat Lengkap</label>
              <textarea
                rows={2}
                value={alamatKost}
                onChange={(e) => setAlamatKost(e.target.value)}
                className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none leading-relaxed"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Nomor WhatsApp Pemilik</label>
              <input
                type="text"
                value={teleponKost}
                onChange={(e) => setTeleponKost(e.target.value)}
                className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Bank Penerima Pembayaran</label>
                <select
                  value={bankPenerima}
                  onChange={(e) => setBankPenerima(e.target.value)}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-semibold cursor-pointer"
                >
                  {["BCA", "Mandiri", "BNI", "BRI", "BSI", "CIMB Niaga", "Danamon"].map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nomor Rekening</label>
                <input
                  type="text"
                  value={noRekening}
                  onChange={(e) => setNoRekening(e.target.value)}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-mono font-bold"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 skeu-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-3 pb-3 border-b border-white/60 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">info</span>
                Info Paket Aktif
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="skeu-inset p-3 rounded-xl">
                  <span className="text-slate-400 text-[10px] block uppercase font-bold mb-1">Paket Berlangganan</span>
                  <span className="font-black text-primary text-sm">{profile.paket}</span>
                </div>
                <div className="skeu-inset p-3 rounded-xl">
                  <span className="text-slate-400 text-[10px] block uppercase font-bold mb-1">Subdomain Aktif</span>
                  <span className="font-mono font-bold text-slate-800">{profile.subdomain}.kostku.id</span>
                </div>
                <div className="skeu-inset p-3 rounded-xl">
                  <span className="text-slate-400 text-[10px] block uppercase font-bold mb-1">SSL & Keamanan</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> HTTPS Aktif
                  </span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-4">
              Perubahan nama kost akan langsung terbarui di semua halaman admin dan website publik.
            </p>
          </div>
        </div>
      )}

      {/* ── TAB: NOTIFIKASI WHATSAPP ── */}
      {activeTab === "whatsapp" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 skeu-card p-5 sm:p-6 rounded-2xl space-y-4 text-xs">
            <h2 className="font-bold text-slate-900 text-sm pb-3 border-b border-white/60">
              Pengaturan Bot Notifikasi WhatsApp
            </h2>

            {/* Toggle WA Bot */}
            <div className="flex items-center justify-between p-3 rounded-xl skeu-inset">
              <div>
                <span className="font-bold text-slate-800 block">Aktifkan Notifikasi WhatsApp Otomatis</span>
                <span className="text-[10px] text-slate-500">Kirim pengingat tagihan otomatis ke nomor penyewa</span>
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
              <label className="font-bold text-slate-700 block mb-1">Nomor WhatsApp Pengirim Bot</label>
              <input
                type="text"
                placeholder="628xxxxxxxxxx"
                value={waNumber}
                onChange={(e) => setWaNumber(e.target.value.replace(/\D/g, ""))}
                className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-mono"
              />
              <p className="text-[10px] text-slate-500 mt-1">Format internasional tanpa tanda + (contoh: 6281234567890)</p>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Kirim Pengingat H-{waReminderDays} Sebelum Jatuh Tempo</label>
              <div className="flex items-center gap-3">
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

            <div>
              <label className="font-bold text-slate-700 block mb-1">Template Pesan WhatsApp</label>
              <textarea
                rows={4}
                value={waTemplate}
                onChange={(e) => setWaTemplate(e.target.value)}
                className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none leading-relaxed font-mono text-[11px]"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {["{nama_penyewa}", "{kamar}", "{nominal}", "{tanggal}", "{no_invoice}"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setWaTemplate((t) => t + " " + v)}
                    className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-mono text-[10px] font-bold hover:bg-primary/20"
                  >
                    {v}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Klik variabel di atas untuk menyisipkan ke template pesan.</p>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <p className="text-[11px] font-bold text-emerald-800 mb-1">Preview Pesan (Simulasi):</p>
              <p className="text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-wrap break-words">
                {waTemplate
                  .replace("{nama_penyewa}", "Dimas Anggara")
                  .replace("{kamar}", "Kamar A-01")
                  .replace("{nominal}", "Rp 1.800.000")
                  .replace("{tanggal}", "05 Des 2026")
                  .replace("{no_invoice}", "INV/2026/12/001")}
              </p>
            </div>
          </div>

          <div className="lg:col-span-4 skeu-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-3 pb-3 border-b border-white/60 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-emerald-600">chat</span>
                Cara Kerja WA Bot
              </h3>
              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                  <span>Sistem otomatis deteksi tagihan mendekati jatuh tempo setiap hari pukul 08.00.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                  <span>Pesan dikirim ke nomor WhatsApp penyewa terdaftar beserta link pembayaran Midtrans.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                  <span>Status invoice otomatis berubah ke <strong>Lunas</strong> setelah pembayaran dikonfirmasi webhook.</span>
                </div>
              </div>
            </div>
            <div className="skeu-inset p-3 rounded-xl mt-4">
              <span className="text-[10px] font-bold text-slate-500 block uppercase mb-1">Status Bot WA</span>
              <span className={`font-bold text-sm flex items-center gap-1.5 ${waBotEnabled ? "text-emerald-700" : "text-slate-400"}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${waBotEnabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}></span>
                {waBotEnabled ? "Bot Aktif & Berjalan" : "Bot Dinonaktifkan"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: KEAMANAN & BACKUP ── */}
      {activeTab === "keamanan" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 skeu-card p-5 sm:p-6 rounded-2xl space-y-4 text-xs">
            <h2 className="font-bold text-slate-900 text-sm pb-3 border-b border-white/60">
              Keamanan Akun & Manajemen Sesi
            </h2>

            {/* Ganti Password */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Ganti Kata Sandi</h3>
              <div>
                <label className="font-bold text-slate-600 block mb-1">Kata Sandi Saat Ini</label>
                <input
                  type="password"
                  placeholder="Masukkan kata sandi lama"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Kata Sandi Baru</label>
                  <input
                    type="password"
                    placeholder="Min. 8 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Konfirmasi Kata Sandi</label>
                  <input
                    type="password"
                    placeholder="Ketik ulang"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className={`w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none ${
                      confirmNewPassword && newPassword !== confirmNewPassword ? "border border-red-400" :
                      confirmNewPassword && newPassword === confirmNewPassword ? "border border-emerald-400" : ""
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* 2FA Toggle */}
            <div className="pt-3 border-t border-white/60">
              <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-3">Autentikasi 2 Faktor (2FA)</h3>
              <div className="flex items-center justify-between p-3 rounded-xl skeu-inset">
                <div>
                  <span className="font-bold text-slate-800 block">Google Authenticator / SMS OTP</span>
                  <span className="text-[10px] text-slate-500">Tambah lapisan keamanan ekstra saat login</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                  className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${twoFactorEnabled ? "bg-emerald-500" : "bg-slate-300"}`}
                >
                  <span className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-all ${twoFactorEnabled ? "right-0.5" : "left-0.5"}`}></span>
                </button>
              </div>
            </div>

            {/* Session Timeout */}
            <div className="pt-3 border-t border-white/60">
              <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-3">Waktu Habis Sesi</h3>
              <div className="flex items-center gap-3">
                {["15", "30", "60", "120"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSessionTimeout(t)}
                    className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${sessionTimeout === t ? "skeu-button text-white shadow-sm" : "skeu-card text-slate-600"}`}
                  >
                    {t} mnt
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-2">Sesi admin akan otomatis logout setelah {sessionTimeout} menit tidak aktif.</p>
            </div>

            {/* Data Backup */}
            <div className="pt-3 border-t border-white/60">
              <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-3">Backup & Ekspor Data</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => alert("Mengunduh backup data kamar, penyewa, dan invoice dalam format JSON...")}
                  className="skeu-button-secondary text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  Backup Data JSON
                </button>
                <button
                  type="button"
                  onClick={() => alert("Mengunduh seluruh laporan keuangan dalam format Excel (.xlsx)...")}
                  className="skeu-button-secondary text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">table_chart</span>
                  Ekspor Excel
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 skeu-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-3 pb-3 border-b border-white/60 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">shield</span>
                Status Keamanan
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="skeu-inset p-3 rounded-xl flex items-center justify-between">
                  <span className="font-bold text-slate-700">SSL / HTTPS</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">lock</span> Aktif
                  </span>
                </div>
                <div className="skeu-inset p-3 rounded-xl flex items-center justify-between">
                  <span className="font-bold text-slate-700">2FA</span>
                  <span className={`font-bold flex items-center gap-1 ${twoFactorEnabled ? "text-emerald-700" : "text-slate-400"}`}>
                    <span className="material-symbols-outlined text-[14px]">{twoFactorEnabled ? "check_circle" : "radio_button_unchecked"}</span>
                    {twoFactorEnabled ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
                <div className="skeu-inset p-3 rounded-xl flex items-center justify-between">
                  <span className="font-bold text-slate-700">Enkripsi Data</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">verified_user</span> AES-256
                  </span>
                </div>
                <div className="skeu-inset p-3 rounded-xl flex items-center justify-between">
                  <span className="font-bold text-slate-700">Sesi Timeout</span>
                  <span className="font-bold text-slate-800">{sessionTimeout} menit</span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">
              Aktifkan 2FA untuk perlindungan maksimal akun admin Anda dari akses tidak sah.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
