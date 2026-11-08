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

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-surface-container-low border-r border-white/60 min-h-screen flex flex-col justify-between p-4 shrink-0 shadow-sm">
      <div>
        {/* Logo */}
        <div className="flex items-center gap-2 px-3 py-4 mb-6 border-b border-white/60">
          <span className="material-symbols-outlined text-primary text-[28px]">apartment</span>
          <div>
            <span className="text-xl font-bold tracking-tight text-primary block leading-none">KOSTKU</span>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Admin Portal</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
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

        {/* Separator */}
        <div className="my-6 border-t border-white/60 pt-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 block">
            Multi-Tenant
          </span>
          <Link
            href="/superadmin/dashboard"
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              pathname === "/superadmin/dashboard"
                ? "skeu-button text-white shadow-md"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">domain</span>
            <span>Semua Kost (Multi-Kost)</span>
          </Link>
        </div>
      </div>

      {/* Bottom Profile / Logout */}
      <div className="pt-4 border-t border-white/60">
        <div className="skeu-card p-3 rounded-xl mb-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shadow-sm">
            US
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-bold text-slate-900 truncate">Pak Usman</p>
            <p className="text-[10px] text-emerald-600 font-semibold">Pro Plan (Aktif)</p>
          </div>
        </div>
        <Link
          href="/"
          className="flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 py-1.5 font-medium transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">logout</span>
          <span>Kembali ke Beranda</span>
        </Link>
      </div>
    </aside>
  );
}

