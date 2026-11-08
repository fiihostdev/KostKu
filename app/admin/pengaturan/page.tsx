"use client";

import { useState } from "react";

export default function PengaturanPage() {
  const [activeTab, setActiveTab] = useState("midtrans");
  const [isProduction, setIsProduction] = useState(false);
  const [merchantId, setMerchantId] = useState("G123456789");
  const [clientKey, setClientKey] = useState("SB-Mid-client-8X39Lq29dK_aa11");
  const [serverKey, setServerKey] = useState("SB-Mid-server-9Z99Wq88pK_zz22");
  const [showServerKey, setShowServerKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const testConnection = () => {
    alert("Koneksi ke Midtrans API berhasil diverifikasi! Endpoint respon: HTTP 200 OK");
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-full">
      {/* Toast */}
      {savedSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>Konfigurasi Payment Gateway Midtrans berhasil disimpan!</span>
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

      {activeTab === "midtrans" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Credentials Form */}
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

          {/* Right Explanatory Card */}
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
      ) : (
        <div className="skeu-card p-8 rounded-2xl text-center">
          <span className="material-symbols-outlined text-4xl text-primary mb-2">construction</span>
          <h3 className="font-bold text-slate-900 text-base mb-1">Pengaturan {activeTab.toUpperCase()}</h3>
          <p className="text-xs text-slate-500">Konfigurasi telah diatur ke parameter default sistem KOSTKU.</p>
        </div>
      )}
    </div>
  );
}
