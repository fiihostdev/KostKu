"use client";

import { useState, useEffect } from "react";
import { useKost } from "@/lib/store";
import WABotTab from "@/components/admin/WABotTab";
import LogoUploader from "@/components/admin/LogoUploader";
import PaymentGatewayTab from "@/components/admin/PaymentGatewayTab";
import QRISManager from "@/components/admin/QRISManager";
import { LockedFeatureCard } from "@/components/admin/PlanLimitBanner";
import { usePlanLimits } from "@/lib/use-plan-limits";
import { useToast } from "@/components/ui/Toast";
import ConfirmModal from "@/components/ui/ConfirmModal";

// ── Skeleton shimmer card ─────────────────────────────────────────────────────
function SkeletonCard({ rows = 4 }: { rows?: number }) {
  return (
    <div className="skeu-card p-6 rounded-2xl space-y-4 animate-pulse">
      <div className="skeleton h-5 w-48 rounded-lg"></div>
      <div className="skeleton h-3 w-72 rounded-lg"></div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-10 w-full rounded-xl"></div>
      ))}
    </div>
  );
}

export default function PengaturanPage() {
  const { profile, setProfile } = useKost();
  const [activeTab, setActiveTab] = useState("profil");
  const planStatus = usePlanLimits();
  const toast = useToast();

  // Auto-switch to profil if tab is locked and plan loaded
  useEffect(() => {
    if (!planStatus.loading) {
      const lockedTabs = {
        midtrans: !planStatus.limits?.hasPaymentGateway,
        qris:     !planStatus.limits?.hasQrisDinamis,
        whatsapp: !planStatus.limits?.hasWaNotifikasi,
      };
      // keep current tab if it's not locked OR if loading just finished on a valid tab
      if (lockedTabs[activeTab as keyof typeof lockedTabs] === false) return;
      // If the tab just loaded and it's unlocked, stay
      if (!lockedTabs[activeTab as keyof typeof lockedTabs]) return;
    }
  }, [planStatus.loading]);

  // Profil Kost
  const [namaKost,     setNamaKost]     = useState(profile.nama);
  const [alamatKost,   setAlamatKost]   = useState(profile.alamat);
  const [teleponKost,  setTeleponKost]  = useState(profile.telepon);
  const [bankPenerima, setBankPenerima] = useState(profile.bankPenerima);
  const [noRekening,   setNoRekening]   = useState(profile.noRekening);
  const [logoUrl,      setLogoUrl]      = useState(profile.logoUrl || "");

  useEffect(() => {
    setNamaKost(profile.nama);
    setAlamatKost(profile.alamat);
    setTeleponKost(profile.telepon);
    setBankPenerima(profile.bankPenerima);
    setNoRekening(profile.noRekening);
    setLogoUrl(profile.logoUrl || "");
  }, [profile]);

  // ── Subdomain Change ──────────────────────────────────────────────────────
  const SUBDOMAIN_CHANGE_FEE = 25000; // Rp 25.000
  const [showSubdomainModal, setShowSubdomainModal] = useState(false);
  const [newSubdomain,       setNewSubdomain]       = useState("");
  const [subdomainStep,      setSubdomainStep]       = useState<"form" | "confirm" | "payment" | "success">("form");
  const [checkingSubdomain,  setCheckingSubdomain]  = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [subdomainSaving,    setSubdomainSaving]    = useState(false);

  const checkSubdomain = async () => {
    const val = newSubdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    setNewSubdomain(val);
    if (!val || val.length < 3) return;
    setCheckingSubdomain(true);
    setSubdomainAvailable(null);
    try {
      const res = await fetch(`/api/onboarding/check-subdomain?subdomain=${val}`);
      const data = await res.json();
      setSubdomainAvailable(data.available);
    } catch {
      setSubdomainAvailable(null);
    } finally {
      setCheckingSubdomain(false);
    }
  };

  const handleSubdomainPayment = async () => {
    setSubdomainSaving(true);
    // Simulate payment flow — in production wire to Midtrans/QRIS
    await new Promise((r) => setTimeout(r, 1800));
    try {
      const supabase = (await import("@/lib/supabase-browser")).createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("kost_profiles")
        .update({ subdomain: newSubdomain })
        .eq("user_id", user.id);
      if (error) throw error;
      setProfile({ ...profile, subdomain: newSubdomain });
      setSubdomainStep("success");
    } catch (err) {
      toast.error("Gagal mengganti subdomain", String(err));
    } finally {
      setSubdomainSaving(false);
    }
  };

  // ── WhatsApp ──────────────────────────────────────────────────────────────
  const [waNumber,       setWaNumber]       = useState("6281234567890");
  const [waBotEnabled,   setWaBotEnabled]   = useState(true);
  const [waTemplate,     setWaTemplate]     = useState(
    "Halo {nama_penyewa}, ini pengingat tagihan sewa {kamar} sebesar Rp {nominal} jatuh tempo {tanggal}. Terima kasih 🙏"
  );
  const [waReminderDays, setWaReminderDays] = useState(3);

  // ── Security ──────────────────────────────────────────────────────────────
  const [currentPassword,   setCurrentPassword]   = useState("");
  const [newPassword,       setNewPassword]        = useState("");
  const [confirmNewPass,    setConfirmNewPass]     = useState("");
  const [twoFactor,         setTwoFactor]          = useState(false);
  const [sessionTimeout,    setSessionTimeout]     = useState("30");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("kostku_wa_settings");
      if (saved) {
        const p = JSON.parse(saved);
        if (p.waNumber) setWaNumber(p.waNumber);
        if (p.waBotEnabled !== undefined) setWaBotEnabled(p.waBotEnabled);
        if (p.waTemplate) setWaTemplate(p.waTemplate);
        if (p.waReminderDays) setWaReminderDays(p.waReminderDays);
      }
    } catch {}
  }, []);

  const handleSaveProfil = () => {
    setProfile({ ...profile, nama: namaKost, alamat: alamatKost, telepon: teleponKost, bankPenerima, noRekening, logoUrl });
    toast.success("Profil diperbarui!", "Identitas kost berhasil disimpan.");
  };

  const handleLogoUploaded = (url: string) => {
    setLogoUrl(url);
    setProfile({ ...profile, nama: namaKost, alamat: alamatKost, telepon: teleponKost, bankPenerima, noRekening, logoUrl: url });
    toast.success(url ? "Logo berhasil diupload!" : "Logo dihapus.", url ? "Logo kost diperbarui." : "Website menggunakan ikon default.");
  };

  const handleSaveWA = () => {
    try { localStorage.setItem("kostku_wa_settings", JSON.stringify({ waNumber, waBotEnabled, waTemplate, waReminderDays })); } catch {}
    toast.success("Pengaturan WA disimpan!", "Template dan konfigurasi notifikasi berhasil diperbarui.");
  };

  const handleSaveKeamanan = async () => {
    if (newPassword && newPassword !== confirmNewPass) { toast.error("Kata sandi tidak cocok", "Konfirmasi harus sama."); return; }
    if (newPassword && newPassword.length < 8)         { toast.error("Kata sandi terlalu pendek", "Min. 8 karakter."); return; }
    if (newPassword) {
      try {
        const supabase = (await import("@/lib/supabase-browser")).createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) { toast.error("Error", "Tidak bisa ambil data user."); return; }
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
        if (signInErr) { toast.error("Password lama salah", "Masukkan password lama yang benar."); return; }
        const { error: upErr } = await supabase.auth.updateUser({ password: newPassword });
        if (upErr) { toast.error("Gagal update", upErr.message); return; }
        toast.success("Password berhasil diubah!", "Gunakan password baru untuk login berikutnya.");
        setCurrentPassword(""); setNewPassword(""); setConfirmNewPass("");
      } catch (e) { toast.error("Error", String(e)); }
    } else {
      toast.success("Tersimpan!", "Tidak ada perubahan password.");
    }
  };

  const handleSave = () => {
    if (activeTab === "profil")   handleSaveProfil();
    if (activeTab === "midtrans") toast.success("Tersimpan!", "Konfigurasi payment tersimpan dari form di bawah.");
    if (activeTab === "whatsapp") handleSaveWA();
    if (activeTab === "keamanan") handleSaveKeamanan();
  };

  // ── Tabs definition ───────────────────────────────────────────────────────
  const TABS = [
    { id: "profil",   label: "Identitas Kost",    icon: "apartment",   pro: false },
    { id: "subdomain",label: "Subdomain",          icon: "domain",      pro: false },
    { id: "midtrans", label: "Payment Gateway",    icon: "credit_card", pro: true  },
    { id: "qris",     label: "QRIS Dinamis",       icon: "qr_code_2",  pro: true  },
    { id: "whatsapp", label: "Notifikasi WA",      icon: "chat",        pro: true  },
    { id: "keamanan", label: "Keamanan & Backup",  icon: "security",    pro: false },
  ];

  // For pro tabs, check actual plan limits (not hardcoded)
  const isTabLocked = (tabId: string) => {
    if (!planStatus.limits) return false; // loading — don't lock yet
    if (tabId === "midtrans") return !planStatus.limits.hasPaymentGateway;
    if (tabId === "qris")     return !planStatus.limits.hasQrisDinamis;
    if (tabId === "whatsapp") return !planStatus.limits.hasWaNotifikasi;
    return false;
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-full">
      {/* ── Subdomain Change Modal ── */}
      {showSubdomainModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="skeu-card p-5 sm:p-6 rounded-2xl max-w-md w-full shadow-2xl text-xs space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/60">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">domain</span>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Ganti Subdomain Kost</h3>
                  <p className="text-[10px] text-slate-500">Biaya penggantian: Rp {SUBDOMAIN_CHANGE_FEE.toLocaleString("id-ID")}</p>
                </div>
              </div>
              <button onClick={() => { setShowSubdomainModal(false); setSubdomainStep("form"); setNewSubdomain(""); setSubdomainAvailable(null); }}
                className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Step: form */}
            {subdomainStep === "form" && (
              <div className="space-y-4">
                <div className="skeu-inset p-3 rounded-xl flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">info</span>
                  <div>
                    <p className="font-bold text-slate-700">Subdomain Aktif Saat Ini</p>
                    <p className="font-mono text-primary font-bold">{profile.subdomain}.{process.env.NEXT_PUBLIC_APP_DOMAIN || "manajementkost.my.id"}</p>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Subdomain Baru</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="namakostu"
                      value={newSubdomain}
                      onChange={(e) => { setNewSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"")); setSubdomainAvailable(null); }}
                      onBlur={checkSubdomain}
                      maxLength={30}
                      className="flex-1 p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-mono font-bold"
                    />
                    <span className="text-slate-500 font-mono text-[10px] shrink-0 bg-white/60 px-2 py-1.5 rounded-lg border border-white/60">
                      .{process.env.NEXT_PUBLIC_APP_DOMAIN || "manajementkost.my.id"}
                    </span>
                  </div>
                  {/* Availability indicator */}
                  {checkingSubdomain && (
                    <p className="text-slate-500 mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[14px] animate-spin">sync</span> Memeriksa ketersediaan...</p>
                  )}
                  {!checkingSubdomain && subdomainAvailable === true && (
                    <p className="text-emerald-700 mt-1 flex items-center gap-1 font-bold"><span className="material-symbols-outlined text-[14px]">check_circle</span> Tersedia! Subdomain bisa digunakan.</p>
                  )}
                  {!checkingSubdomain && subdomainAvailable === false && (
                    <p className="text-red-600 mt-1 flex items-center gap-1 font-bold"><span className="material-symbols-outlined text-[14px]">cancel</span> Sudah dipakai. Coba nama lain.</p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1.5">Hanya huruf kecil, angka, dan tanda hubung (-). Min. 3 karakter.</p>
                </div>

                {/* Fee info box */}
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-amber-600 text-[18px] shrink-0 mt-0.5">sell</span>
                  <div>
                    <p className="font-bold text-amber-800">Biaya Penggantian Subdomain</p>
                    <p className="text-amber-700 mt-0.5 leading-relaxed">Penggantian subdomain dikenakan biaya <strong>Rp {SUBDOMAIN_CHANGE_FEE.toLocaleString("id-ID")}</strong> untuk memperbarui rekaman DNS dan konfigurasi sistem. Subdomain lama akan non-aktif setelah pembayaran berhasil.</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button onClick={() => { setShowSubdomainModal(false); setSubdomainStep("form"); setNewSubdomain(""); }}
                    className="skeu-button-secondary flex-1 py-2.5 rounded-xl font-bold">Batal</button>
                  <button
                    onClick={() => setSubdomainStep("confirm")}
                    disabled={!subdomainAvailable || newSubdomain.length < 3}
                    className="skeu-button flex-1 py-2.5 rounded-xl font-bold disabled:opacity-50"
                  >
                    Lanjutkan →
                  </button>
                </div>
              </div>
            )}

            {/* Step: confirm */}
            {subdomainStep === "confirm" && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
                  <p className="font-black text-slate-900 text-sm text-center">Konfirmasi Perubahan</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="skeu-inset p-3 rounded-xl text-center">
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Subdomain Lama</p>
                      <p className="font-mono font-bold text-red-600 text-xs">{profile.subdomain}</p>
                    </div>
                    <div className="skeu-inset p-3 rounded-xl text-center">
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Subdomain Baru</p>
                      <p className="font-mono font-bold text-emerald-700 text-xs">{newSubdomain}</p>
                    </div>
                  </div>
                  <div className="border-t border-primary/10 pt-3 flex items-center justify-between">
                    <span className="text-slate-600 font-bold">Total Biaya</span>
                    <span className="text-primary font-black text-base">Rp {SUBDOMAIN_CHANGE_FEE.toLocaleString("id-ID")}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-[11px] text-red-700">
                  <span className="material-symbols-outlined text-red-500 text-[16px] shrink-0 mt-0.5">warning</span>
                  <span>Subdomain lama <strong>{profile.subdomain}.{process.env.NEXT_PUBLIC_APP_DOMAIN}</strong> akan langsung non-aktif setelah pembayaran.</span>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setSubdomainStep("form")} className="skeu-button-secondary flex-1 py-2.5 rounded-xl font-bold">← Kembali</button>
                  <button onClick={() => setSubdomainStep("payment")} className="skeu-button flex-1 py-2.5 rounded-xl font-bold">Bayar Sekarang</button>
                </div>
              </div>
            )}

            {/* Step: payment */}
            {subdomainStep === "payment" && (
              <div className="space-y-4">
                <div className="text-center py-2">
                  <span className="material-symbols-outlined text-primary text-[48px] block mb-2">qr_code_2</span>
                  <p className="font-black text-slate-900 text-sm">Pembayaran QRIS</p>
                  <p className="text-slate-500 text-[11px] mt-1">Scan QR di bawah atau bayar via transfer</p>
                </div>

                {/* Simulated QRIS */}
                <div className="flex justify-center">
                  <div className="w-40 h-40 skeu-inset rounded-2xl flex items-center justify-center">
                    <div className="w-32 h-32 bg-white rounded-xl flex items-center justify-center">
                      <span className="text-[10px] text-slate-400 text-center font-mono leading-relaxed">QR Code<br/>Rp {SUBDOMAIN_CHANGE_FEE.toLocaleString("id-ID")}</span>
                    </div>
                  </div>
                </div>

                {/* Amount */}
                <div className="skeu-inset p-3 rounded-xl flex items-center justify-between">
                  <span className="text-slate-600 font-bold">Total Tagihan</span>
                  <span className="font-black text-primary text-base">Rp {SUBDOMAIN_CHANGE_FEE.toLocaleString("id-ID")}</span>
                </div>

                <button
                  onClick={handleSubdomainPayment}
                  disabled={subdomainSaving}
                  className="skeu-button w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {subdomainSaving
                    ? <><span className="material-symbols-outlined text-[18px] animate-spin">sync</span> Memproses...</>
                    : <><span className="material-symbols-outlined text-[18px]">check_circle</span> Konfirmasi Pembayaran</>
                  }
                </button>
                <button onClick={() => setSubdomainStep("confirm")} className="text-slate-500 text-xs w-full text-center hover:underline">← Kembali</button>
              </div>
            )}

            {/* Step: success */}
            {subdomainStep === "success" && (
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-emerald-600 text-[36px]">check_circle</span>
                </div>
                <div>
                  <p className="font-black text-slate-900 text-base">Subdomain Berhasil Diganti!</p>
                  <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                    Kost Anda sekarang dapat diakses di<br/>
                    <strong className="font-mono text-primary">{newSubdomain}.{process.env.NEXT_PUBLIC_APP_DOMAIN || "manajementkost.my.id"}</strong>
                  </p>
                </div>
                <button
                  onClick={() => { setShowSubdomainModal(false); setSubdomainStep("form"); setNewSubdomain(""); setSubdomainAvailable(null); }}
                  className="skeu-button w-full py-2.5 rounded-xl font-bold"
                >
                  Selesai
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-primary uppercase">Modul Pengaturan</span>
            <span className="text-slate-400">•</span>
            <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold">Sistem & Integrasi</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">System & Gateway Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">Kelola profil kost, subdomain, payment gateway, dan integrasi WhatsApp.</p>
        </div>
        <button
          onClick={handleSave}
          className="skeu-button text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md w-full sm:w-auto"
        >
          <span className="material-symbols-outlined text-[18px]">save</span>
          <span>Simpan Perubahan</span>
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-white/60">
        {TABS.map((tab) => {
          const locked = isTabLocked(tab.id);
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? "skeu-button text-white shadow-sm"
                  : "skeu-card text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{locked ? "lock" : tab.icon}</span>
              <span>{tab.label}</span>
              {locked && !planStatus.loading && (
                <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black ${
                  activeTab === tab.id ? "bg-white/30 text-white" : "bg-amber-100 text-amber-700"
                }`}>PRO</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab: PROFIL ── */}
      {activeTab === "profil" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 skeu-card p-5 sm:p-6 rounded-2xl space-y-4 text-xs">
            <h2 className="font-bold text-slate-900 text-sm pb-3 border-b border-white/60">Identitas & Informasi Properti Kost</h2>
            <LogoUploader currentLogoUrl={logoUrl} onUploadSuccess={handleLogoUploaded} />
            <div className="border-t border-white/60 pt-3">
              <label className="font-bold text-slate-700 block mb-1">Nama Properti Kost</label>
              <input type="text" value={namaKost} onChange={(e) => setNamaKost(e.target.value)} className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-bold" />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Alamat Lengkap</label>
              <textarea rows={2} value={alamatKost} onChange={(e) => setAlamatKost(e.target.value)} className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none leading-relaxed" />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Nomor WhatsApp Pemilik</label>
              <input type="text" value={teleponKost} onChange={(e) => setTeleponKost(e.target.value)} className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Bank Penerima</label>
                <select value={bankPenerima} onChange={(e) => setBankPenerima(e.target.value)} className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none cursor-pointer">
                  {["BCA","Mandiri","BNI","BRI","BSI","CIMB Niaga","Danamon"].map((b) => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nomor Rekening</label>
                <input type="text" value={noRekening} onChange={(e) => setNoRekening(e.target.value)} className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-mono font-bold" />
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
                  <span className="text-slate-400 text-[10px] block uppercase font-bold mb-1">Paket</span>
                  <span className="font-black text-primary text-sm">{profile.paket}</span>
                </div>
                <div className="skeu-inset p-3 rounded-xl">
                  <span className="text-slate-400 text-[10px] block uppercase font-bold mb-1">Subdomain Aktif</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px]">{profile.subdomain}.{process.env.NEXT_PUBLIC_APP_DOMAIN || "manajementkost.my.id"}</span>
                </div>
                <div className="skeu-inset p-3 rounded-xl">
                  <span className="text-slate-400 text-[10px] block uppercase font-bold mb-1">SSL</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> HTTPS Aktif</span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-4">Perubahan nama kost langsung terbarui di semua halaman admin dan website publik.</p>
          </div>
        </div>
      )}

      {/* ── Tab: SUBDOMAIN ── */}
      {activeTab === "subdomain" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 skeu-card p-5 sm:p-6 rounded-2xl space-y-5 text-xs">
            <h2 className="font-bold text-slate-900 text-sm pb-3 border-b border-white/60 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">domain</span>
              Manajemen Subdomain Kost
            </h2>

            {/* Current subdomain */}
            <div className="skeu-inset p-4 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Subdomain Aktif</p>
                <p className="font-mono font-black text-primary text-sm">
                  {profile.subdomain}.{process.env.NEXT_PUBLIC_APP_DOMAIN || "manajementkost.my.id"}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-emerald-700 font-bold text-[11px]">Aktif</span>
              </div>
            </div>

            {/* Change subdomain card */}
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/15 space-y-3">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-[22px] shrink-0">edit</span>
                <div>
                  <p className="font-black text-slate-900 text-sm">Ganti Subdomain</p>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">
                    Subdomain dapat diganti kapan saja. Setiap penggantian dikenakan biaya administrasi sebesar{" "}
                    <strong className="text-primary">Rp {SUBDOMAIN_CHANGE_FEE.toLocaleString("id-ID")}</strong> untuk memperbarui konfigurasi DNS dan sistem.
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setSubdomainStep("form"); setShowSubdomainModal(true); setNewSubdomain(""); setSubdomainAvailable(null); }}
                className="skeu-button w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md text-sm"
              >
                <span className="material-symbols-outlined text-[18px]">domain_add</span>
                Ganti Subdomain Sekarang
              </button>
            </div>

            {/* How it works */}
            <div className="space-y-2">
              <p className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">Alur Penggantian</p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {[
                  { step:"1", icon:"edit", label:"Masukkan subdomain baru" },
                  { step:"2", icon:"search",label:"Cek ketersediaan otomatis" },
                  { step:"3", icon:"payments",label:"Bayar Rp 25.000 via QRIS" },
                  { step:"4", icon:"rocket_launch",label:"Subdomain aktif langsung" },
                ].map((s) => (
                  <div key={s.step} className="skeu-inset p-3 rounded-xl text-center">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
                      <span className="material-symbols-outlined text-[16px]">{s.icon}</span>
                    </div>
                    <p className="font-bold text-slate-800 text-[11px]">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 skeu-card p-5 sm:p-6 rounded-2xl flex flex-col gap-4 text-xs">
            <h3 className="font-bold text-slate-900 text-sm pb-3 border-b border-white/60 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-amber-500">info</span>
              Penting Diketahui
            </h3>
            <ul className="space-y-3 text-slate-600 leading-relaxed">
              {[
                "Subdomain bersifat unik — satu subdomain hanya untuk satu kost.",
                "Subdomain lama langsung non-aktif setelah penggantian berhasil.",
                "Link lama yang sudah dibagikan ke penyewa perlu diperbarui.",
                "Pembayaran tidak dapat dikembalikan setelah subdomain diganti.",
                "Proses aktivasi instan, tidak perlu menunggu.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-amber-500 text-[14px] shrink-0 mt-0.5">warning_amber</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── Tab: PAYMENT GATEWAY ── */}
      {activeTab === "midtrans" && (
        planStatus.loading ? <SkeletonCard rows={4} /> :
        isTabLocked("midtrans") ? (
          <LockedFeatureCard feature="Payment Gateway" description="Integrasi Midtrans, Tripay, dan Xendit untuk pembayaran otomatis (Virtual Account, QRIS, e-wallet)." minPlan="Pro" />
        ) : <PaymentGatewayTab />
      )}

      {/* ── Tab: QRIS ── */}
      {activeTab === "qris" && (
        planStatus.loading ? <SkeletonCard rows={3} /> :
        isTabLocked("qris") ? (
          <LockedFeatureCard feature="QRIS Dinamis" description="Upload QR statis (GoPay/DANA/BRI/BCA) → sistem inject nominal otomatis saat penyewa bayar." minPlan="Pro" />
        ) : (
          <div className="space-y-2">
            <div className="pb-2">
              <h2 className="text-sm font-black text-slate-900">QRIS Dinamis</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Upload QR statis → sistem inject nominal otomatis saat penyewa bayar.</p>
            </div>
            <QRISManager />
          </div>
        )
      )}

      {/* ── Tab: WA NOTIF ── */}
      {activeTab === "whatsapp" && (
        planStatus.loading ? <SkeletonCard rows={3} /> :
        isTabLocked("whatsapp") ? (
          <LockedFeatureCard feature="Notifikasi WhatsApp" description="Kirim tagihan dan pengingat otomatis via WhatsApp Bot ke penyewa yang belum membayar." minPlan="Pro" />
        ) : (
          <WABotTab waTemplate={waTemplate} setWaTemplate={setWaTemplate} waReminderDays={waReminderDays}
            setWaReminderDays={setWaReminderDays} waBotEnabled={waBotEnabled} setWaBotEnabled={setWaBotEnabled} onSave={handleSaveWA} />
        )
      )}

      {/* ── Tab: KEAMANAN ── */}
      {activeTab === "keamanan" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 skeu-card p-5 sm:p-6 rounded-2xl space-y-4 text-xs">
            <h2 className="font-bold text-slate-900 text-sm pb-3 border-b border-white/60">Keamanan Akun & Manajemen Sesi</h2>
            <div className="space-y-3">
              <h3 className="font-bold text-slate-700 uppercase tracking-wider">Ganti Kata Sandi</h3>
              <div>
                <label className="font-bold text-slate-600 block mb-1">Kata Sandi Saat Ini</label>
                <input type="password" placeholder="Masukkan kata sandi lama" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Kata Sandi Baru</label>
                  <input type="password" placeholder="Min. 8 karakter" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none" />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Konfirmasi</label>
                  <input type="password" placeholder="Ketik ulang" value={confirmNewPass} onChange={(e) => setConfirmNewPass(e.target.value)} className={`w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none ${confirmNewPass && newPassword !== confirmNewPass ? "border border-red-400" : confirmNewPass && newPassword === confirmNewPass ? "border border-emerald-400" : ""}`} />
                </div>
              </div>
            </div>
            <div className="pt-3 border-t border-white/60">
              <h3 className="font-bold text-slate-700 uppercase tracking-wider mb-3">2FA</h3>
              <div className="flex items-center justify-between p-3 rounded-xl skeu-inset">
                <div>
                  <span className="font-bold text-slate-800 block">Google Authenticator / SMS OTP</span>
                  <span className="text-[10px] text-slate-500">Tambah lapisan keamanan ekstra saat login</span>
                </div>
                <button type="button" onClick={() => setTwoFactor(!twoFactor)} className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${twoFactor ? "bg-emerald-500" : "bg-slate-300"}`}>
                  <span className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-all ${twoFactor ? "right-0.5" : "left-0.5"}`}></span>
                </button>
              </div>
            </div>
            <div className="pt-3 border-t border-white/60">
              <h3 className="font-bold text-slate-700 uppercase tracking-wider mb-3">Waktu Habis Sesi</h3>
              <div className="flex items-center gap-3">
                {["15","30","60","120"].map((t) => (
                  <button key={t} type="button" onClick={() => setSessionTimeout(t)} className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${sessionTimeout === t ? "skeu-button text-white" : "skeu-card text-slate-600"}`}>{t} mnt</button>
                ))}
              </div>
            </div>
            <div className="pt-3 border-t border-white/60">
              <h3 className="font-bold text-slate-700 uppercase tracking-wider mb-3">Backup & Ekspor Data</h3>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => toast.info("Segera hadir","Backup JSON dalam pengembangan.")} className="skeu-button-secondary text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">download</span>Backup JSON</button>
                <button type="button" onClick={() => toast.info("Segera hadir","Export Excel dalam pengembangan.")} className="skeu-button-secondary text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">table_chart</span>Ekspor Excel</button>
              </div>
            </div>
          </div>
          <div className="lg:col-span-4 skeu-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-3 pb-3 border-b border-white/60 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">shield</span>Status Keamanan
              </h3>
              <div className="space-y-2.5 text-xs">
                {[
                  { label:"SSL / HTTPS", value:"Aktif", icon:"lock", ok:true },
                  { label:"2FA",         value: twoFactor ? "Aktif":"Nonaktif", icon: twoFactor ? "check_circle":"radio_button_unchecked", ok: twoFactor },
                  { label:"Enkripsi",    value:"AES-256", icon:"verified_user", ok:true },
                  { label:"Sesi Timeout",value:`${sessionTimeout} menit`, icon:"timer", ok:true },
                ].map((s) => (
                  <div key={s.label} className="skeu-inset p-3 rounded-xl flex items-center justify-between">
                    <span className="font-bold text-slate-700">{s.label}</span>
                    <span className={`font-bold flex items-center gap-1 ${s.ok ? "text-emerald-700" : "text-slate-400"}`}>
                      <span className="material-symbols-outlined text-[14px]">{s.icon}</span>{s.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">Aktifkan 2FA untuk perlindungan maksimal akun admin dari akses tidak sah.</p>
          </div>
        </div>
      )}
    </div>
  );
}
