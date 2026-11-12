"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function FinishContent() {
  const params = useSearchParams();
  const orderId = params?.get("orderId") || params?.get("external_id") || params?.get("order_id") || "";
  const status  = params?.get("transaction_status") || params?.get("status") || "settlement";
  const isPaid  = ["settlement","capture","PAID","SETTLED"].includes(status);

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="skeu-card p-8 rounded-3xl max-w-md w-full text-center space-y-5 shadow-xl">
        {isPaid ? (
          <>
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-emerald-600 text-[48px]">check_circle</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900">Pembayaran Berhasil!</h1>
            <p className="text-sm text-slate-600">Terima kasih. Pembayaran sewa kamu telah berhasil diproses.</p>
            {orderId && (
              <div className="p-3 rounded-xl skeu-inset text-xs font-mono text-slate-700">
                Order ID: {orderId}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-amber-600 text-[48px]">pending</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900">Pembayaran Diproses</h1>
            <p className="text-sm text-slate-600">Pembayaran kamu sedang diproses. Silakan tunggu konfirmasi.</p>
          </>
        )}
        <Link href="/" className="skeu-button text-white px-6 py-3 rounded-xl font-bold text-sm inline-flex items-center gap-2 shadow-md">
          <span className="material-symbols-outlined text-[18px]">home</span>
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}

export default function PaymentFinishPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface flex items-center justify-center"><span className="material-symbols-outlined text-primary text-[48px] animate-spin">sync</span></div>}>
      <FinishContent />
    </Suspense>
  );
}
