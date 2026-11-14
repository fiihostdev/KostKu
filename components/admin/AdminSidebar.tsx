"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useKost } from "@/lib/store";

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "manajementkost.my.id";

const menuItems = [
  { name: "Dashboard",           href: "/admin/dashboard",  icon: "dashboard",      pro: false },
  { name: "Data Kamar",          href: "/admin/kamar",      icon: "meeting_room",   pro: false },
  { name: "Data Penyewa",        href: "/admin/penyewa",    icon: "group",          pro: false },
  { name: "Booking Masuk",       href: "/admin/booking",    icon: "how_to_reg",     pro: false },
  { name: "Tagihan & Keuangan",  href: "/admin/tagihan",    icon: "receipt_long",   pro: false },
  { name: "Laporan Keuangan",    href: "/admin/laporan",    icon: "trending_up",    pro: false },
  { name: "Cabang Kost",         href: "/admin/cabang",     icon: "add_home_work",  pro: true  },
  { name: "Website Saya",        href: "/admin/website",    icon: "public",         pro: false },
  { name: "Pengaturan",          href: "/admin/pengaturan", icon: "settings",       pro: false },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname  = usePathname();
  const router    = useRouter();
  const { profile, branches, activeBranchId, activeBranch, setActiveBranch } = useKost();

  const supabase = useMemo(() => createClient(), []);

  const [userName,     setUserName]     = useState("");
  const [userEmail,    setUserEmail]    = useState("");
  const [userInitials, setUserInitials] = useState("?");
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [showBranchPicker, setShowBranchPicker] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const name =
        (user.user_metadata?.full_name as string) ||
        (user.user_metadata?.name as string) ||
        user.email?.split("@")[0] || "Admin";
      setUserName(name);
      setUserEmail(user.email || "");
      setUserInitials(name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2));
      const { data: kp } = await supabase.from("kost_profiles").select("role").eq("user_id", user.id).single();
      setIsSuperadmin(kp?.role === "superadmin");
    }
    loadUser();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const hasKost = profile.nama && profile.nama !== "Kost Saya" && profile.subdomain !== "kostsaya";
  const hasBranches = branches.length > 0;

  // Nama yang ditampilkan di panel kost aktif
  const displayNama = activeBranch ? activeBranch.nama : profile.nama;
  const displaySub  = activeBranch ? activeBranch.subdomain : profile.subdomain;

  return (
    <>
      {isOpen && <div onClick={onClose} className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" />}

      <aside className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-72 lg:w-64 bg-surface-container-low border-r border-white/60 min-h-screen flex flex-col justify-between p-4 shrink-0 shadow-lg lg:shadow-sm transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>

        <div className="overflow-y-auto flex-1 min-h-0">

          {/* Logo */}
          <div className="flex items-center justify-between px-3 py-3 mb-3 border-b border-white/60">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl skeu-card flex items-center justify-center text-primary shadow-sm">
                <span className="material-symbols-outlined text-[22px]">apartment</span>
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-primary block leading-none">KOSTKU</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Admin Portal</span>
              </div>
            </Link>
            <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg text-slate-500">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* ── Branch / Kost Switcher ── */}
          {hasKost && (
            <div className="mx-1 mb-3">
              {/* Active property card */}
              <button
                onClick={() => hasBranches && setShowBranchPicker(!showBranchPicker)}
                className={`w-full px-3 py-2.5 rounded-xl text-left transition-all ${
                  hasBranches
                    ? "bg-primary/5 border border-primary/10 hover:bg-primary/10 cursor-pointer"
                    : "bg-primary/5 border border-primary/10 cursor-default"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeBranch ? "bg-blue-500" : "bg-emerald-500"}`}></span>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        {activeBranch ? "Cabang Aktif" : "Kost Utama"}
                      </p>
                    </div>
                    <p className="text-xs font-black text-primary truncate">{displayNama}</p>
                    <p className="text-[10px] text-slate-500 font-mono truncate">{displaySub}.{APP_DOMAIN}</p>
                  </div>
                  {hasBranches && (
                    <span className="material-symbols-outlined text-[18px] text-slate-400 shrink-0">
                      {showBranchPicker ? "expand_less" : "expand_more"}
                    </span>
                  )}
                </div>
              </button>

              {/* Branch picker dropdown */}
              {hasBranches && showBranchPicker && (
                <div className="mt-1 rounded-xl skeu-card shadow-lg overflow-hidden">
                  <div className="px-3 py-2 border-b border-white/60">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pilih Properti</p>
                  </div>

                  {/* Kost Utama option */}
                  <button
                    onClick={() => { setActiveBranch(null); setShowBranchPicker(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-primary/5 transition-colors ${!activeBranchId ? "bg-primary/10" : ""}`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${!activeBranchId ? "bg-primary text-white" : "bg-slate-200 text-slate-600"}`}>
                      <span className="material-symbols-outlined text-[14px]">home_work</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-900 truncate">{profile.nama}</p>
                      <p className="text-[9px] text-slate-500 font-mono truncate">{profile.subdomain}.{APP_DOMAIN}</p>
                    </div>
                    {!activeBranchId && <span className="material-symbols-outlined text-primary text-[14px] ml-auto shrink-0">check</span>}
                  </button>

                  {/* Branch options */}
                  {branches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => { setActiveBranch(b.id); setShowBranchPicker(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-blue-50 transition-colors border-t border-white/40 ${activeBranchId === b.id ? "bg-blue-50" : ""}`}
                    >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 overflow-hidden ${activeBranchId === b.id ? "bg-blue-500 text-white" : "bg-slate-200 text-slate-600"}`}>
                        {b.logo_url
                          ? <img src={b.logo_url} alt={b.nama} className="w-full h-full object-contain" />
                          : <span className="material-symbols-outlined text-[14px]">apartment</span>
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-900 truncate">{b.nama}</p>
                        <p className="text-[9px] text-slate-500 font-mono truncate">{b.subdomain}.{APP_DOMAIN}</p>
                      </div>
                      {activeBranchId === b.id && <span className="material-symbols-outlined text-blue-600 text-[14px] ml-auto shrink-0">check</span>}
                    </button>
                  ))}

                  {/* Link ke kelola cabang */}
                  <div className="border-t border-white/60">
                    <Link
                      href="/admin/cabang"
                      onClick={() => { setShowBranchPicker(false); onClose(); }}
                      className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-primary hover:bg-primary/5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">settings</span>
                      Kelola Cabang
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <nav className="space-y-0.5">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive ? "skeu-button text-white shadow-md" : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  <span className="flex-1">{item.name}</span>
                  {item.pro && (
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black shrink-0 ${isActive ? "bg-white/30 text-white" : "bg-amber-100 text-amber-700"}`}>
                      PRO
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Superadmin link */}
          {isSuperadmin && (
            <div className="mt-4 pt-4 border-t border-white/60">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 block">Platform Control</span>
              <Link
                href="/superadmin/dashboard"
                onClick={onClose}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  pathname?.startsWith("/superadmin") ? "skeu-button text-white shadow-md" : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
                <span>Superadmin</span>
              </Link>
            </div>
          )}
        </div>

        {/* Bottom: User card */}
        <div className="pt-4 border-t border-white/60 shrink-0 space-y-2">
          <div className="skeu-card p-3 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{userName || "Memuat..."}</p>
              <p className="text-[10px] text-slate-400 truncate">{userEmail}</p>
              {profile.paket && (
                <p className="text-[9px] text-emerald-600 font-bold truncate capitalize">
                  {profile.paket === "starter" ? "Paket Starter" : profile.paket === "pro" ? "Paket Pro" : profile.paket === "enterprise" ? "Paket Enterprise" : profile.paket}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-1.5">
            <Link href="/" className="flex-1 flex items-center justify-center gap-1 text-xs text-slate-500 hover:text-slate-800 py-1.5 font-semibold transition-colors skeu-card rounded-xl">
              <span className="material-symbols-outlined text-[14px]">home</span>
              <span>Beranda</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-1 text-xs text-red-500 hover:text-red-700 py-1.5 font-semibold transition-colors skeu-card rounded-xl"
            >
              <span className="material-symbols-outlined text-[14px]">logout</span>
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
