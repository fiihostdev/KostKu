"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";

type Provider = "midtrans" | "tripay" | "xendit";

interface ProviderConfig {
  provider: Provider;
  is_active: boolean;
  is_production: boolean;
  config: Record<string, string>;
  updated_at?: string;
}

const PROVIDERS: {
  id: Provider;
  name: string;
  logo: string;
  color: string;
  description: string;
  fields: { key: string; label: string; placeholder: string; hint?: string }[];
}[] = [
  {
    id: "midtrans",
    name: "Midtrans",
    logo: "midtrans",
    color: "from-blue-600 to-indigo-700",
    description: "Payment gateway lokal terpercaya. Mendukung QRIS, Virtual Account, GoPay, OVO, dan kartu kredit.",
    fields: [
      { key: "merchant_id",  label: "Merchant ID",  placeholder: "G123456789",             hint: "Ditemukan di dashboard Midtrans → Settings → Access Keys" },
      { key: "client_key",   label: "Client Key",   placeholder: "Mid-client-xxxxxxxx",     hint: "Digunakan di frontend untuk inisialisasi Snap" },
      { key: "server_key",   label: "Server Key",   placeholder: "Mid-server-xxxxxxxx",     hint: "Rahasia! Digunakan di server untuk buat transaksi" },
    ],
  },
  {
    id: "tripay",
    name: "Tripay",
    logo: "tripay",
    color: "from-emerald-600 to-teal-700",
    description: "Payment aggregator Indonesia. Mendukung QRIS, transfer bank, minimarket, dan e-wallet.",
    fields: [
      { key: "merchant_code", label: "Merchant Code", placeholder: "T12345",               hint: "Kode merchant dari dashboard Tripay" },
      { key: "api_key",       label: "API Key",       placeholder: "DEV-xxxxxxxxx",        hint: "API Key dari Tripay → Akun → API" },
      { key: "private_key",   label: "Private Key",   placeholder: "xxxxxxxxxxxxxxxx",     hint: "Untuk verifikasi signature webhook" },
      { key: "channel",       label: "Channel Default", placeholder: "QRIS",              hint: "Metode pembayaran: QRIS, BRIVA, MANDIRIVA, BCAVA, dll" },
    ],
  },
  {
    id: "xendit",
    name: "Xendit",
    logo: "xendit",
    color: "from-violet-600 to-purple-700",
    description: "Platform pembayaran modern. Mendukung invoice otomatis, VA, e-wallet, dan kartu kredit.",
    fields: [
      { key: "secret_key",   label: "Secret Key",    placeholder: "xnd_development_xxxxxxxx", hint: "Secret Key dari Xendit Dashboard → Settings → API Keys" },
      { key: "webhook_token", label: "Webhook Token", placeholder: "xxxxxxxxxxxxxxxx",         hint: "Callback Token dari Xendit → Settings → Callbacks" },
    ],
  },
];

