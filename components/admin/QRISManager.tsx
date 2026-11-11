"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useKost } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";

interface QRISConfig {
  id: string;
  label: string;
  merchant_name: string;
  merchant_city: string;
  qr_image_url: string;
  is_active: boolean;
  updated_at: string;
}

interface PreviewState {
  amount: number;
  qrSrc: string | null;
  loading: boolean;
}

export default function QRISManager() {
  const { kostId } = useKost();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  // Upload state
  const [uploading,    setUploading]    = useState(false);
  const [dragOver,     setDragOver]     = useState(false);
  const [label,        setLabel]        = useState("QRIS Utama");
  const [manualQris,   setManualQris]   = useState("");
  const [showManual,   setShowManual]   = useState(false);

  // Saved config
  const [config,  setConfig]  = useState<QRISConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Preview dinamis
  const [preview, setPreview] = useState<PreviewState>({ amount: 0, qrSrc: null, loading: false });
  const [previewAmount, setPreviewAmount] = useState("1500000");

  // Load config
  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/qris/upload");
      const data = await res.json();
      setConfig(data.configs?.[0] || null);
    } catch {
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  // Upload handler
  const handleUpload = useCallback(async (file: File) => {
    if (!file) return;

    setUploading(true);
    const fd = new FormData();
    fd.append("qr_image", file);
    fd.append("label", label);
    if (manualQris.trim()) fd.append("qris_string", manualQris.trim());

    try {
      const res = await fetch("/api/qris/upload", { method: "POST", body: fd });
      const data = await res.json();

      if (data.needManualInput) {
        toast.error("QR tidak terdeteksi", "Gambar terupload. Masukkan QRIS string secara manual di bawah.");
        setShowManual(true);
        await loadConfig();
        return;
      }

      if (!res.ok || !data.success) {
        toast.error("Upload gagal", data.error || "Coba lagi");
        return;
      }

      toast.success("QRIS berhasil disimpan!", `Merchant: ${data.merchantName}`);
      setManualQris("");
      setShowManual(false);
      await loadConfig();

    } catch {
      toast.error("Error", "Tidak dapat menghubungi server");
    } finally {
      setUploading(false);
    }
  }, [label, manualQris, loadConfig, toast]);

  const handleManualSave = useCallback(async () => {
    if (!manualQris.trim()) {
      toast.error("QRIS string kosong", "Masukkan QRIS string terlebih dahulu");
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append("label", label);
    fd.append("qris_string", manualQris.trim());

    try {
      const res = await fetch("/api/qris/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error("Gagal", data.error || "QRIS string tidak valid");
        return;
      }
      toast.success("QRIS tersimpan!", `Merchant: ${data.merchantName}`);
      setManualQris("");
      setShowManual(false);
      await loadConfig();
    } catch {
      toast.error("Error", "Tidak dapat menghubungi server");
    } finally {
      setUploading(false);
    }
  }, [manualQris, label, loadConfig, toast]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/qris/upload", { method: "DELETE" });
      if (res.ok) {
        toast.success("QRIS dihapus", "Konfigurasi QRIS berhasil dihapus");
        setConfig(null);
        setPreview({ amount: 0, qrSrc: null, loading: false });
      }
    } catch {
      toast.error("Error", "Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  const handlePreview = async () => {
    const amount = parseInt(previewAmount.replace(/\D/g, ""), 10);
    if (!amount || amount < 1000) {
      toast.error("Amount tidak valid", "Minimal Rp 1.000");
      return;
    }
    if (!kostId) return;

    setPreview((p) => ({ ...p, loading: true }));

    try {
      const res = await fetch(`/api/qris/generate?kostId=${kostId}&amount=${amount}`, { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json();
        toast.error("Gagal generate", data.error);
        setPreview((p) => ({ ...p, loading: false }));
        return;
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      setPreview((p) => {
        if (p.qrSrc?.startsWith("blob:")) URL.revokeObjectURL(p.qrSrc);
        return { amount, qrSrc: url, loading: false };
      });
    } catch {
      toast.error("Error", "Gagal generate QR");
      setPreview((p) => ({ ...p, loading: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500 py-6 justify-center">
        <span className="material-symbols-outlined text-primary text-[20px] animate-spin">sync</span>
        Memuat konfigurasi QRIS...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs">

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── Kiri: Upload & Config ── */}
        <div className="lg:col-span-7 space-y-4">

          {/* Header info */}
          <div className="skeu-card p-4 rounded-2xl flex items-start gap-3 bg-primary/3 border border-primary/15">
            <span className="material-symbols-outlined text-primary text-[22px] shrink-0 mt-0.5">info</span>
            <div>
              <p className="font-bold text-slate-800 mb-0.5">Cara Kerja QRIS Dinamis</p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Upload QR statis dari GoPay/DANA/BRI/BCA/dll → sistem otomatis inject nominal saat penyewa bayar → penyewa scan QR yang sudah ada harganya. Hanya berlaku untuk QR berlogo <strong>QRIS</strong> (Bank Indonesia).
              </p>
            </div>
          </div>

          {/* Config sudah ada */}
          {config ? (
            <div className="skeu-card p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">qr_code_2</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{config.label}</p>
                    <p className="text-[10px] text-slate-500">Merchant: {config.merchant_name}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  ● Aktif
                </span>
              </div>

              {config.qr_image_url && (
                <div className="flex justify-center">
                  <img
                    src={config.qr_image_url}
                    alt="QR Original"
                    className="w-32 h-32 object-contain rounded-xl border-2 border-slate-200 p-1 bg-white"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="skeu-inset p-2.5 rounded-xl">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold mb-0.5">Label</span>
                  <span className="font-bold text-slate-800">{config.label}</span>
                </div>
                <div className="skeu-inset p-2.5 rounded-xl">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold mb-0.5">Merchant</span>
                  <span className="font-bold text-slate-800">{config.merchant_name}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setConfig(null); setShowManual(false); }}
                  className="flex-1 skeu-button-secondary py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
                  Ganti QR
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="skeu-button-secondary py-2 px-3 rounded-xl font-bold text-xs text-red-600 flex items-center gap-1.5"
                >
                  <span className={`material-symbols-outlined text-[14px] ${deleting ? "animate-spin" : ""}`}>
                    {deleting ? "sync" : "delete"}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            /* Upload Zone */
            <div className="skeu-card p-5 rounded-2xl space-y-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Label QR</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Contoh: GoPay Merchant, DANA, BRI, dll"
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
                />
              </div>

              {/* Drag & Drop Upload */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleUpload(f);
                }}
                onClick={() => !uploading && fileRef.current?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-slate-300 hover:border-primary hover:bg-primary/3"
                } ${uploading ? "pointer-events-none opacity-60" : ""}`}
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[36px] animate-spin">sync</span>
                    <p className="font-bold text-primary">Memproses QR...</p>
                    <p className="text-[11px] text-slate-500">Sedang decode & validasi QRIS</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-[40px]">qr_code_scanner</span>
                    <p className="font-bold text-slate-700">Upload Gambar QR Code</p>
                    <p className="text-[11px] text-slate-500">Drag & drop atau klik · PNG/JPG · Maks 2MB</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      QR harus berlogo QRIS (GoPay Merchant, DANA, BRI, BCA, dll)
                    </p>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                    e.target.value = "";
                  }}
                  className="hidden"
                />
              </div>

              {/* Manual input */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowManual(!showManual)}
                  className="text-[11px] text-primary font-bold flex items-center gap-1 hover:underline"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {showManual ? "expand_less" : "expand_more"}
                  </span>
                  Input QRIS string manual (jika auto-detect gagal)
                </button>

                {showManual && (
                  <div className="mt-2 space-y-2">
                    <textarea
                      rows={4}
                      value={manualQris}
                      onChange={(e) => setManualQris(e.target.value)}
                      placeholder="000201010212..."
                      className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-mono text-[10px] leading-relaxed"
                    />
                    <p className="text-[10px] text-slate-500">
                      QRIS string biasanya diawali dengan "000201". Bisa didapat dari aplikasi merchant (GoPay, DANA, dll).
                    </p>
                    <button
                      onClick={handleManualSave}
                      disabled={uploading}
                      className="skeu-button w-full py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[14px]">save</span>
                      Simpan QRIS String
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Kanan: Preview QR Dinamis ── */}
        <div className="lg:col-span-5 space-y-4">

          <div className="skeu-card p-5 rounded-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-3 border-b border-white/60">
              <span className="material-symbols-outlined text-[18px] text-primary">preview</span>
              Preview QR Dinamis
            </h3>

            {/* Amount input */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Nominal Uji Coba</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-[11px]">Rp</span>
                  <input
                    type="text"
                    value={Number(previewAmount.replace(/\D/g, "") || 0).toLocaleString("id-ID")}
                    onChange={(e) => setPreviewAmount(e.target.value.replace(/\D/g, ""))}
                    className="w-full pl-8 p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-bold"
                    placeholder="1.500.000"
                  />
                </div>
                <button
                  onClick={handlePreview}
                  disabled={!config || preview.loading}
                  className="skeu-button px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 disabled:opacity-60 shrink-0"
                >
                  <span className={`material-symbols-outlined text-[16px] ${preview.loading ? "animate-spin" : ""}`}>
                    {preview.loading ? "sync" : "qr_code_2"}
                  </span>
                  Generate
                </button>
              </div>
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {[500000, 1000000, 1500000, 2000000].map((v) => (
                  <button
                    key={v}
                    onClick={() => setPreviewAmount(String(v))}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg transition-colors ${
                      previewAmount === String(v) ? "bg-primary/10 text-primary" : "skeu-card text-slate-600"
                    }`}
                  >
                    {(v / 1000000).toFixed(v % 1000000 === 0 ? 0 : 1)}Jt
                  </button>
                ))}
              </div>
            </div>

            {/* QR Preview */}
            <div className="flex justify-center">
              {preview.qrSrc ? (
                <div className="text-center space-y-2">
                  <div className="p-3 bg-white rounded-2xl border-2 border-primary/20 shadow-sm inline-block">
                    <img
                      src={preview.qrSrc}
                      alt="QR Dinamis"
                      className="w-48 h-48 object-contain"
                      style={{ imageRendering: "pixelated" }}
                    />
                  </div>
                  <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                    <p className="text-[10px] text-emerald-700 font-bold">
                      ✅ Nominal: Rp {preview.amount.toLocaleString("id-ID")}
                    </p>
                    <p className="text-[10px] text-emerald-600">QR dinamis siap scan — nominal sudah terisi</p>
                  </div>
                </div>
              ) : (
                <div className="w-48 h-48 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 gap-2">
                  <span className="material-symbols-outlined text-slate-300 text-[40px]">qr_code</span>
                  <p className="text-[11px] text-slate-400 text-center px-4">
                    {config ? "Masukkan nominal dan klik Generate" : "Upload QRIS dulu untuk preview"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="skeu-card p-4 rounded-2xl space-y-2.5">
            <h4 className="font-bold text-slate-800 text-xs">Cara Kerja di Halaman Publik</h4>
            {[
              "Penyewa pilih kamar → klik tombol Bayar QRIS",
              "Sistem inject nominal harga kamar ke QR statis",
              "QR dinamis muncul dengan nominal sudah terisi",
              "Penyewa scan → bayar sesuai nominal → selesai",
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] text-slate-600">
                <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">{i + 1}</span>
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
