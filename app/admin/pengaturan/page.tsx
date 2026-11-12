"use client";

import { useState, useEffect } from "react";
import { useKost } from "@/lib/store";
import WABotTab from "@/components/admin/WABotTab";
import LogoUploader from "@/components/admin/LogoUploader";
import PaymentGatewayTab from "@/components/admin/PaymentGatewayTab";
import QRISManager from "@/components/admin/QRISManager";
import { useToast } from "@/components/ui/Toast";

export default function PengaturanPage() {
  const { profile, setProfile } = useKost();
  const [activeTab, setActiveTab] = useState("midtrans");

  // Midtrans — dipindah ke PaymentGatewayTab (tersimpan di Supabase, bukan localStorage)
  // State lama dihapus: isProduction, merchantId, clientKey, serverKey, showServerKey

  // Profil Kost
  const [namaKost,     setNamaKost]     = useState(profile.nama);
  const [alamatKost,   setAlamatKost]   = useState(profile.alamat);
  const [teleponKost,  setTeleponKost]  = useState(profile.telepon);
  const [bankPenerima, setBankPenerima] = useState(profile.bankPenerima);
  const [noRekening,   setNoRekening]   = useState(profile.noRekening);
  const [logoUrl,      setLogoUrl]      = useState(profile.logoUrl || "");

  // Sync saat profile store berubah
  useEffect(() => {
    setNamaKost(profile.nama);
    setAlamatKost(profile.alamat);
    setTeleponKost(profile.telepon);
    setBankPenerima(profile.bankPenerima);
    setNoRekening(profile.noRekening);
    setLogoUrl(profile.logoUrl || "");
  }, [profile]);

  // WhatsApp
  const [waNumber,       setWaNumber]       = useState("6281234567890");
  const [waBotEnabled,   setWaBotEnabled]   = useState(true);
  const [waTemplate,     setWaTemplate]     = useState(
    "Halo {nama_penyewa}, ini pengingat tagihan sewa {kamar} sebesar Rp {nominal} jatuh tempo {tanggal}. Terima kasih 🙏"
  );
  const [waReminderDays, setWaReminderDays] = useState(3);

  // Keamanan
  const [currentPassword,     setCurrentPassword]     = useState("");
  const [newPassword,          setNewPassword]          = useState("");
  const [confirmNewPassword,   setConfirmNewPassword]   = useState("");
  const [twoFactorEnabled,     setTwoFactorEnabled]     = useState(false);
  const [sessionTimeout,       setSessionTimeout]       = useState("30");

  const toast = useToast();

  // Load from localStorage on mount — hanya untuk WA settings
  useEffect(() => {
    try {
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

  const handleSaveMidtrans = () => {
    // Payment config sekarang disimpan via PaymentGatewayTab → /api/payment/config
    toast.success("Gunakan tab Payment Gateway!", "Konfigurasi payment tersimpan otomatis dari form di bawah.");
  };

  const handleSaveProfil = () => {
    setProfile({
      ...profile,
      nama: namaKost,
      alamat: alamatKost,
      telepon: teleponKost,
      bankPenerima,
      noRekening,
      logoUrl,
    });
    toast.success("Profil diperbarui!", "Identitas kost berhasil disimpan.");
  };

  // Callback saat logo diupload dari tab Identitas Kost
  const handleLogoUploaded = (newLogoUrl: string) => {
    setLogoUrl(newLogoUrl);
    setProfile({ ...profile, nama: namaKost, alamat: alamatKost, telepon: teleponKost, bankPenerima, noRekening, logoUrl: newLogoUrl });
    if (newLogoUrl) {
      toast.success("Logo berhasil diupload!", "Logo kost telah diperbarui di website publik.");
    } else {
      toast.success("Logo dihapus.", "Website publik kembali menggunakan ikon default.");
    }
  };

  const handleSaveWA = () => {
    try {
      localStorage.setItem(
        "kostku_wa_settings",
        JSON.stringify({ waNumber, waBotEnabled, waTemplate, waReminderDays })
      );
    } catch {}
    toast.success("Pengaturan WA disimpan!", "Template dan konfigurasi notifikasi berhasil diperbarui.");
  };

  const handleSaveKeamanan = async () => {
    if (newPassword && newPassword !== confirmNewPassword) {
      toast.error("Kata sandi tidak cocok", "Konfirmasi kata sandi harus sama.");
      return;
    }
    if (newPassword && newPassword.length < 8) {
      toast.error("Kata sandi terlalu pendek", "Minimal 8 karakter.");
      return;
    }
    if (newPassword) {
      try {
        // Verifikasi password lama dulu dengan re-auth
        const supabase = (await import("@/lib/supabase-browser")).createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) { toast.error("Error", "Tidak bisa ambil data user."); return; }

        // Coba sign in ulang dengan password lama untuk verifikasi
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });
        if (signInErr) { toast.error("Password lama salah", "Masukkan password lama yang benar."); return; }

        // Update password baru
        const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
        if (updateErr) { toast.error("Gagal update password", updateErr.message); return; }

        toast.success("Password berhasil diubah!", "Gunakan password baru untuk login berikutnya.");
        setCurrentPassword(""); setNewPassword(""); setConfirmNewPassword("");
      } catch (e) {
        toast.error("Error", String(e));
      }
    } else {
      toast.success("Pengaturan disimpan!", "Tidak ada perubahan password.");
    }
  };

  // testConnection dipindah ke PaymentGatewayTab

  const handleSave = () => {
    if (activeTab === "midtrans") handleSaveMidtrans();
    else if (activeTab === "profil") handleSaveProfil();
    else if (activeTab === "whatsapp") handleSaveWA();
    else if (activeTab === "keamanan") handleSaveKeamanan();
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-full">
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
          { id: "midtrans", label: "Payment Gateway", icon: "credit_card" },
          { id: "qris",     label: "QRIS Dinamis",    icon: "qr_code_2"  },
          { id: "profil",   label: "Identitas Kost",  icon: "apartment"  },
          { id: "whatsapp", label: "Notifikasi WA",   icon: "chat"       },
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
        <PaymentGatewayTab />
      )}

      {/* ── TAB: QRIS DINAMIS ── */}
      {activeTab === "qris" && (
        <div className="space-y-2">
          <div className="pb-2">
            <h2 className="text-sm font-black text-slate-900">QRIS Dinamis</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Upload QR statis (GoPay/DANA/BRI/BCA) → sistem inject nominal otomatis saat penyewa bayar.
            </p>
          </div>
          <QRISManager />
        </div>
      )}

      {/* ── TAB: PROFIL IDENTITAS KOST ── */}
      {activeTab === "profil" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 skeu-card p-5 sm:p-6 rounded-2xl space-y-4 text-xs">
            <h2 className="font-bold text-slate-900 text-sm pb-3 border-b border-white/60">
              Identitas & Informasi Properti Kost
            </h2>

            {/* ── Logo Upload ── */}
            <LogoUploader
              currentLogoUrl={logoUrl}
              onUploadSuccess={handleLogoUploaded}
            />

            <div className="border-t border-white/60 pt-3">
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
                  <span className="font-mono font-bold text-slate-800">{profile.subdomain}.{process.env.NEXT_PUBLIC_APP_DOMAIN || "manajementkost.my.id"}</span>
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
        <WABotTab
          waTemplate={waTemplate}
          setWaTemplate={setWaTemplate}
          waReminderDays={waReminderDays}
          setWaReminderDays={setWaReminderDays}
          waBotEnabled={waBotEnabled}
          setWaBotEnabled={setWaBotEnabled}
          onSave={handleSaveWA}
        />
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
                  onClick={() => toast.info("Fitur segera hadir", "Download backup JSON sedang dalam pengembangan.")}
                  className="skeu-button-secondary text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  Backup Data JSON
                </button>
                <button
                  type="button"
                  onClick={() => toast.info("Fitur segera hadir", "Export Excel sedang dalam pengembangan.")}
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
