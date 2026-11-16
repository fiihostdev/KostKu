"use client";

import { useState } from "react";
import PhotoGallery from "./PhotoGallery";
import BookingFlow from "./BookingFlow";
import BookingButton from "./BookingButton";

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
  kostId: string;
  kostNama: string;
  appDomain: string;
  profileSubdomain: string;
  hasQris: boolean;
  waPhone: string;
}

export default function RoomFilter({
  rooms,
  kostId,
  kostNama,
  appDomain,
  profileSubdomain,
  hasQris,
  waPhone,
}: RoomFilterProps) {
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
      return a.nomor.localeCompare(b.nomor);
    });

  const availableCount = filtered.filter((r) => r.status === "Kosong").length;

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-8 p-4 skeu-card rounded-2xl">
        {/* Tipe */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-500">Tipe:</span>
          <div className="flex gap-1.5 flex-wrap">
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
            {[500000, 1000000, 1500000, 2000000, 3000000]
              .filter((p) => p <= maxHarga * 1.1 || maxHarga === 0)
              .map((p) => (
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
          {filtered.map((room) => {
            const isAvailable = room.status === "Kosong";
            const bookingText = `Halo pengelola ${kostNama}, saya tertarik booking kamar ${room.nomor} (${room.tipe}) seharga Rp ${room.harga.toLocaleString("id-ID")}/bulan dari ${profileSubdomain}.${appDomain}. Apakah masih tersedia?`;

            return (
              <div
                key={room.id}
                className={`skeu-card p-5 rounded-2xl flex flex-col justify-between transition-all ${
                  isAvailable ? "hover:-translate-y-1 border-2 border-emerald-500/20" : "opacity-75"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Lantai {room.lantai}</span>
                      <h4 className="text-lg font-black text-slate-900">{room.nomor}</h4>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isAvailable ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                    }`}>
                      {isAvailable ? "Tersedia" : "Terisi"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mb-2">
                    Tipe: <span className="font-bold text-slate-800">{room.tipe}</span>
                    {room.luas_m2 && <span className="ml-2 text-slate-400">· {room.luas_m2} m²</span>}
                  </div>
                  <div className="text-xl font-black text-primary mb-3">
                    Rp {room.harga.toLocaleString("id-ID")}
                    <span className="text-xs font-normal text-slate-500"> / bulan</span>
                  </div>

                  {/* Photo gallery */}
                  <PhotoGallery photos={room.foto_urls || []} alt={`Kamar ${room.nomor}`} />

                  {room.deskripsi && (
                    <p className="text-[11px] text-slate-500 mb-3 leading-relaxed line-clamp-2">{room.deskripsi}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {(room.fasilitas || []).map((f, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 bg-white/70 rounded-md text-slate-600 border border-slate-200">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-white/60">
                  {isAvailable && waPhone ? (
                    <div className="space-y-2">
                      <BookingFlow
                        kostId={kostId}
                        kostNama={kostNama}
                        kamarNomor={room.nomor}
                        kamarTipe={room.tipe}
                        kamarLantai={room.lantai}
                        harga={room.harga}
                        hasQris={hasQris}
                        waPhone={waPhone}
                      />
                      <BookingButton waPhone={waPhone} message={bookingText} />
                    </div>
                  ) : (
                    <button disabled className="bg-slate-200 text-slate-500 text-xs font-bold py-2.5 w-full rounded-xl cursor-not-allowed">
                      Kamar Telah Terisi
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
