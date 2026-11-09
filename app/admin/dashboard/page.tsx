"use client";

import Link from "next/link";
import { useKost } from "@/lib/store";

export default function DashboardAdminKost() {
  const { stats, invoices, rooms, profile, loading } = useKost();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="skeu-card p-8 rounded-2xl text-center space-y-3">
          <span className="material-symbols-outlined text-primary text-[40px] animate-spin block">sync</span>
          <p className="text-xs font-bold text-slate-600">Memuat data dashboard...</p>
        </div>
      </div>
    );
  }

  const metricsData = [
    {
      label: "TOTAL KAMAR",
      val: stats.totalKamar.toString(),
      sub: `${stats.okupansi}% Terisi`,
      icon: "apartment",
      color: "text-primary",
      barWidth: `${stats.okupansi}%`,
      barColor: "bg-primary",
    },
    {
      label: "TERSEDIA",
      val: stats.kamarKosong.toString(),
      sub: "Siap Huni",
      icon: "meeting_room",
      color: "text-blue-600",
      barWidth: `${stats.totalKamar > 0 ? Math.round((stats.kamarKosong / stats.totalKamar) * 100) : 0}%`,
      barColor: "bg-blue-500",
    },
    {
      label: "KAMAR TERISI",
      val: stats.kamarTerisi.toString(),
      sub: `Okupansi ${stats.okupansi}%`,
      icon: "hotel",
      color: "text-emerald-600",
      barWidth: `${stats.okupansi}%`,
      barColor: "bg-emerald-600",
    },
    {
      label: "PENYEWA AKTIF",
      val: stats.kamarTerisi.toString(),
      sub: "Penghuni Aktif",
      icon: "group",
      color: "text-indigo-600",
      barWidth: `${stats.okupansi}%`,
      barColor: "bg-indigo-500",
    },
    {
      label: "PENDAPATAN",
      val: `Rp ${(stats.pendapatanBulanIni / 1000000).toFixed(1)} Jt`,
      sub: "Tagihan Lunas",
      icon: "payments",
      color: "text-emerald-700",
      barWidth: "80%",
      barColor: "bg-emerald-700",
    },
    {
      label: "TERTUNDA",
      val: `Rp ${(stats.tagihanTertunda / 1000000).toFixed(1)} Jt`,
      sub: `${invoices.filter((i) => i.status !== "Lunas").length} Tagihan`,
      icon: "pending_actions",
      color: "text-amber-600",
      barWidth: "15%",
      barColor: "bg-amber-500",
    },
  ];

  const recentInvoices = invoices.slice(0, 5);
  const kosongRooms = rooms.filter((r) => r.status === "Kosong");

  return (
    <div className="space-y-6 sm:space-y-8 max-w-full">
      {/* Welcome Banner */}
      <div className="skeu-card p-5 sm:p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] sm:text-xs font-bold text-primary uppercase tracking-wider">
            Dashboard Operasional
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
            Selamat Datang! 👋
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Ringkasan operasional harian untuk{" "}
            <span className="font-semibold text-slate-700">{profile.nama}</span>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/kamar"
            className="skeu-button text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm flex-1 sm:flex-none"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            <span>Tambah Kamar</span>
          </Link>
          <Link
            href="/admin/tagihan"
            className="skeu-button-secondary text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm text-emerald-800 flex-1 sm:flex-none"
          >
            <span className="material-symbols-outlined text-[16px] text-emerald-600">send</span>
            <span>Kelola Tagihan</span>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {metricsData.map((s, idx) => (
          <div
            key={idx}
            className="skeu-card p-3 sm:p-4 rounded-xl relative overflow-hidden transition-all hover:-translate-y-0.5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 tracking-wider truncate block">
                  {s.label}
                </span>
                <span className={`material-symbols-outlined text-[18px] opacity-40 ${s.color}`}>
                  {s.icon}
                </span>
              </div>
              <div className="text-base sm:text-lg lg:text-xl font-black text-slate-900 leading-tight mt-1">
                {s.val}
              </div>
            </div>
            <div>
              <span className="text-[9px] sm:text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded inline-block mt-2 truncate max-w-full">
                {s.sub}
              </span>
              <div className="w-full bg-slate-200 h-1 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${s.barColor}`}
                  style={{ width: s.barWidth }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Invoices */}
        <div className="lg:col-span-8 skeu-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/60">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">receipt</span>
                <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                  Pembayaran & Tagihan Terbaru
                </h2>
              </div>
              <Link href="/admin/tagihan" className="text-xs font-bold text-primary hover:underline shrink-0">
                Semua Tagihan →
              </Link>
            </div>

            {recentInvoices.length === 0 ? (
              <div className="py-12 text-center">
                <span className="material-symbols-outlined text-slate-300 text-[48px] block mb-2">
                  receipt_long
                </span>
                <p className="text-xs text-slate-400 font-medium">Belum ada tagihan.</p>
                <Link
                  href="/admin/tagihan"
                  className="text-xs font-bold text-primary hover:underline mt-1 block"
                >
                  Buat tagihan pertama →
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <table className="w-full text-left text-xs min-w-[500px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">No. Invoice</th>
                      <th className="py-2.5 px-3">Penyewa</th>
                      <th className="py-2.5 px-3">Kamar</th>
                      <th className="py-2.5 px-3">Jumlah</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-white/40 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                          {inv.noInvoice}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                          {inv.penyewa}
                        </td>
                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{inv.kamar}</td>
                        <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                          Rp {inv.nominal.toLocaleString("id-ID")}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              inv.status === "Lunas"
                                ? "bg-emerald-100 text-emerald-800"
                                : inv.status === "Menunggu"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Room Status */}
        <div className="lg:col-span-4 skeu-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/60">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-[20px]">
                  meeting_room
                </span>
                <h2 className="font-bold text-slate-900 text-sm sm:text-base">Status Okupansi</h2>
              </div>
              <Link href="/admin/kamar" className="text-xs font-bold text-primary hover:underline">
                Kelola →
              </Link>
            </div>

            {stats.totalKamar === 0 ? (
              <div className="py-8 text-center">
                <span className="material-symbols-outlined text-slate-300 text-[40px] block mb-2">
                  bed
                </span>
                <p className="text-xs text-slate-400 font-medium">Belum ada kamar.</p>
                <Link
                  href="/admin/kamar"
                  className="text-xs font-bold text-primary hover:underline mt-1 block"
                >
                  Tambah kamar →
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5 mb-5">
                {[
                  { label: "Kamar Terisi", val: stats.kamarTerisi, color: "bg-emerald-500" },
                  { label: "Kamar Kosong", val: stats.kamarKosong, color: "bg-blue-500" },
                  { label: "Dalam Perawatan", val: stats.kamarPerawatan, color: "bg-amber-500" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between text-xs p-2.5 rounded-xl skeu-inset"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${item.color} shrink-0`}></span>
                      <span className="font-bold text-slate-700">{item.label}</span>
                    </div>
                    <span className="font-bold text-slate-900">{item.val} Kamar</span>
                  </div>
                ))}
              </div>
            )}

            {kosongRooms.length > 0 && (
              <div className="skeu-card p-4 rounded-xl border border-primary/20 bg-primary/5">
                <div className="flex items-center gap-2 mb-1.5 text-primary font-bold text-xs">
                  <span className="material-symbols-outlined text-[18px]">campaign</span>
                  <span>Promosikan Kamar Kosong</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                  {kosongRooms.map((r) => r.nomor).join(", ")} siap huni. Tampilkan di website publik Anda.
                </p>
                <Link
                  href="/admin/website"
                  className="skeu-button text-[11px] font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1 shadow-sm"
                >
                  <span>Buka Website Saya</span>
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
