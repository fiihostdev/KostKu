"use client";

/**
 * BookingFlow — Alur booking kost dari halaman publik
 *
 * ALUR:
 *   Step 1 → Data Diri (nama, HP, email, KTP)
 *   Step 2 → Pilih Metode (QRIS / Konfirmasi WA)
 *   Step 3 → Bayar / Kirim
 *
 * VALIDASI PEMBAYARAN QRIS:
 *   - Nominal unik = harga + 3 digit acak (mis: Rp 1.500.347)
 *   - 3 digit terakhir = identitas booking (berbeda tiap penyewa)
 *   - Admin cocokkan nominal di mutasi rekening/QRIS dengan tabel bookings
 *   - Ini cara standar industri untuk validasi QRIS statis
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

interface BookingFlowProps {
  kostId:      string;
  kostNama:    string;
  kamarNomor:  string;
  kamarTipe:   string;
  kamarLantai: number;
  harga:       number;
  hasQris:     boolean;
  waPhone:     string;
}

type Step = 1 | 2 | 3;

interface FormData {
  nama:  string;
  phone: string;
  email: string;
  noKtp: string;
}

function genRef() {
  return "REF-" + Math.random().toString(36).toUpperCase().slice(2, 10);
}
function uniqueAmount(harga: number) {
  return harga + Math.floor(Math.random() * 900) + 100;
}

// ── Modal (Portal) ─────────────────────────────────────────────────────────────
function BookingModal({
  isOpen, onClose,
  kostId, kostNama, kamarNomor, kamarTipe, kamarLantai, harga, hasQris, waPhone,
}: BookingFlowProps & { isOpen: boolean; onClose: () => void }) {

  const [step,       setStep]       = useState<Step>(1);
  const [form,       setForm]       = useState<FormData>({ nama: "", phone: "", email: "", noKtp: "" });
  const [metode,     setMetode]     = useState<"qris" | "wa">(hasQris ? "qris" : "wa");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [done,       setDone]       = useState(false);
  const [refCode,  setRefCode]   = useState(""); // Diisi server setelah submit
  const [nominal]                   = useState(() => uniqueAmount(harga));
  const [qrSrc,      setQrSrc]      = useState<string | null>(null);
  const [qrLoading,  setQrLoading]  = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Reset saat close
  useEffect(() => {
    if (!isOpen) {
      setStep(1); setForm({ nama: "", phone: "", email: "", noKtp: "" });
      setDone(false); setError(null);
      if (qrSrc?.startsWith("blob:")) URL.revokeObjectURL(qrSrc);
      setQrSrc(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Fetch QR hanya saat step 3 + metode qris
  useEffect(() => {
    if (step !== 3 || metode !== "qris" || !isOpen || qrSrc) return;
    setQrLoading(true);
    fetch(`/api/qris/generate?kostId=${kostId}&amount=${nominal}`, { cache: "no-store" })
      .then(async (r) => {
        if (!isMounted.current) return;
        if (!r.ok) { setError("Gagal generate QR"); return; }
        const url = URL.createObjectURL(await r.blob());
        if (isMounted.current) setQrSrc(url);
      })
      .catch(() => { if (isMounted.current) setError("Tidak dapat load QR"); })
      .finally(() => { if (isMounted.current) setQrLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, metode, isOpen]);

  // Block scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true); setError(null);
    try {
      const res = await fetch("/api/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kostId, kamar: kamarNomor,
          nama: form.nama, phone: form.phone,
          email: form.email || null, noKtp: form.noKtp || null,
          nominal, nominalAsli: harga,
          refCode: undefined, // Server yang generate refCode
          metode: metode === "qris" ? "QRIS" : "WhatsApp",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Gagal submit"); return; }

      // refCode sekarang dari server
      if (data.refCode) setRefCode(data.refCode);

      setDone(true);
      if (metode === "wa") {
        const msg = encodeURIComponent(
          `🏠 *Booking Kamar ${kamarNomor}*\n*${kostNama}*\n\n` +
          `• Nama: *${form.nama}*\n• HP: ${form.phone}\n` +
          `• KTP: ${form.noKtp || "-"}\n` +
          `• Kamar: ${kamarNomor} (${kamarTipe}) Lantai ${kamarLantai}\n` +
          `• Harga: *Rp ${harga.toLocaleString("id-ID")}/bln*\n\n` +
          `Kode Booking: \`${refCode}\`\n\nMohon konfirmasi. Terima kasih! 🙏`
        );
        window.open(`https://wa.me/${waPhone}?text=${msg}`, "_blank");
      }
    } catch { setError("Kesalahan jaringan"); }
    finally { setSubmitting(false); }
  }, [form, kostId, kamarNomor, kamarTipe, kamarLantai, kostNama, harga, nominal, refCode, metode, waPhone]);

  if (!isOpen) return null;

  const step1Valid = form.nama.trim().length > 1 && form.phone.trim().length >= 9;
  const suffix3    = String(nominal).slice(-3); // 3 digit unik untuk identifikasi

  const inputCls = "w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 outline-none focus:border-primary focus:bg-white transition-colors text-xs";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(5px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden max-h-[96vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ transform: "none" }}
      >
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #3525CD 0%, #4F46E5 100%)" }} className="p-4 text-white shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-black text-sm">Booking Kamar {kamarNomor}</p>
              <p className="text-[11px] opacity-70">{kostNama} · {kamarTipe} · Lantai {kamarLantai}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/15 transition-colors opacity-80 hover:opacity-100">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          {/* Steps */}
          <div className="flex items-center gap-1">
            {[{n:1,l:"Data Diri"},{n:2,l:"Metode"},{n:3,l:done?"Selesai":"Bayar"}].map((s, i) => (
              <div key={s.n} className="flex items-center gap-1 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 transition-all ${
                  (step > s.n || (s.n === 3 && done)) ? "bg-emerald-400 text-white" :
                  step === s.n ? "bg-white text-primary" : "bg-white/20 text-white/50"
                }`}>
                  {(step > s.n || (s.n === 3 && done)) ? <span className="material-symbols-outlined text-[12px]">check</span> : s.n}
                </div>
                <span className={`text-[9px] font-bold hidden sm:inline ${step===s.n?"text-white":"text-white/40"}`}>{s.l}</span>
                {i < 2 && <div className={`flex-1 h-px ${step > s.n ? "bg-emerald-400" : "bg-white/20"}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-3 text-xs">

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <>
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-[11px] text-indigo-700 flex gap-2">
                <span className="material-symbols-outlined text-[15px] text-indigo-500 shrink-0 mt-0.5">shield_person</span>
                Data kamu digunakan sebagai syarat booking dan diteruskan ke pengelola kost.
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Lengkap <span className="text-red-500">*</span></label>
                <input type="text" placeholder="Sesuai KTP" value={form.nama}
                  onChange={(e) => setForm({...form, nama: e.target.value})} className={inputCls} />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">No. WhatsApp <span className="text-red-500">*</span></label>
                <input type="tel" placeholder="081234567890" value={form.phone}
                  onChange={(e) => setForm({...form, phone: e.target.value})} className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email</label>
                  <input type="email" placeholder="opsional" value={form.email}
                    onChange={(e) => setForm({...form, email: e.target.value})} className={inputCls} />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">No. KTP</label>
                  <input type="text" placeholder="16 digit NIK" maxLength={16} value={form.noKtp}
                    onChange={(e) => setForm({...form, noKtp: e.target.value.replace(/\D/g,"")})} className={inputCls} />
                </div>
              </div>

              {/* Ringkasan kamar */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Kamar Dipilih</span>
                  <span className="font-black text-slate-900">{kamarNomor} · {kamarTipe}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Harga</span>
                  <span className="font-black text-primary">Rp {harga.toLocaleString("id-ID")}<span className="text-[10px] text-slate-400 font-normal">/bln</span></span>
                </div>
              </div>
            </>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <>
              <p className="font-bold text-slate-700">Pilih metode pembayaran:</p>

              {hasQris && (
                <button onClick={() => setMetode("qris")}
                  className={`w-full p-4 rounded-2xl text-left flex items-center gap-3 border-2 transition-all ${
                    metode === "qris" ? "border-primary bg-primary/5" : "border-slate-200 hover:border-primary/40"
                  }`}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${metode==="qris"?"bg-primary/10":"bg-slate-100"}`}>
                    <span className={`material-symbols-outlined text-[22px] ${metode==="qris"?"text-primary":"text-slate-500"}`}>qr_code_2</span>
                  </div>
                  <div className="flex-1">
                    <p className={`font-black text-sm ${metode==="qris"?"text-primary":"text-slate-800"}`}>Bayar via QRIS</p>
                    <p className="text-[11px] text-slate-500">GoPay · DANA · OVO · m-Banking · semua dompet digital</p>
                  </div>
                  {metode === "qris" && <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>}
                </button>
              )}

              <button onClick={() => setMetode("wa")}
                className={`w-full p-4 rounded-2xl text-left flex items-center gap-3 border-2 transition-all ${
                  metode === "wa" ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-emerald-300"
                }`}>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${metode==="wa"?"bg-emerald-100":"bg-slate-100"}`}>
                  <span className={`material-symbols-outlined text-[22px] ${metode==="wa"?"text-emerald-600":"text-slate-500"}`}>chat</span>
                </div>
                <div className="flex-1">
                  <p className={`font-black text-sm ${metode==="wa"?"text-emerald-700":"text-slate-800"}`}>Konfirmasi via WhatsApp</p>
                  <p className="text-[11px] text-slate-500">Hubungi pengelola langsung · Bayar sesuai arahan</p>
                </div>
                {metode === "wa" && <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span>}
              </button>

              {/* Info validasi */}
              {metode === "qris" && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">info</span>
                    Cara kami memverifikasi pembayaran kamu:
                  </p>
                  <p>Kamu akan diminta transfer nominal <strong>unik</strong> (harga + 3 digit acak). Misal: Rp {nominal.toLocaleString("id-ID")}.</p>
                  <p>3 digit terakhir <strong className="font-mono">...{suffix3}</strong> adalah kode identitas booking kamu — berbeda dengan penyewa lain.</p>
                </div>
              )}
            </>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && !done && (
            <>
              {metode === "qris" ? (
                <>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Transfer TEPAT</span>
                      <span className="font-black text-slate-900 text-lg">Rp {nominal.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-full block">3 digit unik: {suffix3}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Jangan dibulatkan</span>
                    </div>
                  </div>

                  {/* QR */}
                  <div className="flex justify-center py-2">
                    {qrLoading ? (
                      <div className="w-52 h-52 flex flex-col items-center justify-center gap-2 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200">
                        <span className="material-symbols-outlined text-[36px] animate-spin text-primary">sync</span>
                        <p className="text-[11px] text-slate-500">Generating QR...</p>
                      </div>
                    ) : qrSrc ? (
                      <div className="text-center space-y-2">
                        <div className="p-3 bg-white border-2 border-primary/20 rounded-2xl shadow-sm inline-block">
                          <img src={qrSrc} alt="QR Bayar" width={200} height={200}
                            className="rounded-lg" style={{ imageRendering: "pixelated" }} />
                        </div>
                        <p className="text-[10px] text-emerald-700 font-bold">✓ Nominal ter-isi: Rp {nominal.toLocaleString("id-ID")}</p>
                      </div>
                    ) : error ? (
                      <div className="w-52 py-6 text-center text-red-600 font-bold text-xs">{error}</div>
                    ) : null}
                  </div>

                  <div className="space-y-1.5">
                    {["Buka GoPay / DANA / OVO / m-Banking",
                      "Pilih Scan QR / QRIS",
                      `Transfer TEPAT Rp ${nominal.toLocaleString("id-ID")} (jangan dibulatkan)`,
                      "Klik \"Sudah Transfer\" di bawah setelah selesai"].map((s,i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px] text-slate-600">
                        <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">{i+1}</span>
                        {s}
                      </div>
                    ))}
                  </div>

                  {error && <p className="text-[11px] text-red-700 font-bold text-center">{error}</p>}

                  <button onClick={handleSubmit} disabled={submitting}
                    className="w-full py-3 rounded-xl font-black text-sm text-white shadow-md disabled:opacity-70 flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}>
                    <span className={`material-symbols-outlined text-[18px] ${submitting?"animate-spin":""}`}>{submitting?"sync":"check_circle"}</span>
                    {submitting ? "Mengirim konfirmasi..." : "Sudah Transfer — Konfirmasi Booking"}
                  </button>

                  <p className="text-[10px] text-slate-400 text-center">
                    Kode booking: <strong className="font-mono text-slate-600">{refCode}</strong> · Simpan kode ini
                  </p>
                </>
              ) : (
                /* Metode WA */
                <>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-[11px]">
                    <p className="font-bold text-slate-800">Ringkasan Booking</p>
                    {[
                      ["Nama",    form.nama],
                      ["HP",     form.phone],
                      ["Kamar",  `${kamarNomor} · ${kamarTipe}`],
                      ["Harga",  `Rp ${harga.toLocaleString("id-ID")}/bulan`],
                      ["Kode",   refCode],
                    ].map(([k,v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-slate-500">{k}</span>
                        <span className="font-bold text-slate-800 font-mono">{v}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-600 text-center">Klik tombol di bawah untuk membuka WhatsApp pengelola. Data booking sudah ter-isi otomatis.</p>

                  {error && <p className="text-[11px] text-red-700 font-bold text-center">{error}</p>}

                  <button onClick={handleSubmit} disabled={submitting}
                    className="w-full py-3 rounded-xl font-black text-sm text-white shadow-md disabled:opacity-70 flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}>
                    <span className={`material-symbols-outlined text-[18px] ${submitting?"animate-spin":""}`}>{submitting?"sync":"chat"}</span>
                    {submitting ? "Memproses..." : "Kirim ke WhatsApp Pengelola"}
                  </button>
                </>
              )}
            </>
          )}

          {/* ── DONE ── */}
          {done && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-emerald-600 text-[40px]">check_circle</span>
              </div>
              <p className="font-black text-lg text-slate-900">Booking Terkirim!</p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-700 space-y-1">
                <p>Kode booking kamu:</p>
                <p className="font-mono font-black text-primary text-base">{refCode}</p>
                <p className="text-slate-500 text-[10px]">Simpan kode ini untuk konfirmasi dengan pengelola</p>
              </div>
              {metode === "qris" && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                  <p className="font-bold">Langkah selanjutnya:</p>
                  <p>Pengelola akan memverifikasi transfer kamu dan menghubungi via WhatsApp dalam 1×24 jam.</p>
                </div>
              )}
              <button onClick={onClose}
                className="w-full py-2.5 rounded-xl font-bold text-xs border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors">
                Tutup
              </button>
            </div>
          )}
        </div>

        {/* Footer nav */}
        {!done && (
          <div className="p-4 border-t border-slate-100 flex justify-between gap-3 shrink-0">
            <button onClick={() => step === 1 ? onClose() : setStep((step - 1) as Step)}
              className="px-4 py-2.5 rounded-xl font-bold text-xs border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">{step===1?"close":"arrow_back"}</span>
              {step === 1 ? "Batal" : "Kembali"}
            </button>

            {step < 3 ? (
              <button
                disabled={step === 1 ? !step1Valid : false}
                onClick={() => setStep((step + 1) as Step)}
                className="px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-md disabled:opacity-50 flex items-center gap-1"
                style={{ background: !step1Valid && step===1 ? "#94a3b8" : "linear-gradient(135deg,#3525CD,#4F46E5)" }}>
                Lanjut
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function BookingFlow(props: BookingFlowProps) {
  const [isOpen,  setIsOpen]  = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="skeu-button text-white text-xs font-bold py-2.5 w-full rounded-xl flex items-center justify-center gap-1.5 shadow-md"
      >
        <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
        Booking Kamar Ini
      </button>

      {mounted && createPortal(
        <BookingModal {...props} isOpen={isOpen} onClose={() => setIsOpen(false)} />,
        document.body
      )}
    </>
  );
}
