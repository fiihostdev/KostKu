"use client";

import { useState } from "react";
import { useKost } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import PaymentModal from "@/components/payment/PaymentModal";
import type { Tenant } from "@/lib/store";

export default function DataPenyewaPage() {
  const { tenants, addTenant, updateTenant, deleteTenant, rooms, invoices, addInvoice, payInvoice, loading } = useKost();
  const toast = useToast();

  const [search,       setSearch]       = useState("");
  const [filter,       setFilter]       = useState("Semua");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTenant,    setNewTenant]    = useState({ nama: "", phone: "", kamar: "", mulaiSewa: "", akhirSewa: "" });

  // Edit state
  const [editTarget,   setEditTarget]   = useState<Tenant | null>(null);
  const [editForm,     setEditForm]     = useState({ nama: "", phone: "", kamar: "", mulaiSewa: "", akhirSewa: "", statusBayar: "Lunas" as Tenant["statusBayar"], ktpVerified: false });
  const [editLoading,  setEditLoading]  = useState(false);

  // Delete state
  const [deleteTarget,  setDeleteTarget]  = useState<Tenant | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Payment state
  const [payTarget,     setPayTarget]     = useState<Tenant | null>(null);
  const [payInvId,      setPayInvId]      = useState<string | null>(null);
  const [payInvNo,      setPayInvNo]      = useState("");
  const [payNominal,    setPayNominal]    = useState(0);

  const availableRooms = rooms.filter((r) => r.status === "Kosong");

  const filteredTenants = tenants.filter((t) => {
    const matchSearch =
      t.nama.toLowerCase().includes(search.toLowerCase()) ||
      t.kamar.toLowerCase().includes(search.toLowerCase()) ||
      t.phone.includes(search);
    const matchFilter = filter === "Semua" || t.statusBayar === filter;
    return matchSearch && matchFilter;
  });

  const lunasCount     = tenants.filter((t) => t.statusBayar === "Lunas").length;
  const jatuhTempoCount = tenants.filter((t) => t.statusBayar === "Jatuh Tempo").length;
  const tertunggakCount = tenants.filter((t) => t.statusBayar === "Tertunggak").length;

  // ── Tambah penyewa ──────────────────────────────────────────────────────────
  const handleAddTenant = (e: React.FormEvent) => {
    e.preventDefault();
    addTenant({
      nama:        newTenant.nama,
      phone:       newTenant.phone,
      kamar:       newTenant.kamar ? `Kamar ${newTenant.kamar}` : "Kamar Baru",
      mulaiSewa:   newTenant.mulaiSewa,
      akhirSewa:   newTenant.akhirSewa,
      statusBayar: "Menunggu",
      ktpVerified: false,
    });
    setShowAddModal(false);
    setNewTenant({ nama: "", phone: "", kamar: "", mulaiSewa: "", akhirSewa: "" });
    toast.success("Penyewa ditambahkan!", "Data penyewa berhasil disimpan.");
  };

  // ── Buka modal edit ────────────────────────────────────────────────────────
  const openEdit = (t: Tenant) => {
    setEditTarget(t);
    setEditForm({
      nama:        t.nama,
      phone:       t.phone,
      kamar:       t.kamar,
      mulaiSewa:   t.mulaiSewa,
      akhirSewa:   t.akhirSewa,
      statusBayar: t.statusBayar,
      ktpVerified: t.ktpVerified,
    });
  };

  // ── Simpan edit ────────────────────────────────────────────────────────────
  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditLoading(true);
    try {
      await updateTenant(editTarget.id, {
        nama:        editForm.nama,
        phone:       editForm.phone,
        kamar:       editForm.kamar,
        mulaiSewa:   editForm.mulaiSewa,
        akhirSewa:   editForm.akhirSewa,
        statusBayar: editForm.statusBayar,
        ktpVerified: editForm.ktpVerified,
      });
      toast.success("Penyewa diperbarui!", `${editForm.nama} berhasil diupdate.`);
      setEditTarget(null);
    } catch {
      toast.error("Gagal menyimpan", "Periksa koneksi dan coba lagi.");
    } finally {
      setEditLoading(false);
    }
  };

  // ── Hapus penyewa ──────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteTenant(deleteTarget.id);
      toast.success("Penyewa dihapus", `${deleteTarget.nama} telah dihapus. Kamar dibebaskan.`);
      setDeleteTarget(null);
    } catch {
      toast.error("Gagal menghapus", "Coba lagi.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Buka modal bayar tagihan dari menu penyewa ──────────────────────────────
  const handleOpenPayment = async (t: Tenant) => {
    // Cari invoice tertunggak milik penyewa ini
    const unpaidInv = invoices.find((i) => i.penyewa === t.nama && i.status !== "Lunas");

    if (unpaidInv) {
      setPayTarget(t);
      setPayInvId(unpaidInv.id);
      setPayInvNo(unpaidInv.noInvoice);
      setPayNominal(unpaidInv.nominal);
    } else {
      // Buat invoice baru otomatis
      const room = rooms.find((r) => r.kamar === t.kamar || r.nomor === t.kamar.replace(/^kamar\s*/i, "").trim());
      const nominal = room?.harga || 0;
      if (!nominal) {
        toast.error("Nominal tidak diketahui", "Tambahkan kamar dengan harga terlebih dahulu.");
        return;
      }
      const d = new Date();
      d.setDate(d.getDate() + 7);
      const jatuhTempo = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
      await addInvoice({ penyewa: t.nama, kamar: t.kamar, nominal, jatuhTempo, metode: "QRIS / Online", status: "Menunggu" });

      const newInv = invoices.find((i) => i.penyewa === t.nama && i.status !== "Lunas");
      if (newInv) {
        setPayTarget(t);
        setPayInvId(newInv.id);
        setPayInvNo(newInv.noInvoice);
        setPayNominal(newInv.nominal);
      } else {
        toast.info("Invoice dibuat", "Buka menu Tagihan untuk melihat dan memproses pembayaran.");
      }
    }
  };

  const handlePaymentSuccess = (invoiceId: string) => {
    payInvoice(invoiceId);
    setPayTarget(null);
    setPayInvId(null);
    toast.success("Pembayaran berhasil!", "Invoice telah ditandai Lunas.");
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-full">

      {/* Confirm Delete */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title={`Hapus Penyewa ${deleteTarget?.nama || ""}?`}
        message="Penyewa akan dihapus permanen dan kamarnya akan dibebaskan (status kembali Kosong)."
        confirmLabel={deleteLoading ? "Menghapus..." : "Ya, Hapus"}
        cancelLabel="Batal"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Payment Modal */}
      {payTarget && payInvId && (
        <PaymentModal
          isOpen={!!payTarget}
          onClose={() => { setPayTarget(null); setPayInvId(null); }}
          onSuccess={handlePaymentSuccess}
          invoiceId={payInvId}
          invoiceNo={payInvNo}
          penyewa={payTarget.nama}
          kamar={payTarget.kamar}
          nominal={payNominal}
        />
      )}

      {loading && (
        <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
          <span className="material-symbols-outlined text-[16px] animate-spin text-primary">sync</span>
          Memuat data penyewa...
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-primary uppercase">Modul Penyewa</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Data Penyewa Aktif</h1>
          <p className="text-xs text-slate-500 mt-0.5">Kelola informasi penyewa, kontrak sewa, dan status pembayaran.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="skeu-button text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md w-full sm:w-auto"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Tambah Penyewa
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Total Penyewa", val: tenants.length, color: "text-slate-900" },
          { label: "Lunas",         val: lunasCount,      color: "text-emerald-700" },
          { label: "Jatuh Tempo",   val: jatuhTempoCount, color: "text-amber-700" },
          { label: "Tertunggak",    val: tertunggakCount, color: "text-red-700" },
        ].map((s) => (
          <div key={s.label} className="skeu-card p-3 sm:p-4 rounded-xl">
            <span className="text-[10px] text-slate-500 font-semibold uppercase">{s.label}</span>
            <div className={`text-xl font-black mt-1 ${s.color}`}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
          <input
            type="text"
            placeholder="Cari nama, kamar, atau nomor HP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl skeu-inset text-slate-800 outline-none"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {["Semua", "Lunas", "Jatuh Tempo", "Tertunggak"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                filter === tab ? "skeu-button shadow-sm" : "skeu-card text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tenant Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredTenants.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400 text-sm">
            {search ? "Penyewa tidak ditemukan." : "Belum ada data penyewa."}
          </div>
        ) : filteredTenants.map((t) => (
          <div key={t.id} className="skeu-card p-4 sm:p-5 rounded-2xl flex flex-col gap-3">
            {/* Top */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-[20px]">person</span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-sm text-slate-900 truncate">{t.nama}</h3>
                  <p className="text-[11px] text-slate-500 truncate">{t.kamar}</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                t.statusBayar === "Lunas"       ? "bg-emerald-100 text-emerald-800" :
                t.statusBayar === "Jatuh Tempo" ? "bg-amber-100 text-amber-800" :
                "bg-red-100 text-red-800"
              }`}>
                {t.statusBayar}
              </span>
            </div>

            {/* Detail */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="skeu-inset p-2 rounded-lg">
                <span className="text-slate-400 block text-[10px]">Mulai Sewa</span>
                <span className="font-bold text-slate-800">{t.mulaiSewa}</span>
              </div>
              <div className="skeu-inset p-2 rounded-lg">
                <span className="text-slate-400 block text-[10px]">Akhir Sewa</span>
                <span className="font-bold text-slate-800">{t.akhirSewa}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 pt-2 border-t border-white/60">
              {/* Bayar Tagihan */}
              {t.statusBayar !== "Lunas" && (
                <button
                  onClick={() => handleOpenPayment(t)}
                  className="flex-1 skeu-button text-[10px] font-bold py-2 rounded-xl flex items-center justify-center gap-1 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[13px]">payments</span>
                  Bayar
                </button>
              )}

              {/* WhatsApp */}
              <a
                href={`https://wa.me/${t.phone.replace(/[^0-9]/g, "").replace(/^0/, "62")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 skeu-button-secondary text-[10px] font-bold py-2 rounded-xl flex items-center justify-center gap-1 text-emerald-800"
              >
                <span className="material-symbols-outlined text-[13px] text-emerald-600">chat</span>
                WA
              </a>

              {/* Edit */}
              <button
                onClick={() => openEdit(t)}
                className="px-2.5 py-2 rounded-xl skeu-card text-slate-600 hover:text-primary transition-colors"
                title="Edit penyewa"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
              </button>

              {/* Hapus */}
              <button
                onClick={() => setDeleteTarget(t)}
                className="px-2.5 py-2 rounded-xl skeu-card text-red-500 hover:text-red-700 transition-colors"
                title="Hapus penyewa"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
              </button>
            </div>

            {/* KTP badge */}
            <div className={`text-[10px] font-bold flex items-center gap-1 ${t.ktpVerified ? "text-emerald-600" : "text-amber-600"}`}>
              <span className="material-symbols-outlined text-[13px]">{t.ktpVerified ? "verified" : "pending"}</span>
              {t.ktpVerified ? "KTP Terverifikasi" : "KTP Pending Verifikasi"}
            </div>
          </div>
        ))}
      </div>

      {/* ── Modal Tambah Penyewa ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="skeu-card p-5 sm:p-6 rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/60">
              <h3 className="font-black text-base text-slate-900">Tambah Penyewa Baru</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleAddTenant} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Lengkap</label>
                <input required type="text" placeholder="Nama penyewa" value={newTenant.nama}
                  onChange={(e) => setNewTenant({ ...newTenant, nama: e.target.value })}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">No. WhatsApp</label>
                <input required type="tel" placeholder="081234567890" value={newTenant.phone}
                  onChange={(e) => setNewTenant({ ...newTenant, phone: e.target.value })}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Pilih Kamar</label>
                {availableRooms.length > 0 ? (
                  <select required value={newTenant.kamar}
                    onChange={(e) => setNewTenant({ ...newTenant, kamar: e.target.value })}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-semibold cursor-pointer">
                    <option value="">-- Pilih Kamar Tersedia --</option>
                    {availableRooms.map((r) => (
                      <option key={r.id} value={r.nomor}>
                        {r.nomor} - {r.tipe} (Rp {r.harga.toLocaleString("id-ID")}/bln)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2.5 rounded-xl skeu-inset text-amber-700 text-xs font-bold">
                    ⚠️ Semua kamar terisi. Tambah kamar kosong baru terlebih dahulu.
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal Mulai</label>
                  <input required type="date" value={newTenant.mulaiSewa}
                    onChange={(e) => setNewTenant({ ...newTenant, mulaiSewa: e.target.value })}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal Akhir</label>
                  <input required type="date" value={newTenant.akhirSewa}
                    onChange={(e) => setNewTenant({ ...newTenant, akhirSewa: e.target.value })}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="skeu-button-secondary px-4 py-2 rounded-xl font-bold">Batal</button>
                <button type="submit" className="skeu-button px-5 py-2 rounded-xl font-bold shadow-md" disabled={availableRooms.length === 0}>
                  Simpan Penyewa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Edit Penyewa ── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="skeu-card p-5 sm:p-6 rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/60">
              <h3 className="font-black text-base text-slate-900">Edit Penyewa</h3>
              <button onClick={() => setEditTarget(null)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleEditSave} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Lengkap</label>
                <input required type="text" value={editForm.nama}
                  onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">No. WhatsApp</label>
                <input required type="tel" value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-mono" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Kamar</label>
                <input type="text" value={editForm.kamar}
                  onChange={(e) => setEditForm({ ...editForm, kamar: e.target.value })}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mulai Sewa</label>
                  <input type="date" value={editForm.mulaiSewa}
                    onChange={(e) => setEditForm({ ...editForm, mulaiSewa: e.target.value })}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Akhir Sewa</label>
                  <input type="date" value={editForm.akhirSewa}
                    onChange={(e) => setEditForm({ ...editForm, akhirSewa: e.target.value })}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Status Bayar</label>
                  <select value={editForm.statusBayar}
                    onChange={(e) => setEditForm({ ...editForm, statusBayar: e.target.value as Tenant["statusBayar"] })}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-semibold cursor-pointer">
                    <option value="Lunas">Lunas</option>
                    <option value="Jatuh Tempo">Jatuh Tempo</option>
                    <option value="Tertunggak">Tertunggak</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Verifikasi KTP</label>
                  <select value={editForm.ktpVerified ? "ya" : "tidak"}
                    onChange={(e) => setEditForm({ ...editForm, ktpVerified: e.target.value === "ya" })}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none cursor-pointer">
                    <option value="ya">Terverifikasi</option>
                    <option value="tidak">Belum Verifikasi</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setEditTarget(null)} className="skeu-button-secondary px-4 py-2 rounded-xl font-bold">Batal</button>
                <button type="submit" disabled={editLoading} className="skeu-button px-5 py-2 rounded-xl font-bold shadow-md disabled:opacity-60">
                  {editLoading ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
