"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: "dashboard" },
  { name: "Data Kamar", href: "/admin/kamar", icon: "meeting_room" },
  { name: "Data Penyewa", href: "/admin/penyewa", icon: "group" },
  { name: "Tagihan & Keuangan", href: "/admin/tagihan", icon: "receipt_long" },
  { name: "Laporan Keuangan", href: "/admin/laporan", icon: "trending_up" },
  { name: "Website Saya", href: "/admin/website", icon: "public" },
  { name: "Pengaturan & Midtrans", href: "/admin/pengaturan", icon: "settings" },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-72 lg:w-64 bg-surface-container-low border-r border-white/60 min-h-screen flex flex-col justify-between p-4 shrink-0 shadow-lg lg:shadow-sm transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="overflow-y-auto">
          {/* Logo & Close Button */}
          <div className="flex items-center justify-between px-3 py-3 mb-4 border-b border-white/60">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl skeu-card flex items-center justify-center text-primary shadow-sm">
                <span className="material-symbols-outlined text-[22px]">apartment</span>
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-primary block leading-none">KOSTKU</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Admin Portal</span>
              </div>
            </Link>
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-800"
              title="Tutup Menu"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? "skeu-button text-white shadow-md"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Superadmin Link */}
          <div className="my-5 border-t border-white/60 pt-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 block">
              Multi-Tenant View
            </span>
            <Link
              href="/superadmin/dashboard"
              onClick={onClose}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                pathname === "/superadmin/dashboard"
                  ? "skeu-button text-white shadow-md"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">domain</span>
              <span>Dashboard Multi-Kost</span>
            </Link>
          </div>
        </div>

        {/* Bottom Profile / Home */}
        <div className="pt-4 border-t border-white/60 shrink-0">
          <div className="skeu-card p-3 rounded-xl mb-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shadow-sm">
              US
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-slate-900 truncate">Pak Usman</p>
              <p className="text-[10px] text-emerald-600 font-bold truncate">Pro Plan (Aktif)</p>
            </div>
          </div>
          <Link
            href="/"
            className="flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 py-1 font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            <span>Kembali ke Beranda</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
