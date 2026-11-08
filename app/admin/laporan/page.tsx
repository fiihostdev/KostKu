"use client";

import { useState } from "react";

export default function LaporanKeuanganPage() {
  const [periode, setPeriode] = useState("November 2026");

  const cashFlows = [
    { tgl: "07 Nov 2026", ket: "Pembayaran Sewa Kamar A-01 (Dimas Anggara)", kat: "Pendapatan Sewa", tipe: "Masuk", nominal: 1800000, saldo: 34850000 },
    { tgl: "06 Nov 2026", ket: "Pembayaran Sewa Kamar B-04 (Siti Rahmawati)", kat: "Pendapatan Sewa", tipe: "Masuk", nominal: 2200000, saldo: 33050000 },
    { tgl: "04 Nov 2026", ket: "Tagihan Listrik PLN & Air PAM Kost", kat: "Utilitas", tipe: "Keluar", nominal: 2450000, saldo: 30850000 },
    { tgl: "03 Nov 2026", ket: "Langganan Internet IndiHome Biz 100 Mbps", kat: "Internet", tipe: "Keluar", nominal: 750000, saldo: 33300000 },
    { tgl: "02 Nov 2026", ket: "Service Rutin AC 4 Unit Lantai 1", kat: "Perawatan", tipe: "Keluar", nominal: 600000, saldo: 34050000 },
    { tgl: "01 Nov 2026", ket: "Pembayaran Sewa Kamar VIP-01 (Jessica Mila)", kat: "Pendapatan Sewa", tipe: "Masuk", nominal: 3500000, saldo: 34650000 },
  ];

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
            onClick={() => alert("Mengunduh Laporan Keuangan format Excel & PDF...")}
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
          <span className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase truncate">Pemasukan Kotor</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">Rp 39.6 Jt</div>
          <span className="text-[10px] text-emerald-700 font-bold mt-2 block">+14% vs bulan lalu</span>
        </div>
        <div className="skeu-card p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs text-red-600 font-semibold uppercase truncate">Pengeluaran Operasional</span>
          <div className="text-xl sm:text-2xl font-black text-red-700 mt-1">Rp 4.75 Jt</div>
          <span className="text-[10px] text-slate-500 mt-2 block truncate">Listrik, WiFi & Service</span>
        </div>
        <div className="skeu-card p-4 sm:p-5 rounded-2xl border-2 border-emerald-500/30 flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs text-emerald-700 font-bold uppercase truncate">Laba Bersih (Net)</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">Rp 34.85 Jt</div>
          <span className="text-[10px] text-emerald-800 font-bold mt-2 block">Margin: 88.0%</span>
        </div>
        <div className="skeu-card p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs text-primary font-semibold uppercase truncate">Proyeksi Bulan Depan</span>
          <div className="text-xl sm:text-2xl font-black text-primary mt-1">Rp 41.2 Jt</div>
          <span className="text-[10px] text-slate-500 mt-2 block truncate">Kontrak aktif</span>
        </div>
      </div>

      {/* Expenses Breakdown & Cash Flow Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cash Flow Table */}
        <div className="lg:col-span-8 skeu-card p-5 sm:p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/60">
            <h2 className="font-bold text-slate-900 text-sm sm:text-base">Buku Kas & Mutasi Real-time</h2>
            <span className="text-xs text-slate-500 font-medium">6 Transaksi Terakhir</span>
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
                {cashFlows.map((c, i) => (
                  <tr key={i} className="hover:bg-white/40">
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
              Rincian Pengeluaran
            </h2>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700">Listrik PLN & Air PAM</span>
                  <span className="font-bold text-slate-900">Rp 2.45 Jt (51%)</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full w-[51%]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700">Gaji Penjaga & Kebersihan</span>
                  <span className="font-bold text-slate-900">Rp 1.50 Jt (31%)</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full w-[31%]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700">Internet WiFi IndiHome</span>
                  <span className="font-bold text-slate-900">Rp 750 Rb (15%)</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full w-[15%]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700">Service Rutin AC & Perawatan</span>
                  <span className="font-bold text-slate-900">Rp 600 Rb (12%)</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full w-[12%]"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="skeu-inset p-3.5 rounded-xl mt-6">
            <span className="text-xs font-bold text-slate-800 block mb-1">💡 Tips Hemat Operasional:</span>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Biaya listrik turun 4% setelah pemasangan smart card switch di kamar lantai 2.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
