"use client";

import { useState } from "react";
import { useKost } from "@/lib/store";

export default function DataKamarPage() {
  const { rooms, addRoom, deleteRoom, profile, loading } = useKost();
  const [filter, setFilter] = useState<string>("Semua");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRoom, setNewRoom] = useState({
    nomor: "",
    lantai: 1,
    tipe: "Standard" as "Standard" | "Deluxe" | "VIP",
    harga: 1500000,
    fasilitas: "AC, WiFi, Kasur",
  });

  const filteredRooms = rooms.filter((r) => {
    if (filter === "Semua") return true;
    return r.status === filter;
  });

  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    addRoom({
      nomor: newRoom.nomor,
      lantai: Number(newRoom.lantai),
      tipe: newRoom.tipe,
      harga: Number(newRoom.harga),
      status: "Kosong",
      fasilitas: newRoom.fasilitas.split(",").map((s) => s.trim()),
    });
    setShowAddModal(false);
    setNewRoom({ nomor: "", lantai: 1, tipe: "Standard", harga: 1500000, fasilitas: "AC, WiFi, Kasur" });
  };

  const terisiCount = rooms.filter((r) => r.status === "Terisi").length;
  const kosongCount = rooms.filter((r) => r.status === "Kosong").length;
  const perawatanCount = rooms.filter((r) => r.status === "Perawatan").length;
  const okupansi = rooms.length > 0 ? Math.round((terisiCount / rooms.length) * 100) : 0;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-full">
      {loading && (
        <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
          <span className="material-symbols-outlined text-[16px] animate-spin text-primary">sync</span>
          <span>Memuat data kamar dari database...</span>
        </div>
      )}
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-primary uppercase">Modul Operasional</span>
            <span className="text-slate-400">•</span>
            <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold truncate">{profile.nama}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Manajemen Data Kamar</h1>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="skeu-button text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md w-full sm:w-auto"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Tambah Kamar Baru</span>
        </button>
      </div>

      {/* Bento Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
        <div className="skeu-card p-3 sm:p-4 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase truncate">Total Unit</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{rooms.length} <span className="text-xs font-normal text-slate-500">Unit</span></div>
        </div>
        <div className="skeu-card p-3 sm:p-4 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs text-emerald-600 font-semibold uppercase truncate">Terisi</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">{terisiCount} <span className="text-xs font-normal text-slate-500">Unit</span></div>
        </div>
        <div className="skeu-card p-3 sm:p-4 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs text-blue-600 font-semibold uppercase truncate">Tersedia</span>
          <div className="text-xl sm:text-2xl font-black text-blue-700 mt-1">{kosongCount} <span className="text-xs font-normal text-slate-500">Unit</span></div>
        </div>
        <div className="skeu-card p-3 sm:p-4 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs text-amber-600 font-semibold uppercase truncate">Perawatan</span>
          <div className="text-xl sm:text-2xl font-black text-amber-700 mt-1">{perawatanCount} <span className="text-xs font-normal text-slate-500">Unit</span></div>
        </div>
        <div className="skeu-card p-3 sm:p-4 rounded-xl flex flex-col justify-between col-span-2 sm:col-span-1">
          <span className="text-[10px] sm:text-xs text-primary font-semibold uppercase truncate">Okupansi</span>
          <div className="text-xl sm:text-2xl font-black text-primary mt-1">{okupansi}%</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/60">
        {["Semua", "Terisi", "Kosong", "Perawatan"].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              filter === cat
                ? "skeu-button text-white shadow-sm"
                : "skeu-card text-slate-600 hover:text-slate-900"
            }`}
          >
            {cat} ({cat === "Semua" ? rooms.length : rooms.filter(r => r.status === cat).length})
          </button>
        ))}
      </div>

      {/* Room Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {filteredRooms.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400 text-sm">
            Tidak ada kamar dengan filter ini.
          </div>
        ) : filteredRooms.map((room) => (
          <div key={room.id} className="skeu-card p-4 sm:p-5 rounded-2xl flex flex-col justify-between transition hover:-translate-y-0.5">
            <div>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">Lantai {room.lantai}</span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">{room.nomor}</h3>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  room.status === "Terisi"
                    ? "bg-emerald-100 text-emerald-800"
                    : room.status === "Kosong"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-amber-100 text-amber-800"
                }`}>
                  {room.status}
                </span>
              </div>

              <div className="text-xs text-slate-500 mb-1.5">
                Tipe: <span className="font-bold text-slate-800">{room.tipe}</span>
              </div>
              <div className="text-base font-black text-primary mb-3">
                Rp {room.harga.toLocaleString("id-ID")}{" "}
                <span className="text-[10px] text-slate-400 font-normal">/ bln</span>
              </div>

              {room.penyewa ? (
                <div className="skeu-inset p-2.5 rounded-xl mb-3 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-slate-500 shrink-0">person</span>
                  <span className="font-bold text-slate-800 truncate">{room.penyewa}</span>
                </div>
              ) : (
                <div className="skeu-inset p-2.5 rounded-xl mb-3 text-xs text-slate-400 italic">
                  Belum ada penghuni
                </div>
              )}

              {/* Fasilitas Pills */}
              <div className="flex flex-wrap gap-1 mb-3">
                {room.fasilitas.map((f, i) => (
                  <span key={i} className="text-[9px] sm:text-[10px] px-2 py-0.5 bg-white/70 rounded-md text-slate-600 border border-slate-200">
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-white/60 flex items-center justify-between text-xs">
              <button
                onClick={() => {
                  if (confirm(`Hapus kamar ${room.nomor}? Tindakan ini tidak dapat dibatalkan.`)) {
                    deleteRoom(room.id);
                  }
                }}
                className="text-red-500 hover:text-red-700 font-semibold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">delete</span>
                Hapus
              </button>
              <span className="font-mono text-slate-400 text-[10px]">
                ID: {room.nomor}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Tambah Kamar */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="skeu-card p-5 sm:p-6 rounded-2xl max-w-md w-full relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/60">
              <h3 className="font-black text-base text-slate-900">Tambah Kamar Baru</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddRoom} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nomor Kamar</label>
                <input
                  required
                  type="text"
                  placeholder="Contoh: A-05"
                  value={newRoom.nomor}
                  onChange={(e) => setNewRoom({ ...newRoom, nomor: e.target.value })}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Lantai</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newRoom.lantai}
                    onChange={(e) => setNewRoom({ ...newRoom, lantai: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tipe Kamar</label>
                  <select
                    value={newRoom.tipe}
                    onChange={(e) => setNewRoom({ ...newRoom, tipe: e.target.value as "Standard" | "Deluxe" | "VIP" })}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-semibold cursor-pointer"
                  >
                    <option value="Standard">Standard</option>
                    <option value="Deluxe">Deluxe</option>
                    <option value="VIP">VIP</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Harga Sewa / Bulan (Rp)</label>
                <input
                  type="number"
                  step="50000"
                  value={newRoom.harga}
                  onChange={(e) => setNewRoom({ ...newRoom, harga: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Fasilitas (Pisahkan koma)</label>
                <input
                  type="text"
                  value={newRoom.fasilitas}
                  onChange={(e) => setNewRoom({ ...newRoom, fasilitas: e.target.value })}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="skeu-button-secondary px-4 py-2 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="skeu-button px-5 py-2 rounded-xl font-bold shadow-md"
                >
                  Simpan Kamar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
