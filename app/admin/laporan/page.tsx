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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-primary uppercase">Modul Keuangan</span>
            <span className="text-slate-400">•</span>
            <span className="text-[11px] text-slate-500 font-semibold">Laporan & Analisis</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Laporan Keuangan & Arus Kas</h1>
          <p className="text-xs text-slate-500 mt-1">Analisis laba rugi, pemasukan sewa, dan pengeluaran operasional terperinci.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="skeu-card px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary">calendar_month</span>
            <select
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              className="bg-transparent text-slate-800 outline-none cursor-pointer"
            >
              <option value="November 2026">November 2026</option>
              <option value="Oktober 2026">Oktober 2026</option>
              <option value="September 2026">September 2026</option>
            </select>
          </div>
          <button
            onClick={() => alert("Mengunduh Laporan Keuangan format Excel & PDF...")}
            className="skeu-button text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="skeu-card p-5 rounded-2xl">
          <span className="text-xs text-slate-500 font-medium">Total Pemasukan Kotor</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">Rp 39.600.000</div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-2 block">+14% dibanding bulan lalu</span>
        </div>
        <div className="skeu-card p-5 rounded-2xl">
          <span className="text-xs text-red-600 font-medium">Pengeluaran Operasional</span>
          <div className="text-2xl font-bold text-red-700 mt-1">Rp 4.750.000</div>
          <span className="text-[10px] text-slate-500 mt-2 block">Utilitas, WiFi, & Maintenance</span>
        </div>
        <div className="skeu-card p-5 rounded-2xl border-2 border-emerald-500/30">
          <span className="text-xs text-emerald-700 font-bold">Laba Bersih (Net Profit)</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">Rp 34.850.000</div>
          <span className="text-[10px] text-emerald-700 font-bold mt-2 block">Profit Margin: 88.0%</span>
        </div>
        <div className="skeu-card p-5 rounded-2xl">
          <span className="text-xs text-primary font-medium">Proyeksi Bulan Depan</span>
          <div className="text-2xl font-bold text-primary mt-1">Rp 41.200.000</div>
          <span className="text-[10px] text-slate-500 mt-2 block">Berdasarkan perpanjangan kontrak</span>
        </div>
      </div>

      {/* Expenses Breakdown & Cash Flow Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cash Flow Table */}
        <div className="lg:col-span-8 skeu-card p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/60">
            <h2 className="font-bold text-slate-900 text-sm">Buku Kas & Mutasi Real-time</h2>
            <span className="text-xs text-slate-500 font-medium">6 Transaksi Terakhir</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
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
                    <td className="py-3 px-3 font-semibold text-slate-900">{c.ket}</td>
                    <td className="py-3 px-3 text-slate-500">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px]">{c.kat}</span>
                    </td>
                    <td className="py-3 px-3 font-bold whitespace-nowrap">
                      <span className={c.tipe === "Masuk" ? "text-emerald-700" : "text-red-600"}>
                        {c.tipe === "Masuk" ? "+" : "-"}Rp {c.nominal.toLocaleString("id-ID")}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800">
                      Rp {c.saldo.toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expenses Breakdown */}
        <div className="lg:col-span-4 skeu-card p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-slate-900 text-sm mb-4 pb-3 border-b border-white/60">
              Rincian Pengeluaran
            </h2>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Listrik PLN & Air PAM</span>
                  <span className="font-bold text-slate-900">Rp 2.450.000 (51%)</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full w-[51%]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Gaji Penjaga & Kebersihan</span>
                  <span className="font-bold text-slate-900">Rp 1.500.000 (31%)</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full w-[31%]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Internet WiFi IndiHome</span>
                  <span className="font-bold text-slate-900">Rp 750.000 (15%)</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full w-[15%]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Service Rutin AC & Perawatan</span>
                  <span className="font-bold text-slate-900">Rp 600.000 (12%)</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full w-[12%]"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="skeu-inset p-4 rounded-xl mt-6">
            <span className="text-xs font-bold text-slate-700 block mb-1">Tips Efisiensi:</span>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Biaya listrik bulan ini turun 4% setelah pemasangan smart card switch di kamar lantai 2.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

