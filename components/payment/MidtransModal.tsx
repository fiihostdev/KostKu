"use client";

import { useState, useEffect } from "react";

interface MidtransModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  orderId: string;
  grossAmount: number;
  itemName: string;
  customerName?: string;
}

export default function MidtransModal({
  isOpen,
  onClose,
  onSuccess,
  orderId,
  grossAmount,
  itemName,
  customerName = "Pak Usman",
}: MidtransModalProps) {
  const [tab, setTab] = useState<"qris" | "bca_va" | "mandiri_va" | "gopay">("qris");
  const [timeLeft, setTimeLeft] = useState(899); // 14:59
  const [isSimulating, setIsSimulating] = useState(false);
  const [copied, setCopied] = useState(false);
  // VA numbers are generated once per modal open (stable, not re-generated on re-render)
  const [vaNumbers] = useState(() => ({
    bca_va: "88090" + Math.floor(10000000 + Math.random() * 90000000).toString(),
    mandiri_va: "70012" + Math.floor(10000000 + Math.random() * 90000000).toString(),
  }));

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(899);
      setTab("qris");
      setIsSimulating(false);
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  const handleSimulatePayment = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      onSuccess();
    }, 1200);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 text-slate-800 flex flex-col max-h-[95vh]">
        {/* Header Midtrans Branding */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 p-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-black text-sm tracking-widest uppercase bg-white/20 px-2.5 py-0.5 rounded-md">
              midtrans
            </span>
            <span className="text-[11px] text-white/80">Snap Gateway Sandbox</span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Amount & Timer Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Total Tagihan</span>
            <span className="text-lg font-black text-slate-900">
              Rp {grossAmount.toLocaleString("id-ID")}
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Selesaikan Dalam</span>
            <span className="text-xs font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              ⏱ {formattedTime}
            </span>
          </div>
        </div>

        {/* Payment Channels Tabs */}
        <div className="flex border-b border-slate-200 text-xs font-bold bg-slate-100 overflow-x-auto shrink-0">
          <button
            onClick={() => setTab("qris")}
            className={`flex-1 py-2.5 px-3 whitespace-nowrap transition-colors flex items-center justify-center gap-1.5 ${
              tab === "qris" ? "bg-white text-primary border-b-2 border-primary" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
            <span>QRIS</span>
          </button>
          <button
            onClick={() => setTab("bca_va")}
            className={`flex-1 py-2.5 px-3 whitespace-nowrap transition-colors flex items-center justify-center gap-1.5 ${
              tab === "bca_va" ? "bg-white text-primary border-b-2 border-primary" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">account_balance</span>
            <span>BCA VA</span>
          </button>
          <button
            onClick={() => setTab("mandiri_va")}
            className={`flex-1 py-2.5 px-3 whitespace-nowrap transition-colors flex items-center justify-center gap-1.5 ${
              tab === "mandiri_va" ? "bg-white text-primary border-b-2 border-primary" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">account_balance</span>
            <span>Mandiri VA</span>
          </button>
        </div>

        {/* Channel Details */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {tab === "qris" && (
            <div className="text-center space-y-3">
              <span className="text-[11px] font-bold text-slate-700 block">
                Scan kode QRIS menggunakan GoPay, OVO, ShopeePay, Dana, atau BCA Mobile
              </span>
              <div className="w-48 h-48 mx-auto bg-white p-3 rounded-2xl border-2 border-slate-300 shadow-md flex flex-col items-center justify-center relative group">
                <span className="material-symbols-outlined text-8xl text-slate-900">qr_code_2</span>
                <span className="text-[9px] font-mono font-bold text-slate-500 uppercase mt-1">
                  NMID: ID1020039201992
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                Order ID: <code className="font-mono font-bold text-slate-700">{orderId}</code>
              </p>
            </div>
          )}

          {tab === "bca_va" && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Nomor Virtual Account BCA
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-black text-slate-900 tracking-wider">
                    {vaNumbers.bca_va}
                  </span>
                  <button
                    onClick={() => handleCopy(vaNumbers.bca_va)}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <span>{copied ? "Tersalin!" : "Salin"}</span>
                  </button>
                </div>
              </div>
              <div className="text-[11px] text-slate-600 space-y-1">
                <p>1. Buka aplikasi BCA Mobile / KlikBCA</p>
                <p>2. Pilih menu <strong>Transfer → BCA Virtual Account</strong></p>
                <p>3. Masukkan nomor VA di atas dan konfirmasi pembayaran</p>
              </div>
            </div>
          )}

          {tab === "mandiri_va" && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Nomor Mandiri Bill Payment
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-black text-slate-900 tracking-wider">
                    {vaNumbers.mandiri_va}
                  </span>
                  <button
                    onClick={() => handleCopy(vaNumbers.mandiri_va)}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <span>{copied ? "Tersalin!" : "Salin"}</span>
                  </button>
                </div>
              </div>
              <div className="text-[11px] text-slate-600 space-y-1">
                <p>1. Buka Livin&apos; by Mandiri</p>
                <p>2. Pilih menu <strong>Bayar → Multi Payment</strong></p>
                <p>3. Masukkan kode perusahaan 70012 dan konfirmasi</p>
              </div>
            </div>
          )}

          {/* Item details */}
          <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-600 border border-slate-200">
            <div className="flex justify-between">
              <span>Item:</span>
              <span className="font-bold text-slate-800">{itemName}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Customer:</span>
              <span className="font-bold text-slate-800">{customerName}</span>
            </div>
          </div>
        </div>

        {/* Footer Simulation Action */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col gap-2 shrink-0">
          <button
            onClick={handleSimulatePayment}
            disabled={isSimulating}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isSimulating ? (
              <>
                <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                <span>Memverifikasi Pembayaran...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span>Simulasikan Pembayaran Sukses (Sandbox)</span>
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="text-[11px] text-slate-500 hover:text-slate-800 text-center font-bold py-1"
          >
            Batalkan Pembayaran
          </button>
        </div>
      </div>
    </div>
  );
}

