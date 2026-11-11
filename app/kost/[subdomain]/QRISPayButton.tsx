"use client";

import { useState } from "react";

interface QRISPayButtonProps {
  kostId: string;
  amount: number;
  kamar: string;
  merchantName: string;
}

export default function QRISPayButton({ kostId, amount, kamar, merchantName }: QRISPayButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [qrSrc,     setQrSrc]     = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const openPayment = async () => {
    setShowModal(true);
    setLoading(true);
    setError(null);
    setQrSrc(null);

    try {
      const res = await fetch(
        `/api/qris/generate?kostId=${kostId}&amount=${amount}`,
        { cache: "no-store" }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Gagal generate QR");
        setLoading(false);
        return;
      }

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      setQrSrc(url);
    } catch {
      setError("Tidak dapat menghubungi server");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    if (qrSrc?.startsWith("blob:")) URL.revokeObjectURL(qrSrc);
    setQrSrc(null);
    setError(null);
  };

  return (
    <>
      <button
        onClick={openPayment}
        className="skeu-button text-white text-xs font-bold py-2.5 w-full rounded-xl flex items-center justify-center gap-1.5 shadow-md"
      >
        <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
        Bayar via QRIS
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-indigo-700 p-4 text-white flex items-center justify-between">
              <div>
                <p className="font-black text-sm">Bayar via QRIS</p>
                <p className="text-[11px] text-white/80">{kamar} · {merchantName}</p>
              </div>
              <button onClick={closeModal} className="text-white/80 hover:text-white">
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            {/* Amount */}
            <div className="px-5 pt-4 pb-2 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-bold uppercase">Total Pembayaran</span>
              <span className="text-xl font-black text-slate-900">
                Rp {amount.toLocaleString("id-ID")}
              </span>
            </div>

            {/* QR Area */}
            <div className="px-5 py-4 flex justify-center">
              {loading ? (
                <div className="w-56 h-56 flex flex-col items-center justify-center gap-2 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200">
                  <span className="material-symbols-outlined text-primary text-[36px] animate-spin">sync</span>
                  <p className="text-xs text-slate-500">Generating QR...</p>
                </div>
              ) : error ? (
                <div className="w-56 py-8 flex flex-col items-center justify-center gap-2 rounded-2xl bg-red-50 border-2 border-red-200 px-4 text-center">
                  <span className="material-symbols-outlined text-red-500 text-[32px]">error</span>
                  <p className="text-xs text-red-700 font-bold">{error}</p>
                  <button
                    onClick={openPayment}
                    className="text-xs text-primary font-bold hover:underline mt-1"
                  >
                    Coba lagi
                  </button>
                </div>
              ) : qrSrc ? (
                <div className="text-center space-y-3">
                  <div className="p-3 bg-white border-2 border-primary/20 rounded-2xl shadow-sm inline-block">
                    <img
                      src={qrSrc}
                      alt="QRIS Payment"
                      className="w-52 h-52 object-contain"
                      style={{ imageRendering: "pixelated" }}
                    />
                  </div>
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                    <p className="text-[11px] font-bold text-emerald-800">
                      Nominal sudah terisi: Rp {amount.toLocaleString("id-ID")}
                    </p>
                    <p className="text-[10px] text-emerald-600 mt-0.5">
                      Scan dengan GoPay / DANA / m-Banking / dompet digital apapun
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Instructions */}
            <div className="px-5 pb-4 space-y-1.5">
              {[
                "Buka aplikasi e-wallet atau m-Banking",
                "Pilih Scan QR / QRIS",
                "Scan QR di atas — nominal sudah otomatis terisi",
                "Konfirmasi pembayaran → selesai",
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] text-slate-600">
                  <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[9px] shrink-0">
                    {i + 1}
                  </span>
                  {s}
                </div>
              ))}
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={closeModal}
                className="w-full py-2.5 rounded-xl skeu-button-secondary font-bold text-xs text-slate-600"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