export default function PaymentGatewayTab() {
  const toast = useToast();
  const [activeProvider, setActiveProvider] = useState<Provider>("midtrans");
  const [configs, setConfigs] = useState<Record<Provider, ProviderConfig>>({
    midtrans: { provider: "midtrans", is_active: false, is_production: false, config: {} },
    tripay:   { provider: "tripay",   is_active: false, is_production: false, config: {} },
    xendit:   { provider: "xendit",   is_active: false, is_production: false, config: {} },
  });
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  // Ambil config dari server
  const loadConfigs = useCallback(async () => {
    try {
      const res = await fetch("/api/payment/config");
      if (!res.ok) return;
      const data = await res.json();
      const updated = { ...configs };
      for (const cfg of (data.configs || []) as ProviderConfig[]) {
        updated[cfg.provider] = cfg;
      }
      setConfigs(updated);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadConfigs(); }, [loadConfigs]);

  const current = configs[activeProvider];
  const providerDef = PROVIDERS.find((p) => p.id === activeProvider)!;

  const updateField = (key: string, value: string) => {
    setConfigs((prev) => ({
      ...prev,
      [activeProvider]: {
        ...prev[activeProvider],
        config: { ...prev[activeProvider].config, [key]: value },
      },
    }));
  };

  const updateToggle = (key: "is_active" | "is_production", value: boolean) => {
    setConfigs((prev) => ({
      ...prev,
      [activeProvider]: { ...prev[activeProvider], [key]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/payment/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider:      activeProvider,
          is_active:     current.is_active,
          is_production: current.is_production,
          config:        current.config,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`${providerDef.name} tersimpan!`, "Konfigurasi payment gateway berhasil diperbarui.");
        await loadConfigs(); // refresh untuk dapat masked keys
      } else {
        toast.error("Gagal menyimpan", data.error || "Coba lagi");
      }
    } catch {
      toast.error("Error", "Tidak dapat menghubungi server");
    } finally {
      setSaving(false);
    }
  };

  const webhookUrl = `${typeof window !== "undefined" ? window.location.origin : "https://fiihost.my.id"}/api/payment/webhook?provider=${activeProvider}`;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500 py-8 justify-center">
        <span className="material-symbols-outlined text-[20px] text-primary animate-spin">sync</span>
        Memuat konfigurasi...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs">

      {/* Provider Tabs */}
      <div className="grid grid-cols-3 gap-3">
        {PROVIDERS.map((p) => {
          const cfg = configs[p.id];
          const isActive = cfg.is_active;
          const isSelected = activeProvider === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setActiveProvider(p.id)}
              className={`p-4 rounded-2xl text-left transition-all border-2 ${
                isSelected
                  ? "skeu-button text-white shadow-md border-transparent"
                  : "skeu-card text-slate-700 border-transparent hover:border-primary/20"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-black text-sm">{p.name}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                  isActive
                    ? isSelected ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
                    : isSelected ? "bg-white/10 text-white/60" : "bg-slate-100 text-slate-500"
                }`}>
                  {isActive ? "Aktif" : "Nonaktif"}
                </span>
              </div>
              <p className={`text-[10px] leading-relaxed line-clamp-2 ${isSelected ? "text-white/80" : "text-slate-500"}`}>
                {p.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Config Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left: Form */}
        <div className="lg:col-span-8 skeu-card p-5 sm:p-6 rounded-2xl space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/60">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${providerDef.color} flex items-center justify-center`}>
                <span className="material-symbols-outlined text-white text-[18px]">payments</span>
              </div>
              <div>
                <h2 className="font-black text-sm text-slate-900">{providerDef.name}</h2>
                <p className="text-[10px] text-slate-500">{providerDef.description}</p>
              </div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              current.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
            }`}>
              {current.is_active ? "● Aktif" : "○ Nonaktif"}
            </span>
          </div>

          {/* Toggle Active */}
          <div className="flex items-center justify-between p-3 rounded-xl skeu-inset">
            <div>
              <span className="font-bold text-slate-800 block">Aktifkan {providerDef.name}</span>
              <span className="text-[10px] text-slate-500">Admin kost dapat menggunakan {providerDef.name} sebagai metode pembayaran</span>
            </div>
            <button
              type="button"
              onClick={() => updateToggle("is_active", !current.is_active)}
              className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${current.is_active ? "bg-emerald-500" : "bg-slate-300"}`}
            >
              <span className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-all ${current.is_active ? "right-0.5" : "left-0.5"}`}></span>
            </button>
          </div>

          {/* Toggle Production */}
          <div className="flex items-center justify-between p-3 rounded-xl skeu-inset">
            <div>
              <span className="font-bold text-slate-800 block">Mode Produksi</span>
              <span className="text-[10px] text-slate-500">
                {current.is_production
                  ? "⚠️ Transaksi nyata — uang sungguhan"
                  : "Mode sandbox — testing saja, tidak ada uang nyata"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => updateToggle("is_production", !current.is_production)}
              className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${current.is_production ? "bg-orange-500" : "bg-slate-300"}`}
            >
              <span className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-all ${current.is_production ? "right-0.5" : "left-0.5"}`}></span>
            </button>
          </div>

          {current.is_production && (
            <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-xl text-[11px] text-orange-800">
              <span className="material-symbols-outlined text-[16px] text-orange-600 shrink-0">warning</span>
              <span>Mode <strong>PRODUKSI</strong> aktif. Transaksi yang dibuat akan memproses uang nyata. Pastikan API keys sudah benar.</span>
            </div>
          )}

          {/* API Key Fields */}
          <div className="space-y-3 pt-1">
            <h3 className="font-bold text-slate-700">API Keys & Konfigurasi</h3>
            {providerDef.fields.map((field) => (
              <div key={field.key}>
                <label className="font-bold text-slate-700 block mb-1">{field.label}</label>
                <div className="relative">
                  <input
                    type={showKeys[field.key] ? "text" : "password"}
                    value={current.config[field.key] || ""}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full p-2.5 pr-10 rounded-xl skeu-inset text-slate-800 outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeys((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {showKeys[field.key] ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
                {field.hint && (
                  <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[11px]">info</span>
                    {field.hint}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="skeu-button w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md disabled:opacity-70"
          >
            <span className={`material-symbols-outlined text-[18px] ${saving ? "animate-spin" : ""}`}>
              {saving ? "sync" : "save"}
            </span>
            {saving ? "Menyimpan..." : `Simpan Konfigurasi ${providerDef.name}`}
          </button>
        </div>

        {/* Right: Info & Webhook */}
        <div className="lg:col-span-4 space-y-4">

          {/* Webhook URL */}
          <div className="skeu-card p-5 rounded-2xl space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">webhook</span>
              Webhook URL
            </h3>
            <div className="p-3 skeu-inset rounded-xl">
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">URL untuk {providerDef.name}</p>
              <p className="font-mono text-[10px] text-slate-700 break-all leading-relaxed">{webhookUrl}</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(webhookUrl);
                toast.success("Disalin!", "Paste URL ini di dashboard " + providerDef.name);
              }}
              className="w-full skeu-button-secondary py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[14px]">content_copy</span>
              Salin Webhook URL
            </button>
            <p className="text-[10px] text-slate-500">
              Daftarkan URL ini di dashboard {providerDef.name} agar notifikasi pembayaran masuk otomatis.
            </p>
          </div>

          {/* Panduan */}
          <div className="skeu-card p-5 rounded-2xl space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">menu_book</span>
              Cara Setup {providerDef.name}
            </h3>
            <div className="space-y-2.5 text-[11px] text-slate-600">
              {activeProvider === "midtrans" && [
                "Daftar di dashboard.midtrans.com",
                "Settings → Access Keys → salin Merchant ID, Client Key, Server Key",
                "Settings → Snap Preference → isi Finish, Unfinish, Error URL",
                "Settings → Configuration → isi Notification URL dengan Webhook URL di atas",
                "Aktifkan gateway dan simpan konfigurasi",
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">{i + 1}</span>
                  <span>{s}</span>
                </div>
              ))}
              {activeProvider === "tripay" && [
                "Daftar di tripay.co.id",
                "Akun → Informasi Akun → salin Merchant Code",
                "Akun → API → salin API Key dan Private Key",
                "Tripay → Callback URL → isi dengan Webhook URL di atas",
                "Pilih channel default (QRIS direkomendasikan)",
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">{i + 1}</span>
                  <span>{s}</span>
                </div>
              ))}
              {activeProvider === "xendit" && [
                "Daftar di dashboard.xendit.co",
                "Settings → API Keys → salin Secret Key",
                "Settings → Callbacks → salin Webhook Token",
                "Settings → Callbacks → tambahkan Webhook URL di atas",
                "Aktifkan event Invoice Paid dan Invoice Expired",
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">{i + 1}</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status summary */}
          <div className="skeu-card p-4 rounded-2xl space-y-2">
            <h3 className="font-bold text-slate-900 text-xs uppercase">Status Gateway</h3>
            {PROVIDERS.map((p) => {
              const cfg = configs[p.id];
              return (
                <div key={p.id} className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-700">{p.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${cfg.is_active ? "text-emerald-700" : "text-slate-400"}`}>
                      {cfg.is_active ? "● Aktif" : "○ Nonaktif"}
                    </span>
                    {cfg.is_active && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                        cfg.is_production ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800"
                      }`}>
                        {cfg.is_production ? "PROD" : "SANDBOX"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
