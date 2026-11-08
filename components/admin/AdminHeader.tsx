"use client";

import Link from "next/link";
import { useState } from "react";

interface AdminHeaderProps {
  onToggleSidebar: () => void;
}

export default function AdminHeader({ onToggleSidebar }: AdminHeaderProps) {
  const [currentKost, setCurrentKost] = useState("Kost Harmoni Residence");

  return (
    <header className="h-16 bg-surface/90 backdrop-blur-md border-b border-white/60 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden w-9 h-9 rounded-xl skeu-card flex items-center justify-center text-slate-700 hover:text-slate-900 shrink-0"
          title="Buka Menu"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>

        {/* Kost Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2 skeu-card px-2.5 sm:px-3 py-1.5 rounded-xl border border-white/80 max-w-[200px] sm:max-w-none">
          <span className="material-symbols-outlined text-primary text-[18px] shrink-0">home_work</span>
          <select
            value={currentKost}
            onChange={(e) => setCurrentKost(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer truncate max-w-[140px] sm:max-w-none"
          >
            <option value="Kost Harmoni Residence">Kost Harmoni Residence</option>
            <option value="Kost Melati Indah (Bandung)">Kost Melati Indah (Bandung)</option>
            <option value="Kost Graha Mahasiswa (Yogya)">Kost Graha Mahasiswa (Yogya)</option>
          </select>
        </div>

        <span className="text-[10px] sm:text-[11px] text-emerald-800 bg-emerald-100 font-bold px-2 py-0.5 rounded-full border border-emerald-200 hidden md:inline-block shrink-0">
          Okupansi 91.6% (22/24)
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Visit Public Web */}
        <Link
          href="/admin/website"
          className="skeu-button-secondary text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 hidden sm:flex"
        >
          <span className="material-symbols-outlined text-[16px] text-primary">public</span>
          <span>Web Publik</span>
        </Link>

        {/* Notification Bell */}
        <button
          title="Notifikasi"
          onClick={() => alert("Ada 2 tagihan sewa jatuh tempo besok.")}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl skeu-card flex items-center justify-center text-slate-600 hover:text-slate-950 relative"
        >
          <span className="material-symbols-outlined text-[18px] sm:text-[20px]">notifications</span>
          <span className="w-2 h-2 rounded-full bg-red-500 absolute top-1.5 right-1.5"></span>
        </button>

        {/* Quick Add Button */}
        <Link
          href="/admin/kamar"
          className="skeu-button text-xs font-bold px-3 sm:px-3.5 py-1.5 rounded-xl flex items-center gap-1 shadow-sm"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span className="hidden sm:inline">Kamar Baru</span>
        </Link>
      </div>
    </header>
  );
}
