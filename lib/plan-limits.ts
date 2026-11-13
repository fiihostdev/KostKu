/**
 * KOSTKU Plan Limits — Validasi paket secara terpusat
 *
 * Setiap fitur di-enforce di:
 * 1. API routes (server-side, tidak bisa di-bypass)
 * 2. UI (disable tombol + tampilkan pesan upgrade)
 *
 * Paket:
 * - Starter:    15 kamar, 1 cabang, fitur dasar
 * - Pro:        50 kamar, 3 cabang, tagihan WA, payment gateway
 * - Enterprise: unlimited, multi-user, domain custom
 */

export interface PlanLimits {
  maxKamar:          number;    // max kamar yang boleh ditambah
  maxCabang:         number;    // max properti/cabang
  hasWaNotifikasi:   boolean;   // kirim tagihan via WA otomatis
  hasPaymentGateway: boolean;   // Midtrans, Tripay, Xendit
  hasQrisDinamis:    boolean;   // upload QR + inject nominal
  hasLaporanExpor:   boolean;   // export CSV/Excel laporan
  hasBookingOnline:  boolean;   // form booking dari halaman publik
  hasFotoKamar:      boolean;   // upload foto kamar
  hasMultiUser:      boolean;   // tambah staf (enterprise only)
  hasDomainCustom:   boolean;   // domain .com/.id sendiri
  maxBroadcastPerHari: number;  // max broadcast WA per hari
}

// ── Definisi batas per paket ─────────────────────────────────────────────────
export const PLAN_LIMITS: Record<string, PlanLimits> = {
  // Paket Starter
  "starter": {
    maxKamar:            15,
    maxCabang:           1,
    hasWaNotifikasi:     false,
    hasPaymentGateway:   false,
    hasQrisDinamis:      false,
    hasLaporanExpor:     false,
    hasBookingOnline:    true,
    hasFotoKamar:        false,
    hasMultiUser:        false,
    hasDomainCustom:     false,
    maxBroadcastPerHari: 0,
  },
  "paket starter": {
    maxKamar:            15,
    maxCabang:           1,
    hasWaNotifikasi:     false,
    hasPaymentGateway:   false,
    hasQrisDinamis:      false,
    hasLaporanExpor:     false,
    hasBookingOnline:    true,
    hasFotoKamar:        false,
    hasMultiUser:        false,
    hasDomainCustom:     false,
    maxBroadcastPerHari: 0,
  },
  // Paket Pro
  "pro": {
    maxKamar:            50,
    maxCabang:           3,
    hasWaNotifikasi:     true,
    hasPaymentGateway:   true,
    hasQrisDinamis:      true,
    hasLaporanExpor:     true,
    hasBookingOnline:    true,
    hasFotoKamar:        true,
    hasMultiUser:        false,
    hasDomainCustom:     false,
    maxBroadcastPerHari: 100,
  },
  "paket pro": {
    maxKamar:            50,
    maxCabang:           3,
    hasWaNotifikasi:     true,
    hasPaymentGateway:   true,
    hasQrisDinamis:      true,
    hasLaporanExpor:     true,
    hasBookingOnline:    true,
    hasFotoKamar:        true,
    hasMultiUser:        false,
    hasDomainCustom:     false,
    maxBroadcastPerHari: 100,
  },
  // Paket Enterprise
  "enterprise": {
    maxKamar:            999999,
    maxCabang:           99,
    hasWaNotifikasi:     true,
    hasPaymentGateway:   true,
    hasQrisDinamis:      true,
    hasLaporanExpor:     true,
    hasBookingOnline:    true,
    hasFotoKamar:        true,
    hasMultiUser:        true,
    hasDomainCustom:     true,
    maxBroadcastPerHari: 999999,
  },
  "paket enterprise": {
    maxKamar:            999999,
    maxCabang:           99,
    hasWaNotifikasi:     true,
    hasPaymentGateway:   true,
    hasQrisDinamis:      true,
    hasLaporanExpor:     true,
    hasBookingOnline:    true,
    hasFotoKamar:        true,
    hasMultiUser:        true,
    hasDomainCustom:     true,
    maxBroadcastPerHari: 999999,
  },
};

// Default fallback (jika paket tidak dikenal → perlakukan sebagai Starter)
const DEFAULT_LIMITS: PlanLimits = PLAN_LIMITS["starter"];

/**
 * Ambil batas untuk paket tertentu
 */
export function getPlanLimits(paket: string): PlanLimits {
  const key = paket.toLowerCase().trim();
  return PLAN_LIMITS[key] || DEFAULT_LIMITS;
}

/**
 * Pesan upgrade yang konsisten
 */
export function getUpgradeMessage(feature: string, minPlan: "Pro" | "Enterprise"): string {
  return `Fitur "${feature}" hanya tersedia di Paket ${minPlan} ke atas. Upgrade paket untuk mengakses fitur ini.`;
}

/**
 * Cek apakah paket admin bisa tambah kamar lagi
 */
export function canAddRoom(paket: string, currentRoomCount: number): {
  allowed: boolean;
  reason?: string;
  limit: number;
} {
  const limits = getPlanLimits(paket);
  if (currentRoomCount >= limits.maxKamar) {
    return {
      allowed: false,
      reason: `Paket ${paket} hanya memperbolehkan maksimal ${limits.maxKamar} kamar. Upgrade ke paket lebih tinggi untuk menambah lebih banyak kamar.`,
      limit: limits.maxKamar,
    };
  }
  return { allowed: true, limit: limits.maxKamar };
}
