"use client";

import Link from "next/link";
import { useState } from "react";

export default function AdminHeader() {
  const [currentKost, setCurrentKost] = useState("Kost Harmoni Residence (Jakarta)");

  return (
    <header className="h-16 bg-surface/90 backdrop-blur-md border-b border-white/60 px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-4">
        {/* Kost Switcher */}
        <div className="flex items-center gap-2 skeu-card px-3 py-1.5 rounded-xl border border-white/80">
          <span className="material-symbols-outlined text-primary text-[18px]">home_work</span>
          <select
            value={currentKost}
            onChange={(e) => setCurrentKost(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer pr-2"
          >
            <option value="Kost Harmoni Residence (Jakarta)">Kost Harmoni Residence (Jakarta)</option>
            <option value="Kost Melati Indah (Bandung)">Kost Melati Indah (Bandung)</option>
            <option value="Kost Graha Mahasiswa (Yogyakarta)">Kost Graha Mahasiswa (Yogyakarta)</option>
          </select>
        </div>

        <span className="text-[11px] text-emerald-700 bg-emerald-100 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 hidden sm:inline-block">
          Okupansi: 88% (22/25 Kamar)
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Visit Public Web */}
        <Link
          href="/admin/website"
          className="skeu-button-secondary text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 hidden md:flex"
        >
          <span className="material-symbols-outlined text-[16px] text-primary">public</span>
          <span>Website Kost Saya</span>
        </Link>

        {/* Notification Bell */}
        <button
          title="Notifikasi"
          className="w-9 h-9 rounded-xl skeu-card flex items-center justify-center text-slate-600 hover:text-slate-950 relative"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="w-2 h-2 rounded-full bg-red-500 absolute top-2 right-2"></span>
        </button>

        {/* Quick Add Button */}
        <Link
          href="/admin/kamar"
          className="skeu-button text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1 shadow-sm"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>Kamar Baru</span>
        </Link>
      </div>
    </header>
  );
}

