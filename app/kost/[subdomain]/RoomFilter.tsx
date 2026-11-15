"use client";

import { useState } from "react";

interface Room {
  id: string;
  nomor: string;
  lantai: number;
  tipe: string;
  harga: number;
  status: string;
  fasilitas: string[];
  foto_urls?: string[];
  deskripsi?: string;
  luas_m2?: number;
}

interface RoomFilterProps {
  rooms: Room[];
  renderRoom: (room: Room) => React.ReactNode;
}

export default function RoomFilter({ rooms, renderRoom }: RoomFilterProps) {
  const [filterTipe,     setFilterTipe]     = useState("Semua");
  const [filterStatus,   setFilterStatus]   = useState("Semua");
  const [filterHargaMax, setFilterHargaMax] = useState("");
  const [sortBy,         setSortBy]         = useState("nomor");

  const tipes   = ["Semua", ...Array.from(new Set(rooms.map((r) => r.tipe)))];
  const maxHarga = Math.max(...rooms.map((r) => r.harga), 0);

  const filtered = rooms
    .filter((r) => {
      if (filterTipe   !== "Semua" && r.tipe   !== filterTipe)   return false;
      if (filterStatus !== "Semua" && r.status !== filterStatus) return false;
      if (filterHargaMax && r.harga > Number(filterHargaMax))   return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "harga-asc")  return a.harga - b.harga;
      if (sortBy === "harga-desc") return b.harga - a.harga;
      if (sortBy === "lantai")     return a.lantai - b.lantai;
      return a.nomor.localeCompare(b.nomor); // default
    });

  const availableCount = filtered.filter((r) => r.status === "Kosong").length;

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-8 p-4 skeu-card rounded-2xl">
        {/* Tipe */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500">Tipe:</span>
          <div className="flex gap-1.5">
            {tipes.map((t) => (
              <button
                key={t}
                onClick={() => setFilterTipe(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterTipe === t ? "skeu-button text-white shadow-sm" : "skeu-card text-slate-600"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500">Status:</span>
          <div className="flex gap-1.5">
            {["Semua", "Kosong", "Terisi"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterStatus === s ? "skeu-button text-white shadow-sm" : "skeu-card text-slate-600"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Harga max */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500">Maks. Harga:</span>
          <select
            value={filterHargaMax}
            onChange={(e) => setFilterHargaMax(e.target.value)}
            className="text-xs py-1.5 px-2 rounded-xl skeu-inset text-slate-800 outline-none cursor-pointer font-semibold"
          >
            <option value="">Semua Harga</option>
            {[500000, 1000000, 1500000, 2000000, 3000000].filter((p) => p <= maxHarga * 1.1 || maxHarga === 0).map((p) => (
              <option key={p} value={p}>≤ Rp {(p / 1000000).toFixed(1)} Jt</option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[11px] font-bold text-slate-500">Urut:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs py-1.5 px-2 rounded-xl skeu-inset text-slate-800 outline-none cursor-pointer font-semibold"
          >
            <option value="nomor">Nomor</option>
            <option value="harga-asc">Harga ↑</option>
            <option value="harga-desc">Harga ↓</option>
            <option value="lantai">Lantai</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs text-slate-500">
          {filtered.length} kamar ditemukan
          {availableCount > 0 && (
            <span className="ml-2 font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              {availableCount} tersedia
            </span>
          )}
        </p>
        {(filterTipe !== "Semua" || filterStatus !== "Semua" || filterHargaMax) && (
          <button
            onClick={() => { setFilterTipe("Semua"); setFilterStatus("Semua"); setFilterHargaMax(""); }}
            className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
            Reset filter
          </button>
        )}
      </div>

      {/* Room grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 skeu-card rounded-2xl">
          <span className="material-symbols-outlined text-slate-300 text-[52px] block mb-3">search_off</span>
          <p className="text-sm font-bold text-slate-500">Tidak ada kamar yang sesuai filter.</p>
          <button
            onClick={() => { setFilterTipe("Semua"); setFilterStatus("Semua"); setFilterHargaMax(""); }}
            className="text-xs text-primary font-bold mt-2 hover:underline"
          >
            Reset filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((room) => (
            <div key={room.id}>{renderRoom(room)}</div>
          ))}
        </div>
      )}
    </div>
  );
}
