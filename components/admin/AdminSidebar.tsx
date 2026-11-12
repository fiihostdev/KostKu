"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useKost } from "@/lib/store";

const menuItems = [
  { name: "Dashboard",           href: "/admin/dashboard",  icon: "dashboard" },
  { name: "Data Kamar",          href: "/admin/kamar",      icon: "meeting_room" },
  { name: "Data Penyewa",        href: "/admin/penyewa",    icon: "group" },
  { name: "Booking Masuk",       href: "/admin/booking",    icon: "how_to_reg" },
  { name: "Tagihan & Keuangan",  href: "/admin/tagihan",    icon: "receipt_long" },
  { name: "Laporan Keuangan",    href: "/admin/laporan",    icon: "trending_up" },
  { name: "Website Saya",        href: "/admin/website",    icon: "public" },
  { name: "Pengaturan",          href: "/admin/pengaturan", icon: "settings" },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname  = usePathname();
  const router    = useRouter();
  const { profile } = useKost();

  // Satu instance stabil — tidak buat baru setiap render
  const supabase = useMemo(() => createClient(), []);

  const [userName,     setUserName]     = useState("");
  const [userEmail,    setUserEmail]    = useState("");
  const [userInitials, setUserInitials] = useState("?");
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  /* ── Ambil data user dari Supabase Auth (bukan hardcoded) ── */
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const name =
        (user.user_metadata?.full_name as string) ||
        (user.user_metadata?.name as string) ||
        (user.user_metadata?.nama_lengkap as string) ||
        user.email?.split("@")[0] ||
        "Admin";

      setUserName(name);
      setUserEmail(user.email || "");
      setUserInitials(
        name
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      );

      const { data: kp } = await supabase
        .from("kost_profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      setIsSuperadmin(kp?.role === "superadmin");
    }

    loadUser();
  }, [supabase]); // supabase stabil via useMemo — hanya jalan sekali

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    // Tidak pakai router.refresh() — signOut sudah trigger auth state change
  };

  /* Nama kost aktif — tampil hanya jika sudah ada data nyata */
  const hasKost = profile.nama && profile.nama !== "Kost Saya" && profile.subdomain !== "kostsaya";

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-72 lg:w-64 bg-surface-container-low border-r border-white/60 min-h-screen flex flex-col justify-between p-4 shrink-0 shadow-lg lg:shadow-sm transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* ── Top: Logo + Nav ── */}
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

          {/* Nama kost aktif — hanya tampil jika data sudah dimuat dari Supabase */}
          {hasKost && (
            <div className="mx-1 mb-3 px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Kost Aktif</p>
              <p className="text-xs font-black text-primary truncate">{profile.nama}</p>
              <p className="text-[10px] text-slate-500 font-mono truncate">
                {profile.subdomain}.{process.env.NEXT_PUBLIC_APP_DOMAIN || "manajementkost.my.id"}
              </p>
            </div>
          )}

          {/* Navigation */}
          <nav className="space-y-0.5">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;              return (
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

          {/* Superadmin link — HANYA untuk superadmin */}
          {isSuperadmin && (
            <div className="mt-4 pt-4 border-t border-white/60">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 block">
                Platform Control
              </span>
              <Link
                href="/superadmin/dashboard"
                onClick={onClose}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  pathname?.startsWith("/superadmin")
                    ? "skeu-button text-white shadow-md"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
                <span>Superadmin</span>
              </Link>
            </div>
          )}
        </div>

        {/* ── Bottom: User card + actions ── */}
        <div className="pt-4 border-t border-white/60 shrink-0 space-y-2">

          {/* User card — nama & email dari auth nyata */}
          <div className="skeu-card p-3 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">
                {userName || "Memuat..."}
              </p>
              <p className="text-[10px] text-slate-400 truncate">{userEmail}</p>
              {profile.paket && profile.paket !== "Pro Plan" && (
                <p className="text-[9px] text-emerald-600 font-bold truncate">{profile.paket}</p>
              )}
            </div>
          </div>

          <div className="flex gap-1.5">
            <Link
              href="/"
              className="flex-1 flex items-center justify-center gap-1 text-xs text-slate-500 hover:text-slate-800 py-1.5 font-semibold transition-colors skeu-card rounded-xl"
            >
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
