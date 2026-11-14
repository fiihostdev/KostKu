"use client";

import Link from "next/link";
import { useKost } from "@/lib/store";

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "manajementkost.my.id";

interface AdminHeaderProps {
  onToggleSidebar: () => void;
}

export default function AdminHeader({ onToggleSidebar }: AdminHeaderProps) {
  const { stats, loading, activeBranch, activeNama, activeSubdomain, activeBranchId } = useKost();

  return (
    <header className="h-16 bg-surface/90 backdrop-blur-md border-b border-white/60 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden w-9 h-9 rounded-xl skeu-card flex items-center justify-center text-slate-700 hover:text-slate-900 shrink-0"
          title="Buka Menu"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>

        {/* Active property badge */}
        <div className="flex items-center gap-1.5 sm:gap-2 skeu-card px-2.5 sm:px-3 py-1.5 rounded-xl border border-white/80 max-w-[200px] sm:max-w-xs">
          {activeBranchId ? (
            <span className="material-symbols-outlined text-blue-500 text-[18px] shrink-0">apartment</span>
          ) : (
            <span className="material-symbols-outlined text-primary text-[18px] shrink-0">home_work</span>
          )}
          <div className="min-w-0">
            <span className="text-xs font-bold text-slate-800 truncate block">
              {loading ? "Memuat..." : (activeNama || "Belum ada kost")}
            </span>
            {activeBranchId && (
              <span className="text-[9px] text-blue-600 font-bold uppercase tracking-wider">Cabang</span>
            )}
          </div>
        </div>

        {/* Okupansi badge */}
        {!loading && stats.totalKamar > 0 && (
          <span className="text-[10px] sm:text-[11px] text-emerald-800 bg-emerald-100 font-bold px-2 py-0.5 rounded-full border border-emerald-200 hidden md:inline-block shrink-0">
            Okupansi {stats.okupansi}% ({stats.kamarTerisi}/{stats.totalKamar})
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Website publik — link ke cabang aktif atau kost utama */}
        {activeSubdomain && (
          <a
            href={`https://${activeSubdomain}.${APP_DOMAIN}`}
            target="_blank"
            rel="noopener noreferrer"
            className="skeu-button-secondary text-xs font-bold px-3 py-1.5 rounded-xl hidden sm:flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">open_in_new</span>
            <span>Web Publik</span>
          </a>
        )}

        {/* Notifikasi bell */}
        <button
          title={stats.tagihanTertunda > 0 ? `Tagihan tertunda Rp ${stats.tagihanTertunda.toLocaleString("id-ID")}` : "Tidak ada notifikasi"}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl skeu-card flex items-center justify-center text-slate-600 hover:text-slate-950 relative"
        >
          <span className="material-symbols-outlined text-[18px] sm:text-[20px]">notifications</span>
          {stats.tagihanTertunda > 0 && (
            <span className="w-2 h-2 rounded-full bg-red-500 absolute top-1.5 right-1.5"></span>
          )}
        </button>

        {/* Tambah kamar */}
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
