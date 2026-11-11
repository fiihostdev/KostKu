"use client";

import { useState, useMemo } from "react";
import { useKost } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import type { CashFlow } from "@/lib/store";

export default function LaporanKeuanganPage() {
  const { stats, cashFlows, addCashFlow, deleteCashFlow, loading } = useKost();
  const toast = useToast();

  // Filter bulan/tahun
  const now = new Date();
  const [filterBulan, setFilterBulan] = useState(now.getMonth()); // 0-11
  const [filterTahun, setFilterTahun] = useState(now.getFullYear());

  // Modal tambah pengeluaran/pemasukan manual
  const [showAddCF, setShowAddCF] = useState(false);
  const [cfForm, setCfForm] = useState({ tgl: new Date().toISOString().split("T")[0], ket: "", kat: "Utilitas", tipe: "Keluar" as "Masuk"|"Keluar", nominal: "" });
  const [addingCF, setAddingCF] = useState(false);

  // Delete cash flow
  const [deleteCFTarget, setDeleteCFTarget] = useState<CashFlow | null>(null);
  const [deletingCF, setDeletingCF] = useState(false);

  // Filter cashFlows berdasarkan bulan/tahun
  const filteredCF = useMemo(() => {
    return cashFlows.filter((c) => {
      // Format tgl bervariasi — coba parse
      const d = new Date(c.tgl);
      if (!isNaN(d.getTime())) {
        return d.getMonth() === filterBulan && d.getFullYear() === filterTahun;
      }
      // Fallback: cek apakah string mengandung nama bulan
      const bulanNames = ["jan","feb","mar","apr","mei","jun","jul","agu","sep","okt","nov","des"];
      return c.tgl.toLowerCase().includes(bulanNames[filterBulan]) &&
             c.tgl.includes(String(filterTahun));
    });
  }, [cashFlows, filterBulan, filterTahun]);

  const totalMasuk  = filteredCF.filter((c) => c.tipe === "Masuk").reduce((s, c) => s + c.nominal, 0);
  const totalKeluar = filteredCF.filter((c) => c.tipe === "Keluar").reduce((s, c) => s + c.nominal, 0);
  const labaBersih  = totalMasuk - totalKeluar;
  const margin      = totalMasuk > 0 ? Math.round((labaBersih / totalMasuk) * 100) : 0;

  const bulanOptions = [
    "Januari","Februari","Maret","April","Mei","Juni",
    "Juli","Agustus","September","Oktober","November","Desember"
  ];
  const tahunOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  // Tambah entri kas manual
  const handleAddCashFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfForm.ket.trim() || !cfForm.nominal) return;
    setAddingCF(true);
    try {
      const tgl = new Date(cfForm.tgl).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
      await addCashFlow({
        tgl,
        ket:     cfForm.ket.trim(),
        kat:     cfForm.kat,
        tipe:    cfForm.tipe,
        nominal: Number(cfForm.nominal),
      });
      toast.success("Dicatat!", `${cfForm.tipe === "Masuk" ? "Pemasukan" : "Pengeluaran"} Rp ${Number(cfForm.nominal).toLocaleString("id-ID")} berhasil dicatat.`);
      setShowAddCF(false);
      setCfForm({ tgl: new Date().toISOString().split("T")[0], ket: "", kat: "Utilitas", tipe: "Keluar", nominal: "" });
    } catch {
      toast.error("Gagal mencatat", "Periksa koneksi.");
    } finally {
      setAddingCF(false);
    }
  };

  // Hapus entri kas
  const handleDeleteCF = async () => {
    if (!deleteCFTarget) return;
    setDeletingCF(true);
    try {
      await deleteCashFlow(deleteCFTarget.id);
      toast.success("Dihapus", "Entri kas berhasil dihapus.");
      setDeleteCFTarget(null);
    } finally {
      setDeletingCF(false);
    }
  };

  // Export CSV nyata
  const handleExportCSV = () => {
    if (filteredCF.length === 0) { toast.info("Tidak ada data", "Tidak ada transaksi pada periode ini."); return; }
    const header = "Tanggal,Keterangan,Kategori,Tipe,Nominal,Saldo\n";
    const rows = filteredCF.map((c) =>
      `"${c.tgl}","${c.ket}","${c.kat}","${c.tipe}",${c.nominal},${c.saldo}`
    ).join("\n");
    const csv  = header + rows;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `laporan-${bulanOptions[filterBulan].toLowerCase()}-${filterTahun}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Diekspor!", `File CSV ${bulanOptions[filterBulan]} ${filterTahun} siap didownload.`);
  };
  const margin = totalMasuk > 0 ? Math.round((labaBersih / totalMasuk) * 100) : 0;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-full">
      {/* Confirm delete CF */}
      <ConfirmModal
        isOpen={!!deleteCFTarget}
        title="Hapus Entri Kas?"
        message={`"${deleteCFTarget?.ket}" — Rp ${deleteCFTarget?.nominal.toLocaleString("id-ID")} akan dihapus.`}
        confirmLabel={deletingCF ? "Menghapus..." : "Ya, Hapus"}
        cancelLabel="Batal"
        variant="danger"
        onConfirm={handleDeleteCF}
        onCancel={() => setDeleteCFTarget(null)}
      />

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
          {/* Filter Bulan */}
          <div className="skeu-card px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary">calendar_month</span>
            <select value={filterBulan} onChange={(e) => setFilterBulan(Number(e.target.value))}
              className="bg-transparent text-slate-800 outline-none cursor-pointer">
              {bulanOptions.map((b, i) => <option key={i} value={i}>{b}</option>)}
            </select>
            <select value={filterTahun} onChange={(e) => setFilterTahun(Number(e.target.value))}
              className="bg-transparent text-slate-800 outline-none cursor-pointer">
              {tahunOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {/* Tambah pengeluaran */}
          <button
            onClick={() => setShowAddCF(true)}
            className="skeu-button-secondary text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm text-slate-700">
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Catat Transaksi</span>
          </button>
          {/* Export CSV nyata */}
          <button
            onClick={handleExportCSV}
            className="skeu-button text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md flex-1 sm:flex-none justify-center">
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Ekspor CSV</span>
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
                ) : filteredCF.map((c) => (
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
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap flex items-center justify-end gap-2">
                      Rp {c.saldo.toLocaleString("id-ID")}
                      <button onClick={() => setDeleteCFTarget(c)}
                        className="text-red-400 hover:text-red-600 transition-colors ml-1" title="Hapus entri">
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
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
              Arus kas otomatis diperbarui setiap kali Anda menekan tombol &apos;Bayar&apos; pada invoice tagihan penyewa. Gunakan tombol <strong>Catat Transaksi</strong> untuk mencatat pengeluaran operasional (listrik, WiFi, gaji staf, dsb).
            </p>
          </div>
        </div>
      </div>
    </div>

      {/* ── Modal Catat Transaksi ── */}
      {showAddCF && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="skeu-card p-5 rounded-2xl max-w-md w-full shadow-2xl text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/60">
              <h3 className="font-black text-sm text-slate-900">Catat Transaksi Kas</h3>
              <button onClick={() => setShowAddCF(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleAddCashFlow} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal</label>
                  <input type="date" required value={cfForm.tgl}
                    onChange={(e) => setCfForm({...cfForm, tgl: e.target.value})}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tipe</label>
                  <select value={cfForm.tipe} onChange={(e) => setCfForm({...cfForm, tipe: e.target.value as "Masuk"|"Keluar"})}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none cursor-pointer">
                    <option value="Keluar">Pengeluaran</option>
                    <option value="Masuk">Pemasukan Lain</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Keterangan</label>
                <input required type="text" placeholder="Tagihan listrik, gaji satpam..." value={cfForm.ket}
                  onChange={(e) => setCfForm({...cfForm, ket: e.target.value})}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kategori</label>
                  <select value={cfForm.kat} onChange={(e) => setCfForm({...cfForm, kat: e.target.value})}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none cursor-pointer">
                    {["Utilitas","WiFi & Internet","Gaji Staf","Perawatan","Kebersihan","Keamanan","Administrasi","Lain-lain"].map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nominal (Rp)</label>
                  <input required type="number" min="1" placeholder="500000" value={cfForm.nominal}
                    onChange={(e) => setCfForm({...cfForm, nominal: e.target.value})}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none" />
                </div>
              </div>
              <div className={`p-3 rounded-xl text-[11px] font-bold ${cfForm.tipe === "Keluar" ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
                {cfForm.tipe === "Keluar" ? "📤 Pengeluaran" : "📥 Pemasukan"}: Rp {Number(cfForm.nominal || 0).toLocaleString("id-ID")}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowAddCF(false)} className="skeu-button-secondary px-4 py-2 rounded-xl font-bold">Batal</button>
                <button type="submit" disabled={addingCF} className="skeu-button px-5 py-2 rounded-xl font-bold shadow-md disabled:opacity-70">
                  {addingCF ? "Menyimpan..." : "Simpan Transaksi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
  );
}
