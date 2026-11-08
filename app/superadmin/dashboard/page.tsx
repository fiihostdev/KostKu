"use client";

import Link from "next/link";

interface Branch {
  id: string;
  nama: string;
  lokasi: string;
  totalKamar: number;
  terisi: number;
  pendapatan: number;
  okupansi: number;
  status: "Sehat" | "Optimal" | "Perlu Perhatian";
}

const branches: Branch[] = [
  {
    id: "1",
    nama: "Kost Harmoni Residence",
    lokasi: "Kemang, Jakarta Selatan",
    totalKamar: 24,
    terisi: 22,
    pendapatan: 39600000,
    okupansi: 92,
    status: "Optimal",
  },
  {
    id: "2",
    nama: "Kost Melati Indah",
    lokasi: "Dago, Bandung",
    totalKamar: 40,
    terisi: 36,
    pendapatan: 64800000,
    okupansi: 90,
    status: "Optimal",
  },
  {
    id: "3",
    nama: "Kost Graha Mahasiswa",
    lokasi: "Pogung, Yogyakarta",
    totalKamar: 56,
    terisi: 50,
    pendapatan: 84000000,
    okupansi: 89,
    status: "Sehat",
  },
];

export default function SuperadminDashboardPage() {
  const totalKamar = branches.reduce((acc, b) => acc + b.totalKamar, 0);
  const totalTerisi = branches.reduce((acc, b) => acc + b.terisi, 0);
  const avgOkupansi = Math.round((totalTerisi / totalKamar) * 100);

  return (
    <div className="min-h-screen bg-surface p-4 sm:p-6 md:p-10 space-y-6 sm:space-y-8 max-w-full">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-primary uppercase">Master Command Center</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] text-slate-500">Live Multi-Branch Sync</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Dashboard Pengelola Keseluruhan (Multi-Kost)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Konsolidasi performa keuangan, okupansi, dan data operasional lintas seluruh cabang kost.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/admin/dashboard"
            className="skeu-button-secondary text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm flex-1 sm:flex-none"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Cabang Harmoni</span>
          </Link>
          <button
            onClick={() => alert("Mengekspor laporan konsolidasi seluruh cabang...")}
            className="skeu-button text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md flex-1 sm:flex-none"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Ekspor Global</span>
          </button>
        </div>
      </div>

      {/* Macro KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <div className="skeu-card p-4 sm:p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs text-slate-500 font-semibold block mb-1 uppercase truncate">TOTAL UNIT & OKUPANSI</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{totalKamar} <span className="text-xs sm:text-sm font-normal text-slate-500">Kamar</span></div>
          <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-white/60 text-[11px]">
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">{avgOkupansi}% Terisi</span>
            <span className="text-slate-500 truncate">{totalTerisi}/{totalKamar} unit</span>
          </div>
        </div>

        <div className="skeu-card p-4 sm:p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs text-slate-500 font-semibold block mb-1 uppercase truncate">PENDAPATAN KONSOLIDASI</span>
          <div className="text-2xl sm:text-3xl font-black text-primary">Rp 188.4 Jt</div>
          <div className="flex items-center gap-1 mt-2.5 pt-2.5 border-t border-white/60 text-[11px]">
            <span className="text-emerald-700 font-bold flex items-center">
              <span className="material-symbols-outlined text-[14px]">trending_up</span> +16.2%
            </span>
            <span className="text-slate-500 truncate">vs target</span>
          </div>
        </div>

        <div className="skeu-card p-4 sm:p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs text-slate-500 font-semibold block mb-1 uppercase truncate">TOTAL PENYEWA AKTIF</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{totalTerisi} <span className="text-xs sm:text-sm font-normal text-slate-500">Orang</span></div>
          <div className="flex items-center gap-1 mt-2.5 pt-2.5 border-t border-white/60 text-[11px]">
            <span className="text-indigo-600 font-bold truncate">3 Cabang Aktif</span>
          </div>
        </div>

        <div className="skeu-card p-4 sm:p-5 rounded-2xl relative overflow-hidden border-2 border-emerald-500/20 flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs text-emerald-700 font-bold block mb-1 uppercase truncate">OPERATING MARGIN</span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700">82.4%</div>
          <div className="flex items-center gap-1 mt-2.5 pt-2.5 border-t border-white/60 text-[11px]">
            <span className="text-emerald-800 font-bold truncate">Laba Bersih Rp 155.2 Jt</span>
          </div>
        </div>
      </div>

      {/* Multi-Branch Performance Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">domain</span>
            <span>Performa Cabang Properti Kost</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">{branches.length} Cabang</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {branches.map((b) => (
            <div key={b.id} className="skeu-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between transition hover:-translate-y-1">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 pr-2">
                    <h3 className="font-bold text-slate-900 text-base sm:text-lg truncate">{b.nama}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                      <span className="material-symbols-outlined text-[14px] shrink-0">location_on</span>
                      <span className="truncate">{b.lokasi}</span>
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                    {b.status}
                  </span>
                </div>

                <div className="space-y-2.5 my-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Okupansi Kamar</span>
                    <span className="font-bold text-slate-900">{b.terisi} / {b.totalKamar} ({b.okupansi}%)</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all"
                      style={{ width: `${b.okupansi}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between text-xs pt-1">
                    <span className="text-slate-500 font-medium">Pendapatan Bulanan</span>
                    <span className="font-black text-primary">
                      Rp {b.pendapatan.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/60">
                <Link
                  href="/admin/dashboard"
                  className="skeu-button text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1 w-full justify-center shadow-sm"
                >
                  <span>Buka Panel Cabang</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
