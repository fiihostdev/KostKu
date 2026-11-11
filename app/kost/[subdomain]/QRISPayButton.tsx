"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface QRISPayButtonProps {
  kostId: string;
  amount: number;
  kamar: string;
  merchantName: string;
}

// ── Modal di-render via Portal ke document.body ───────────────────────────────
// Ini mencegah dua bug sekaligus:
// 1. QR pindah-pindah saat hover card — karena parent card punya CSS transform
//    (hover:-translate-y-1). Element dengan position:fixed di dalam parent
//    yang ber-transform akan mengikuti transform parent. Portal bypass ini.
// 2. Kedip-kedip — modal tidak lagi child langsung dari card yang re-render,
//    sehingga state card tidak menyebabkan modal unmount/remount.

interface QRISModalProps {
  isOpen: boolean;
  onClose: () => void;
  kostId: string;
  amount: number;
  kamar: string;
  merchantName: string;
}

function QRISModal({ isOpen, onClose, kostId, amount, kamar, merchantName }: QRISModalProps) {
  const [qrSrc,  setQrSrc]  = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Track apakah modal masih terbuka saat fetch selesai
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Fetch QR hanya saat isOpen berubah jadi true — TIDAK di setiap render
  useEffect(() => {
    if (!isOpen) {
      // Reset saat modal ditutup
      if (qrSrc?.startsWith("blob:")) URL.revokeObjectURL(qrSrc);
      setQrSrc(null);
      setError(null);
      return;
    }

    // Fetch QR
    setLoading(true);
    setError(null);

    fetch(`/api/qris/generate?kostId=${kostId}&amount=${amount}`, { cache: "no-store" })
      .then(async (res) => {
        if (!isMounted.current) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Gagal generate QR");
          return;
        }
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        if (isMounted.current) {
          setQrSrc(url);
        } else {
          URL.revokeObjectURL(url); // cleanup jika unmounted sebelum selesai
        }
      })
      .catch(() => {
        if (isMounted.current) setError("Tidak dapat menghubungi server");
      })
      .finally(() => {
        if (isMounted.current) setLoading(false);
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // hanya re-run saat isOpen berubah — bukan setiap render

  // Prevent body scroll saat modal buka
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    // Backdrop — klik di luar modal untuk tutup
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal card — stop propagation agar klik dalam modal tidak tutup */}
      <div
        className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden"
        style={{ transform: "none" }} // eksplisit reset transform agar fixed child tidak terpengaruh
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="p-4 text-white flex items-center justify-between" style={{ background: "linear-gradient(to right, #3525CD, #4338CA)" }}>
          <div>
            <p className="font-black text-sm">Bayar via QRIS</p>
            <p className="text-[11px] opacity-80">{kamar} · {merchantName}</p>
          </div>
          <button
            onClick={onClose}
            className="opacity-80 hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-white/10"
            aria-label="Tutup"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Nominal */}
        <div className="px-5 pt-4 pb-2 flex items-center justify-between border-b border-slate-100">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Pembayaran</span>
          <span className="text-xl font-black text-slate-900">
            Rp {amount.toLocaleString("id-ID")}
          </span>
        </div>

        {/* QR Area — ukuran tetap agar tidak loncat saat loading */}
        <div className="px-5 py-4 flex justify-center" style={{ minHeight: 240 }}>
          {loading && (
            <div className="w-52 h-52 flex flex-col items-center justify-center gap-2 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200">
              <span className="material-symbols-outlined text-[36px] animate-spin" style={{ color: "#3525CD" }}>sync</span>
              <p className="text-xs text-slate-500">Generating QR...</p>
            </div>
          )}

          {!loading && error && (
            <div className="w-52 py-8 flex flex-col items-center justify-center gap-2 rounded-2xl bg-red-50 border-2 border-red-200 px-4 text-center">
              <span className="material-symbols-outlined text-red-500 text-[32px]">error</span>
              <p className="text-xs text-red-700 font-bold">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  fetch(`/api/qris/generate?kostId=${kostId}&amount=${amount}`, { cache: "no-store" })
                    .then(async (res) => {
                      if (!res.ok) throw new Error("Gagal");
                      const blob = await res.blob();
                      setQrSrc(URL.createObjectURL(blob));
                    })
                    .catch(() => setError("Gagal. Coba lagi."))
                    .finally(() => setLoading(false));
                }}
                className="text-xs font-bold hover:underline mt-1"
                style={{ color: "#3525CD" }}
              >
                Coba lagi
              </button>
            </div>
          )}

          {!loading && !error && qrSrc && (
            <div className="text-center space-y-2.5">
              <div className="p-3 bg-white border-2 rounded-2xl shadow-sm inline-block" style={{ borderColor: "rgba(53,37,205,0.2)" }}>
                <img
                  src={qrSrc}
                  alt="QRIS Payment QR Code"
                  width={208}
                  height={208}
                  className="rounded-lg"
                  style={{ imageRendering: "pixelated", display: "block" }}
                />
              </div>
              <div className="p-2.5 rounded-xl border" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
                <p className="text-[11px] font-bold" style={{ color: "#166534" }}>
                  ✓ Nominal sudah terisi: Rp {amount.toLocaleString("id-ID")}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "#15803d" }}>
                  Scan dengan GoPay / DANA / m-Banking / dompet digital apapun
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Instruksi */}
        <div className="px-5 pb-3 space-y-1.5">
          {[
            "Buka aplikasi e-wallet atau m-Banking",
            "Pilih Scan QR / QRIS",
            "Scan QR di atas — nominal sudah otomatis terisi",
            "Konfirmasi pembayaran → selesai",
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px] text-slate-600">
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0"
                style={{ background: "rgba(53,37,205,0.08)", color: "#3525CD" }}
              >
                {i + 1}
              </span>
              {s}
            </div>
          ))}
        </div>

        <div className="px-5 pb-5 pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-bold text-xs border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function QRISPayButton({ kostId, amount, kamar, merchantName }: QRISPayButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Pastikan document tersedia (SSR safety)
  useEffect(() => { setMounted(true); }, []);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="skeu-button text-white text-xs font-bold py-2.5 w-full rounded-xl flex items-center justify-center gap-1.5 shadow-md"
      >
        <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
        Bayar via QRIS
      </button>

      {/* Portal: render modal ke document.body — bypass transform CSS dari parent */}
      {mounted && createPortal(
        <QRISModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          kostId={kostId}
          amount={amount}
          kamar={kamar}
          merchantName={merchantName}
        />,
        document.body
      )}
    </>
  );
}
