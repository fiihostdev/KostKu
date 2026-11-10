"use client";

import { useState } from "react";
import { useKost } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";

export default function LaporanKeuanganPage() {
  const { stats, cashFlows, loading } = useKost();
  const toast = useToast();
  const [periode, setPeriode] = useState("November 2026");

  // Filter cashFlows
  const totalMasuk = cashFlows.filter((c) => c.tipe === "Masuk").reduce((sum, c) => sum + c.nominal, 0);
  const totalKeluar = cashFlows.filter((c) => c.tipe === "Keluar").reduce((sum, c) => sum + c.nominal, 0);
  const labaBersih = totalMasuk - totalKeluar;
  const margin = totalMasuk > 0 ? Math.round((labaBersih / totalMasuk) * 100) : 0;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-primary uppercase">Modul Keuangan</span>
            <span className="text-slate-400">•</span>
            <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold">Laporan & Analisis</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Laporan Keuangan & Arus Kas</h1>
          <p className="text-xs text-slate-500 mt-0.5">Analisis laba rugi, penerimaan sewa, dan pengeluaran operasional terperinci.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="skeu-card px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary">calendar_month</span>
            <select
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              className="bg-transparent text-slate-800 outline-none cursor-pointer"
            >
              <option value="November 2026">Nov 2026</option>
              <option value="Oktober 2026">Okt 2026</option>
              <option value="September 2026">Sep 2026</option>
            </select>
          </div>
          <button
            onClick={() => toast.info("Fitur segera hadir", "Export Excel & PDF sedang dalam pengembangan.")}
            className="skeu-button text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md flex-1 sm:flex-none justify-center"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="skeu-card p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase truncate">Pemasukan Kas</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            Rp {(totalMasuk / 1000000).toFixed(2)} Jt
          </div>
          <span className="text-[10px] text-emerald-700 font-bold mt-2 block">
            {cashFlows.filter((c) => c.tipe === "Masuk").length} transaksi
          </span>
        </div>
        <div className="skeu-card p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs text-red-600 font-semibold uppercase truncate">Pengeluaran Operasional</span>
          <div className="text-xl sm:text-2xl font-black text-red-700 mt-1">
            Rp {(totalKeluar / 1000000).toFixed(2)} Jt
          </div>
          <span className="text-[10px] text-slate-500 mt-2 block truncate">Utilitas, WiFi & Service</span>
        </div>
        <div className="skeu-card p-4 sm:p-5 rounded-2xl border-2 border-emerald-500/30 flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs text-emerald-700 font-bold uppercase truncate">Laba Bersih (Net)</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
            Rp {(labaBersih / 1000000).toFixed(2)} Jt
          </div>
          <span className="text-[10px] text-emerald-800 font-bold mt-2 block">Margin: {margin}%</span>
        </div>
        <div className="skeu-card p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs text-primary font-semibold uppercase truncate">Potensi Tagihan</span>
          <div className="text-xl sm:text-2xl font-black text-primary mt-1">
            Rp {(stats.tagihanTertunda / 1000000).toFixed(2)} Jt
          </div>
          <span className="text-[10px] text-slate-500 mt-2 block truncate">Tagihan belum tertagih</span>
        </div>
      </div>

      {/* Expenses Breakdown & Cash Flow Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cash Flow Table */}
        <div className="lg:col-span-8 skeu-card p-5 sm:p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/60">
            <h2 className="font-bold text-slate-900 text-sm sm:text-base">Buku Kas & Mutasi Real-time</h2>
            <span className="text-xs text-slate-500 font-medium">{cashFlows.length} Transaksi Terakhir</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[540px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Keterangan</th>
                  <th className="py-2.5 px-3">Kategori</th>
                  <th className="py-2.5 px-3">Nominal</th>
                  <th className="py-2.5 px-3 text-right">Saldo Kas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cashFlows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">Belum ada mutasi kas</td>
                  </tr>
                ) : cashFlows.map((c) => (
                  <tr key={c.id} className="hover:bg-white/40">
                    <td className="py-3 px-3 text-slate-500 text-[11px] whitespace-nowrap">{c.tgl}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">{c.ket}</td>
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-semibold">{c.kat}</span>
                    </td>
                    <td className="py-3 px-3 font-black whitespace-nowrap">
                      <span className={c.tipe === "Masuk" ? "text-emerald-700" : "text-red-600"}>
                        {c.tipe === "Masuk" ? "+" : "-"}Rp {c.nominal.toLocaleString("id-ID")}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                      Rp {c.saldo.toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expenses Breakdown */}
        <div className="lg:col-span-4 skeu-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-slate-900 text-sm sm:text-base mb-4 pb-3 border-b border-white/60">
              Rincian Pengeluaran Operasional
            </h2>

            <div className="space-y-4">
              {(() => {
                // Aggregate expenses by category dynamically from cashFlows
                const expenseCategories: Record<string, number> = {};
                cashFlows
                  .filter((c) => c.tipe === "Keluar")
                  .forEach((c) => {
                    expenseCategories[c.kat] = (expenseCategories[c.kat] || 0) + c.nominal;
                  });

                const categories = Object.entries(expenseCategories);
                const totalExpenses = categories.reduce((s, [, v]) => s + v, 0);

                if (categories.length === 0) {
                  return (
                    <p className="text-xs text-slate-400 italic">Belum ada data pengeluaran.</p>
                  );
                }

                const colors = ["bg-amber-500", "bg-blue-500", "bg-indigo-500", "bg-purple-500", "bg-red-500", "bg-teal-500"];

                return categories.map(([kat, nominal], i) => {
                  const pct = totalExpenses > 0 ? Math.round((nominal / totalExpenses) * 100) : 0;
                  return (
                    <div key={kat}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-slate-700 truncate mr-2">{kat}</span>
                        <span className="font-bold text-slate-900 shrink-0">
                          Rp {nominal.toLocaleString("id-ID")} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className={`${colors[i % colors.length]} h-full rounded-full`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          <div className="skeu-inset p-3.5 rounded-xl mt-6">
            <span className="text-xs font-bold text-slate-800 block mb-1">💡 Tips Analitik Otomatis:</span>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Arus kas otomatis diperbarui setiap kali Anda menekan tombol &apos;Bayar&apos; pada invoice tagihan penyewa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
