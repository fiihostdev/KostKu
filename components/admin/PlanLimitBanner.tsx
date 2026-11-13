"use client";

import { usePlanLimits } from "@/lib/use-plan-limits";
import Link from "next/link";

/**
 * PlanLimitBanner — Tampilkan status paket + peringatan limit
 * Muncul di header semua halaman admin jika mendekati/melebihi limit
 */
export default function PlanLimitBanner() {
  const { paket, limits, usage, canAddRoom, roomsRemaining, suspended, expired, loading } = usePlanLimits();

  if (loading || !limits) return null;

  // Akun suspended — tampil merah bold
  if (suspended) {
    return (
      <div className="mx-4 sm:mx-6 lg:mx-8 mb-4">
        <div className="flex items-center gap-3 p-3 bg-red-50 border-2 border-red-300 rounded-2xl text-xs">
          <span className="material-symbols-outlined text-red-600 text-[20px] shrink-0">block</span>
          <div className="flex-1">
            <p className="font-black text-red-800">Akun Anda Disuspend</p>
            <p className="text-red-700 mt-0.5">Hubungi admin platform untuk informasi lebih lanjut.</p>
          </div>
        </div>
      </div>
    );
  }

  // Paket kadaluarsa
  if (expired) {
    return (
      <div className="mx-4 sm:mx-6 lg:mx-8 mb-4">
        <div className="flex items-center gap-3 p-3 bg-orange-50 border-2 border-orange-300 rounded-2xl text-xs">
          <span className="material-symbols-outlined text-orange-600 text-[20px] shrink-0">schedule</span>
          <div className="flex-1">
            <p className="font-black text-orange-800">Paket Kadaluarsa</p>
            <p className="text-orange-700 mt-0.5">Perpanjang langganan untuk mengakses semua fitur.</p>
          </div>
          <Link href="/admin/pengaturan" className="shrink-0 px-3 py-1.5 bg-orange-600 text-white rounded-xl text-[11px] font-bold hover:bg-orange-700 transition-colors">
            Perpanjang
          </Link>
        </div>
      </div>
    );
  }

  // Mendekati limit kamar (<=3 sisa atau sudah penuh)
  const isNearLimit = roomsRemaining <= 3;
  const isAtLimit = !canAddRoom;

  if (!isNearLimit && !isAtLimit) return null;

  return (
    <div className="mx-4 sm:mx-6 lg:mx-8 mb-4">
      <div className={`flex items-center gap-3 p-3 rounded-2xl text-xs border-2 ${
        isAtLimit
          ? "bg-red-50 border-red-300"
          : "bg-amber-50 border-amber-300"
      }`}>
        <span className={`material-symbols-outlined text-[20px] shrink-0 ${isAtLimit ? "text-red-600" : "text-amber-600"}`}>
          {isAtLimit ? "error" : "warning"}
        </span>
        <div className="flex-1">
          <p className={`font-black ${isAtLimit ? "text-red-800" : "text-amber-800"}`}>
            {isAtLimit
              ? `Batas Kamar Tercapai (${usage.rooms}/${limits.maxKamar})`
              : `Mendekati Batas Kamar — Tersisa ${roomsRemaining} slot`
            }
          </p>
          <p className={`mt-0.5 ${isAtLimit ? "text-red-700" : "text-amber-700"}`}>
            {`Paket ${paket}: maks ${limits.maxKamar} kamar. `}
            {isAtLimit ? "Upgrade untuk tambah kamar." : `Kamu bisa tambah ${roomsRemaining} kamar lagi.`}
          </p>
        </div>
        {isAtLimit && (
          <Link href="/admin/pengaturan" className="shrink-0 px-3 py-1.5 bg-red-600 text-white rounded-xl text-[11px] font-bold hover:bg-red-700 transition-colors">
            Upgrade
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * LockedFeatureCard — Card pengganti ketika fitur tidak tersedia di paket
 * Dipakai di tab pengaturan dll untuk menggantikan konten yang terkunci
 */
export function LockedFeatureCard({
  feature,
  description,
  minPlan = "Pro",
}: {
  feature: string;
  description?: string;
  minPlan?: "Pro" | "Enterprise";
}) {
  return (
    <div className="skeu-card p-8 sm:p-12 rounded-2xl text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-200 mb-4">
        <span className="material-symbols-outlined text-amber-500 text-[32px]">lock</span>
      </div>
      <h3 className="font-black text-base text-slate-900 mb-1">{feature} terkunci</h3>
      <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto leading-relaxed">
        {description || `Fitur ini hanya tersedia di Paket ${minPlan} ke atas.`}
      </p>
      <Link
        href="/admin/pengaturan"
        className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold shadow-md hover:bg-primary/90 transition-colors"
      >
        <span className="material-symbols-outlined text-[16px]">upgrade</span>
        Upgrade ke Paket {minPlan}
      </Link>
    </div>
  );
}

/**
 * FeatureGate — Wrapper untuk fitur yang butuh paket tertentu
 * Jika paket tidak mendukung → tampilkan overlay upgrade
 */
export function FeatureGate({
  children,
  feature,
  hasAccess,
  minPlan = "Pro",
}: {
  children: React.ReactNode;
  feature: string;
  hasAccess: boolean;
  minPlan?: "Pro" | "Enterprise";
}) {
  if (hasAccess) return <>{children}</>;

  return (
    <div className="relative">
      {/* Blur konten */}
      <div className="blur-sm pointer-events-none select-none opacity-50">
        {children}
      </div>
      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-2xl z-10">
        <div className="text-center p-4 space-y-2">
          <span className="material-symbols-outlined text-amber-500 text-[32px] block">lock</span>
          <p className="font-black text-sm text-slate-900">Fitur {feature}</p>
          <p className="text-[11px] text-slate-600">Tersedia di Paket {minPlan} ke atas</p>
          <Link
            href="/admin/pengaturan"
            className="inline-flex items-center gap-1 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-md hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">upgrade</span>
            Upgrade Paket
          </Link>
        </div>
      </div>
    </div>
  );
}
