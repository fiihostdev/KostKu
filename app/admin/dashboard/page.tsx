import Link from "next/link";

export default function DashboardAdminKost() {
  const stats = [
    { label: "TOTAL KAMAR", val: "24", sub: "100% Terisi", icon: "apartment", color: "text-primary", bar: "w-full bg-primary" },
    { label: "TERSEDIA", val: "2", sub: "Siap Huni", icon: "meeting_room", color: "text-slate-500", bar: "w-[8%] bg-emerald-500" },
    { label: "KAMAR TERISI", val: "22", sub: "Okupansi 92%", icon: "hotel", color: "text-emerald-600", bar: "w-[92%] bg-emerald-600" },
    { label: "PENYEWA AKTIF", val: "26", sub: "+2 Bulan ini", icon: "group", color: "text-indigo-600", bar: "w-full bg-indigo-500" },
    { label: "PENDAPATAN", val: "Rp 39.6 Jt", sub: "Target 42 Jt", icon: "payments", color: "text-emerald-700", bar: "w-[94%] bg-emerald-700" },
    { label: "TERTUNDA", val: "Rp 2.4 Jt", sub: "2 Penyewa", icon: "pending_actions", color: "text-amber-600", bar: "w-[12%] bg-amber-500" },
  ];

  const recentTransactions = [
    { no: "INV-2026-089", nama: "Dimas Anggara", kamar: "Kamar A-01", tgl: "07 Nov 2026", jumlah: "Rp 1.800.000", metode: "Midtrans (QRIS)", status: "Lunas" },
    { no: "INV-2026-088", nama: "Siti Rahmawati", kamar: "Kamar B-04", tgl: "06 Nov 2026", jumlah: "Rp 2.200.000", metode: "Transfer BCA", status: "Lunas" },
    { no: "INV-2026-087", nama: "Budi Santoso", kamar: "Kamar C-02", tgl: "05 Nov 2026", jumlah: "Rp 1.500.000", metode: "Midtrans (GoPay)", status: "Lunas" },
    { no: "INV-2026-086", nama: "Fajar Nugraha", kamar: "Kamar A-05", tgl: "03 Nov 2026", jumlah: "Rp 1.800.000", metode: "Menunggu Transfer", status: "Tertunda" },
    { no: "INV-2026-085", nama: "Jessica Mila", kamar: "Kamar VIP-01", tgl: "01 Nov 2026", jumlah: "Rp 3.500.000", metode: "Midtrans (Mandiri VA)", status: "Lunas" },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 max-w-full">
      {/* Welcome Banner */}
      <div className="skeu-card p-5 sm:p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] sm:text-xs font-bold text-primary uppercase tracking-wider">Dashboard Operasional</span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">Selamat Datang, Pak Usman! 👋</h1>
          <p className="text-xs text-slate-500 mt-1">
            Ringkasan operasional harian untuk <span className="font-semibold text-slate-700">Kost Harmoni Residence</span>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/kamar" className="skeu-button text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm flex-1 sm:flex-none">
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            <span>Tambah Kamar</span>
          </Link>
          <Link href="/admin/tagihan" className="skeu-button-secondary text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm text-emerald-800 flex-1 sm:flex-none">
            <span className="material-symbols-outlined text-[16px] text-emerald-600">send</span>
            <span>Kirim Tagihan WA</span>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {stats.map((s, idx) => (
          <div key={idx} className="skeu-card p-3 sm:p-4 rounded-xl relative overflow-hidden transition-all hover:-translate-y-0.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 tracking-wider truncate block">{s.label}</span>
                <span className={`material-symbols-outlined text-[18px] opacity-40 ${s.color}`}>{s.icon}</span>
              </div>
              <div className="text-base sm:text-lg lg:text-xl font-black text-slate-900 leading-tight mt-1">{s.val}</div>
            </div>
            <div>
              <span className="text-[9px] sm:text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded inline-block mt-2 truncate max-w-full">
                {s.sub}
              </span>
              <div className="w-full bg-slate-200 h-1 rounded-full mt-2 overflow-hidden">
                <div className={`h-full rounded-full ${s.bar}`}></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid: Transactions Table & Room Status Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Invoices Table */}
        <div className="lg:col-span-8 skeu-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/60">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">receipt</span>
                <h2 className="font-bold text-slate-900 text-sm sm:text-base">Pembayaran & Tagihan Terbaru</h2>
              </div>
              <Link href="/admin/tagihan" className="text-xs font-bold text-primary hover:underline shrink-0">
                Semua Tagihan →
              </Link>
            </div>

            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">No. Invoice</th>
                    <th className="py-2.5 px-3">Penyewa</th>
                    <th className="py-2.5 px-3">Kamar</th>
                    <th className="py-2.5 px-3">Jumlah</th>
                    <th className="py-2.5 px-3">Metode</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentTransactions.map((t, i) => (
                    <tr key={i} className="hover:bg-white/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">{t.no}</td>
                      <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">{t.nama}</td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{t.kamar}</td>
                      <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">{t.jumlah}</td>
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap text-[11px]">{t.metode}</td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            t.status === "Lunas"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Room Status Overview Card */}
        <div className="lg:col-span-4 skeu-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/60">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-[20px]">meeting_room</span>
                <h2 className="font-bold text-slate-900 text-sm sm:text-base">Status Okupansi</h2>
              </div>
              <Link href="/admin/kamar" className="text-xs font-bold text-primary hover:underline">
                Kelola Kamar →
              </Link>
            </div>

            <div className="space-y-2.5 mb-5">
              <div className="flex items-center justify-between text-xs p-2.5 rounded-xl skeu-inset">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="font-bold text-slate-700">Kamar Terisi (Lunas)</span>
                </div>
                <span className="font-bold text-slate-900">20 Kamar</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2.5 rounded-xl skeu-inset">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                  <span className="font-bold text-slate-700">Jatuh Tempo (H-3)</span>
                </div>
                <span className="font-bold text-slate-900">2 Kamar</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2.5 rounded-xl skeu-inset">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></span>
                  <span className="font-bold text-slate-700">Kamar Kosong (Tersedia)</span>
                </div>
                <span className="font-bold text-slate-900">2 Kamar</span>
              </div>
            </div>

            <div className="skeu-card p-4 rounded-xl border border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2 mb-1.5 text-primary font-bold text-xs">
                <span className="material-symbols-outlined text-[18px]">campaign</span>
                <span>Promosikan Kamar Kosong</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                Kamar A-02 dan B-06 siap huni. Tampilkan foto dan tarif di website publik Anda.
              </p>
              <Link
                href="/admin/website"
                className="skeu-button text-[11px] font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1 shadow-sm"
              >
                <span>Buka Website Saya</span>
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
