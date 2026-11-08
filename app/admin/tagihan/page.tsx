"use client";

import { useState } from "react";

interface Invoice {
  id: string;
  noInvoice: string;
  penyewa: string;
  kamar: string;
  nominal: number;
  jatuhTempo: string;
  metode: string;
  status: "Lunas" | "Menunggu" | "Jatuh Tempo";
}

const initialInvoices: Invoice[] = [
  { id: "1", noInvoice: "INV/2026/11/001", penyewa: "Dimas Anggara", kamar: "Kamar A-01", nominal: 1800000, jatuhTempo: "05 Nov 2026", metode: "Midtrans (QRIS)", status: "Lunas" },
  { id: "2", noInvoice: "INV/2026/11/002", penyewa: "Andi Pratama", kamar: "Kamar A-03", nominal: 1800000, jatuhTempo: "05 Nov 2026", metode: "Midtrans (BCA VA)", status: "Lunas" },
  { id: "3", noInvoice: "INV/2026/11/003", penyewa: "Rian Hidayat", kamar: "Kamar A-04", nominal: 2500000, jatuhTempo: "10 Nov 2026", metode: "Transfer Manual", status: "Menunggu" },
  { id: "4", noInvoice: "INV/2026/11/004", penyewa: "Fajar Nugraha", kamar: "Kamar B-01", nominal: 1500000, jatuhTempo: "01 Nov 2026", metode: "Midtrans Link", status: "Jatuh Tempo" },
  { id: "5", noInvoice: "INV/2026/11/005", penyewa: "Budi Santoso", kamar: "Kamar B-02", nominal: 1800000, jatuhTempo: "05 Nov 2026", metode: "Tunai", status: "Lunas" },
  { id: "6", noInvoice: "INV/2026/11/006", penyewa: "Siti Rahmawati", kamar: "Kamar B-04", nominal: 2600000, jatuhTempo: "05 Nov 2026", metode: "Midtrans (GoPay)", status: "Lunas" },
];

export default function TagihanPage() {
  const [filter, setFilter] = useState("Semua");
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [showModal, setShowModal] = useState(false);
  const [newInv, setNewInv] = useState({
    penyewa: "",
    kamar: "",
    nominal: 1800000,
    jatuhTempo: "15 Nov 2026",
    metode: "Midtrans Payment Gateway",
  });

  const filteredInvoices = invoices.filter((inv) => {
    if (filter === "Semua") return true;
    return inv.status === filter;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const inv: Invoice = {
      id: Date.now().toString(),
      noInvoice: `INV/2026/11/00${invoices.length + 1}`,
      penyewa: newInv.penyewa,
      kamar: newInv.kamar,
      nominal: Number(newInv.nominal),
      jatuhTempo: newInv.jatuhTempo,
      metode: newInv.metode,
      status: "Menunggu",
    };
    setInvoices([inv, ...invoices]);
    setShowModal(false);
  };

  const handleBroadcast = () => {
    alert("Broadcast pengingat tagihan WhatsApp otomatis dikirimkan ke 2 penyewa yang belum lunas!");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-primary uppercase">Financial Hub</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Tagihan & Keuangan</h1>
          <p className="text-xs text-slate-500 mt-1">Pengelolaan invoice otomatis, penerimaan pembayaran QRIS/VA, dan notifikasi WhatsApp.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleBroadcast}
            className="skeu-button-secondary text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm text-emerald-700"
          >
            <span className="material-symbols-outlined text-[18px]">forward_to_inbox</span>
            <span>Broadcast WA</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="skeu-button text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-md"
          >
            <span className="material-symbols-outlined text-[18px]">add_card</span>
            <span>Buat Tagihan Baru</span>
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="skeu-card p-4 rounded-xl">
          <span className="text-xs text-slate-500 font-medium">Pendapatan Bulan Ini</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">Rp 36.500.000</div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">91.6% dari target</span>
        </div>
        <div className="skeu-card p-4 rounded-xl">
          <span className="text-xs text-amber-600 font-medium">Tagihan Belum Lunas</span>
          <div className="text-2xl font-bold text-amber-700 mt-1">Rp 4.000.000</div>
          <span className="text-[10px] text-amber-700 font-semibold mt-1 block">2 Tagihan Pending</span>
        </div>
        <div className="skeu-card p-4 rounded-xl">
          <span className="text-xs text-slate-500 font-medium">Total Invoice Terbit</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{invoices.length} Invoice</div>
          <span className="text-[10px] text-slate-500 mt-1 block">Periode November 2026</span>
        </div>
        <div className="skeu-card p-4 rounded-xl">
          <span className="text-xs text-emerald-600 font-medium">Kepatuhan Pembayaran</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">92.3%</div>
          <span className="text-[10px] text-emerald-600 mt-1 block">Sangat Baik</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-white/60 pb-3">
        {["Semua", "Lunas", "Menunggu", "Jatuh Tempo"].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === tab
                ? "skeu-button text-white shadow-sm"
                : "skeu-card text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Invoice Table */}
      <div className="skeu-card rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/60 bg-white/40 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">No. Invoice</th>
                <th className="py-3 px-4">Penyewa</th>
                <th className="py-3 px-4">Kamar</th>
                <th className="py-3 px-4">Nominal</th>
                <th className="py-3 px-4">Jatuh Tempo</th>
                <th className="py-3 px-4">Metode Bayar</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/40">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-white/50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-700">{inv.noInvoice}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{inv.penyewa}</td>
                  <td className="py-3 px-4 text-slate-600">{inv.kamar}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    Rp {inv.nominal.toLocaleString("id-ID")}
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px]">{inv.jatuhTempo}</td>
                  <td className="py-3 px-4 text-slate-600">{inv.metode}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
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
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => alert(`Mengirim tagihan via WhatsApp untuk invoice ${inv.noInvoice}`)}
                      className="p-1.5 rounded-lg skeu-card text-emerald-600 hover:text-emerald-800 inline-flex items-center"
                      title="Kirim Tagihan WA"
                    >
                      <span className="material-symbols-outlined text-[16px]">send</span>
                    </button>
                    <button
                      onClick={() => alert(`Mencetak kwitansi pembayaran ${inv.noInvoice}`)}
                      className="p-1.5 rounded-lg skeu-card text-slate-600 hover:text-slate-900 inline-flex items-center"
                      title="Cetak Kwitansi"
                    >
                      <span className="material-symbols-outlined text-[16px]">print</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Buat Tagihan */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="skeu-card p-6 rounded-2xl max-w-md w-full relative shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/60">
              <h3 className="font-bold text-base text-slate-900">Buat Tagihan Sewa Baru</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Penyewa</label>
                <input
                  required
                  type="text"
                  placeholder="Pilih atau ketik nama penyewa"
                  value={newInv.penyewa}
                  onChange={(e) => setNewInv({ ...newInv, penyewa: e.target.value })}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kamar</label>
                  <input
                    required
                    type="text"
                    placeholder="Contoh: Kamar A-02"
                    value={newInv.kamar}
                    onChange={(e) => setNewInv({ ...newInv, kamar: e.target.value })}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nominal (Rp)</label>
                  <input
                    type="number"
                    step="50000"
                    value={newInv.nominal}
                    onChange={(e) => setNewInv({ ...newInv, nominal: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tanggal Jatuh Tempo</label>
                <input
                  type="text"
                  value={newInv.jatuhTempo}
                  onChange={(e) => setNewInv({ ...newInv, jatuhTempo: e.target.value })}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="skeu-button-secondary px-4 py-2 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="skeu-button px-5 py-2 rounded-xl font-bold shadow-md"
                >
                  Terbitkan Tagihan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

