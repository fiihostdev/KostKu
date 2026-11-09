"use client";

import { useState } from "react";
import { useKost } from "@/lib/store";
import MidtransModal from "@/components/payment/MidtransModal";

export default function TagihanPage() {
  const { invoices, addInvoice, payInvoice, tenants, rooms } = useKost();
  const [filter, setFilter] = useState("Semua");
  const [showModal, setShowModal] = useState(false);
  const [showMidtrans, setShowMidtrans] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [selectedAmount, setSelectedAmount] = useState(0);
  const [selectedItemName, setSelectedItemName] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  
  const [newInv, setNewInv] = useState({
    penyewa: "",
    kamar: "",
    nominal: 1800000,
    jatuhTempo: "",
    metode: "Midtrans Payment Gateway",
  });

  const filteredInvoices = invoices.filter((inv) => {
    if (filter === "Semua") return true;
    return inv.status === filter;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    addInvoice({
      penyewa: newInv.penyewa,
      kamar: newInv.kamar,
      nominal: Number(newInv.nominal),
      jatuhTempo: newInv.jatuhTempo || (() => {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
      })(),
      metode: newInv.metode,
      status: "Menunggu",
    });
    setShowModal(false);
    setNewInv({ penyewa: "", kamar: "", nominal: 1800000, jatuhTempo: "", metode: "Midtrans Payment Gateway" });
  };

  const handleBayar = (invId: string, nominal: number, kamar: string, penyewa: string) => {
    setSelectedInvoice(invId);
    setSelectedAmount(nominal);
    setSelectedItemName(`Sewa ${kamar}`);
    setSelectedCustomer(penyewa);
    setShowMidtrans(true);
  };

  const handleMidtransSuccess = () => {
    if (selectedInvoice) {
      payInvoice(selectedInvoice);
      setSelectedInvoice(null);
    }
    setShowMidtrans(false);
  };

  const handleBroadcastWA = () => {
    const unpaid = invoices.filter((i) => i.status !== "Lunas");
    if (unpaid.length === 0) {
      alert("Semua tagihan sudah lunas! Tidak ada tagihan tertunda.");
      return;
    }
    const msg = encodeURIComponent(
      `🏠 *Pengingat Tagihan Sewa KOSTKU*\n\nYth. Penyewa,\n\nMohon segera menyelesaikan pembayaran tagihan sewa kos Anda sebelum tanggal jatuh tempo.\n\nTerima kasih atas kerjasamanya! 🙏`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const pendapatanLunas = invoices.filter((i) => i.status === "Lunas").reduce((s, i) => s + i.nominal, 0);
  const tagiBelumLunas = invoices.filter((i) => i.status !== "Lunas").reduce((s, i) => s + i.nominal, 0);
  const kepatuhan = invoices.length > 0 ? Math.round((invoices.filter((i) => i.status === "Lunas").length / invoices.length) * 100) : 0;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-full">
      {/* Midtrans Modal */}
      <MidtransModal
        isOpen={showMidtrans}
        grossAmount={selectedAmount}
        orderId={selectedInvoice || "INV-001"}
        itemName={selectedItemName}
        customerName={selectedCustomer}
        onClose={() => setShowMidtrans(false)}
        onSuccess={handleMidtransSuccess}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-primary uppercase">Financial Hub</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Manajemen Tagihan & Keuangan</h1>
          <p className="text-xs text-slate-500 mt-0.5">Invoice otomatis, pembayaran QRIS/VA, dan notifikasi WhatsApp.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleBroadcastWA}
            className="skeu-button-secondary text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm text-emerald-800 flex-1 sm:flex-none"
          >
            <span className="material-symbols-outlined text-[16px] text-emerald-600">forward_to_inbox</span>
            <span>Broadcast WA</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="skeu-button text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md flex-1 sm:flex-none"
          >
            <span className="material-symbols-outlined text-[16px]">add_card</span>
            <span>Buat Tagihan</span>
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="skeu-card p-3 sm:p-4 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase truncate">Pendapatan Lunas</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">Rp {(pendapatanLunas / 1000000).toFixed(1)} Jt</div>
          <span className="text-[10px] text-emerald-700 font-bold mt-1 block">{invoices.filter((i) => i.status === "Lunas").length} Invoice Lunas</span>
        </div>
        <div className="skeu-card p-3 sm:p-4 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs text-amber-600 font-semibold uppercase truncate">Belum Lunas</span>
          <div className="text-xl sm:text-2xl font-black text-amber-700 mt-1">Rp {(tagiBelumLunas / 1000000).toFixed(1)} Jt</div>
          <span className="text-[10px] text-amber-700 font-bold mt-1 block">{invoices.filter((i) => i.status !== "Lunas").length} Tagihan Pending</span>
        </div>
        <div className="skeu-card p-3 sm:p-4 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase truncate">Total Invoice</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{invoices.length} Terbit</div>
          <span className="text-[10px] text-slate-500 mt-1 block">Semua Periode</span>
        </div>
        <div className="skeu-card p-3 sm:p-4 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs text-emerald-600 font-semibold uppercase truncate">Kepatuhan Bayar</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">{kepatuhan}%</div>
          <span className="text-[10px] text-emerald-700 font-bold mt-1 block">Tepat Waktu</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-white/60">
        {["Semua", "Lunas", "Menunggu", "Jatuh Tempo"].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              filter === tab ? "skeu-button text-white shadow-sm" : "skeu-card text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab} ({tab === "Semua" ? invoices.length : invoices.filter((i) => i.status === tab).length})
          </button>
        ))}
      </div>

      {/* Invoice Table */}
      <div className="skeu-card rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[720px]">
            <thead>
              <tr className="border-b border-white/60 bg-white/40 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">No. Invoice</th>
                <th className="py-3 px-4">Penyewa</th>
                <th className="py-3 px-4">Kamar</th>
                <th className="py-3 px-4">Nominal</th>
                <th className="py-3 px-4">Jatuh Tempo</th>
                <th className="py-3 px-4">Metode</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/40">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">Tidak ada tagihan pada filter ini</td>
                </tr>
              ) : filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-white/50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">{inv.noInvoice}</td>
                  <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">{inv.penyewa}</td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{inv.kamar}</td>
                  <td className="py-3 px-4 font-black text-slate-900 whitespace-nowrap">
                    Rp {inv.nominal.toLocaleString("id-ID")}
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">{inv.jatuhTempo}</td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap text-[11px]">{inv.metode}</td>
                  <td className="py-3 px-4 whitespace-nowrap">
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
                  <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                    {inv.status !== "Lunas" ? (
                      <button
                        onClick={() => handleBayar(inv.id, inv.nominal, inv.kamar, inv.penyewa)}
                        className="px-2.5 py-1 rounded-lg skeu-button text-[10px] font-bold inline-flex items-center gap-1"
                        title="Bayar via Midtrans Sandbox"
                      >
                        <span className="material-symbols-outlined text-[13px]">payments</span>
                        Bayar
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-600 inline-flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[13px]">done_all</span>
                        Terbayar
                      </span>
                    )}
                    <button
                      onClick={() => {
                        const tenant = tenants.find((t) => t.nama === inv.penyewa);
                        const phone = tenant?.phone || "";
                        const cleanPhone = phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
                        const msg = encodeURIComponent(
                          `Halo ${inv.penyewa}, ini rincian tagihan sewa ${inv.kamar} (${inv.noInvoice}) sebesar Rp ${inv.nominal.toLocaleString(
                            "id-ID"
                          )} dengan jatuh tempo ${inv.jatuhTempo}. Mohon melakukan pembayaran. Terima kasih 🙏`
                        );
                        window.open(`https://wa.me/${cleanPhone || "62"}?text=${msg}`, "_blank");
                      }}
                      className="p-1.5 rounded-lg skeu-card text-emerald-600 hover:text-emerald-800 inline-flex items-center"
                      title="Kirim Tagihan via WhatsApp"
                    >
                      <span className="material-symbols-outlined text-[16px]">send</span>
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
          <div className="skeu-card p-5 sm:p-6 rounded-2xl max-w-md w-full relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/60">
              <h3 className="font-black text-base text-slate-900">Buat Tagihan Sewa Baru</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Penyewa</label>
                {tenants.length > 0 ? (
                  <select
                    required
                    value={newInv.penyewa}
                    onChange={(e) => {
                      const t = tenants.find((t) => t.nama === e.target.value);
                      const roomObj = rooms.find((r) => t?.kamar.includes(r.nomor));
                      setNewInv({
                        ...newInv,
                        penyewa: e.target.value,
                        kamar: t?.kamar || "",
                        nominal: roomObj ? roomObj.harga : newInv.nominal,
                      });
                    }}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-semibold cursor-pointer"
                  >
                    <option value="">-- Pilih Penyewa Terdaftar --</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.nama}>
                        {t.nama} ({t.kamar})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    required
                    type="text"
                    placeholder="Ketik nama penyewa"
                    value={newInv.penyewa}
                    onChange={(e) => setNewInv({ ...newInv, penyewa: e.target.value })}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
                  />
                )}
              </div>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nominal (Rp)</label>
                  <input
                    type="number"
                    step="50000"
                    value={newInv.nominal}
                    onChange={(e) => setNewInv({ ...newInv, nominal: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jatuh Tempo</label>
                  <input
                    type="date"
                    value={newInv.jatuhTempo}
                    onChange={(e) => setNewInv({ ...newInv, jatuhTempo: e.target.value })}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowModal(false)} className="skeu-button-secondary px-4 py-2 rounded-xl font-bold">
                  Batal
                </button>
                <button type="submit" className="skeu-button px-5 py-2 rounded-xl font-bold shadow-md">
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
