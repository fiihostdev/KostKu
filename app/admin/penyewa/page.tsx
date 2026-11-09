"use client";

import { useState } from "react";
import { useKost } from "@/lib/store";

export default function DataPenyewaPage() {
  const { tenants, addTenant, rooms, loading } = useKost();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Semua");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTenant, setNewTenant] = useState({
    nama: "",
    phone: "",
    kamar: "",
    mulaiSewa: "",
    akhirSewa: "",
  });

  const availableRooms = rooms.filter((r) => r.status === "Kosong");

  const filteredTenants = tenants.filter((t) => {
    const matchSearch =
      t.nama.toLowerCase().includes(search.toLowerCase()) ||
      t.kamar.toLowerCase().includes(search.toLowerCase()) ||
      t.phone.includes(search);
    const matchFilter = filter === "Semua" || t.statusBayar === filter;
    return matchSearch && matchFilter;
  });

  const handleAddTenant = (e: React.FormEvent) => {
    e.preventDefault();
    addTenant({
      nama: newTenant.nama,
      phone: newTenant.phone,
      kamar: newTenant.kamar ? `Kamar ${newTenant.kamar}` : "Kamar Baru",
      mulaiSewa: newTenant.mulaiSewa,
      akhirSewa: newTenant.akhirSewa,
      statusBayar: "Lunas",
      ktpVerified: false,
    });
    setShowAddModal(false);
    setNewTenant({ nama: "", phone: "", kamar: "", mulaiSewa: "", akhirSewa: "" });
  };

  const lunasCount = tenants.filter((t) => t.statusBayar === "Lunas").length;
  const jatuhTempoCount = tenants.filter((t) => t.statusBayar === "Jatuh Tempo").length;
  const tertunggakCount = tenants.filter((t) => t.statusBayar === "Tertunggak").length;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-full">
      {loading && (
        <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
          <span className="material-symbols-outlined text-[16px] animate-spin text-primary">sync</span>
          <span>Memuat data penyewa dari database...</span>
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
          <span>Tambah Penyewa</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="skeu-card p-3 sm:p-4 rounded-xl">
          <span className="text-[10px] text-slate-500 font-semibold uppercase">Total Penyewa</span>
          <div className="text-xl font-black text-slate-900 mt-1">{tenants.length}</div>
        </div>
        <div className="skeu-card p-3 sm:p-4 rounded-xl">
          <span className="text-[10px] text-emerald-600 font-semibold uppercase">Lunas</span>
          <div className="text-xl font-black text-emerald-700 mt-1">{lunasCount}</div>
        </div>
        <div className="skeu-card p-3 sm:p-4 rounded-xl">
          <span className="text-[10px] text-amber-600 font-semibold uppercase">Jatuh Tempo</span>
          <div className="text-xl font-black text-amber-700 mt-1">{jatuhTempoCount}</div>
        </div>
        <div className="skeu-card p-3 sm:p-4 rounded-xl">
          <span className="text-[10px] text-red-600 font-semibold uppercase">Tertunggak</span>
          <div className="text-xl font-black text-red-700 mt-1">{tertunggakCount}</div>
        </div>
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
          <div key={t.id} className="skeu-card p-4 sm:p-5 rounded-2xl flex flex-col gap-3 transition hover:-translate-y-0.5">
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
                t.statusBayar === "Lunas" ? "bg-emerald-100 text-emerald-800" :
                t.statusBayar === "Jatuh Tempo" ? "bg-amber-100 text-amber-800" :
                "bg-red-100 text-red-800"
              }`}>
                {t.statusBayar}
              </span>
            </div>

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

            <div className="flex items-center gap-2 pt-2 border-t border-white/60">
              <a
                href={`https://wa.me/${t.phone.replace(/[^0-9]/g, "").replace(/^0/, "62")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 skeu-button-secondary text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 text-emerald-800"
              >
                <span className="material-symbols-outlined text-[15px] text-emerald-600">chat</span>
                WhatsApp
              </a>
              <div className={`flex items-center gap-1 text-[10px] font-bold ${t.ktpVerified ? "text-emerald-600" : "text-amber-600"}`}>
                <span className="material-symbols-outlined text-[14px]">{t.ktpVerified ? "verified" : "pending"}</span>
                <span>{t.ktpVerified ? "KTP Verified" : "KTP Pending"}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Tambah Penyewa */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="skeu-card p-5 sm:p-6 rounded-2xl max-w-md w-full relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/60">
              <h3 className="font-black text-base text-slate-900">Tambah Penyewa Baru</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddTenant} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Lengkap</label>
                <input
                  required
                  type="text"
                  placeholder="Nama penyewa"
                  value={newTenant.nama}
                  onChange={(e) => setNewTenant({ ...newTenant, nama: e.target.value })}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">No. WhatsApp</label>
                <input
                  required
                  type="tel"
                  placeholder="081234567890"
                  value={newTenant.phone}
                  onChange={(e) => setNewTenant({ ...newTenant, phone: e.target.value })}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Pilih Kamar</label>
                {availableRooms.length > 0 ? (
                  <select
                    required
                    value={newTenant.kamar}
                    onChange={(e) => setNewTenant({ ...newTenant, kamar: e.target.value })}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-semibold cursor-pointer"
                  >
                    <option value="">-- Pilih Kamar Tersedia --</option>
                    {availableRooms.map((r) => (
                      <option key={r.id} value={r.nomor}>
                        {r.nomor} - {r.tipe} (Rp {r.harga.toLocaleString("id-ID")}/bln)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2.5 rounded-xl skeu-inset text-amber-700 text-xs font-bold">
                    ⚠️ Semua kamar terisi. Silakan tambah kamar kosong baru terlebih dahulu.
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal Mulai</label>
                  <input
                    required
                    type="date"
                    value={newTenant.mulaiSewa}
                    onChange={(e) => setNewTenant({ ...newTenant, mulaiSewa: e.target.value })}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal Akhir</label>
                  <input
                    required
                    type="date"
                    value={newTenant.akhirSewa}
                    onChange={(e) => setNewTenant({ ...newTenant, akhirSewa: e.target.value })}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="skeu-button-secondary px-4 py-2 rounded-xl font-bold">
                  Batal
                </button>
                <button type="submit" className="skeu-button px-5 py-2 rounded-xl font-bold shadow-md" disabled={availableRooms.length === 0}>
                  Simpan Penyewa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
