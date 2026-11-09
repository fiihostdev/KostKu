// Server Component — fetch di server, bukan di browser
// Tidak ada CORS issue, tidak ada loading state, langsung render
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

interface Room {
  id: string;
  nomor: string;
  lantai: number;
  tipe: string;
  harga: number;
  status: string;
  fasilitas: string[];
}

interface KostProfile {
  id: string;
  nama: string;
  subdomain: string;
  tagline: string;
  alamat: string;
  telepon: string;
}

// Supabase server-side client (env vars tersedia di server tanpa masalah)
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function getKostData(subdomain: string): Promise<{
  profile: KostProfile | null;
  rooms: Room[];
}> {
  const supabase = getSupabase();
  if (!supabase) return { profile: null, rooms: [] };

  const { data: profiles } = await supabase
    .from("kost_profiles")
    .select("id, nama, subdomain, tagline, alamat, telepon")
    .eq("subdomain", subdomain)
    .limit(1);

  if (!profiles || profiles.length === 0) return { profile: null, rooms: [] };

  const profile = profiles[0] as KostProfile;

  const { data: roomsData } = await supabase
    .from("rooms")
    .select("id, nomor, lantai, tipe, harga, status, fasilitas")
    .eq("kost_id", profile.id)
    .order("nomor", { ascending: true });

  return { profile, rooms: (roomsData || []) as Room[] };
}

// Komponen booking button — harus client karena ada window.open
import BookingButton from "./BookingButton";

export default async function PublicKostPage({
  params,
}: {
  params: { subdomain: string };
}) {
  const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "fiihost.my.id";
  const subdomain = params.subdomain;

  const { profile, rooms } = await getKostData(subdomain);

  // Not found
  if (!profile) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="skeu-card p-8 rounded-2xl text-center max-w-md space-y-4">
          <span className="material-symbols-outlined text-slate-300 text-[56px] block">search_off</span>
          <h1 className="text-xl font-black text-slate-900">Halaman Tidak Ditemukan</h1>
          <p className="text-xs text-slate-500">
            Subdomain <strong>{subdomain}.{APP_DOMAIN}</strong> tidak terdaftar di platform KOSTKU.
          </p>
          <Link href="/" className="skeu-button text-xs font-bold px-5 py-2.5 rounded-xl inline-flex items-center gap-1.5 shadow-md">
            <span className="material-symbols-outlined text-[16px]">home</span>
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  const availableRooms = rooms.filter((r) => r.status === "Kosong");
  const minPrice = rooms.length > 0 ? Math.min(...rooms.map((r) => r.harga)) : 0;
  const waPhone = (profile.telepon || "").replace(/[^0-9]/g, "").replace(/^0/, "62");

  return (
    <div className="min-h-screen bg-surface font-sans text-slate-800 pb-16">
      {/* Top Bar */}
      <div className="bg-slate-900 text-white text-[11px] py-2 px-4">
        <div className="flex items-center max-w-7xl mx-auto w-full justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <span className="truncate">
              Website Resmi <strong>{profile.subdomain}.{APP_DOMAIN}</strong> · KOSTKU Platform
            </span>
          </div>
          <Link href="/login" className="text-emerald-400 hover:underline font-bold text-[10px] shrink-0 ml-2">
            Panel Pemilik →
          </Link>
        </div>
      </div>

      {/* Header */}
      <header className="bg-surface/90 backdrop-blur-md border-b border-white/60 sticky top-0 z-40 px-4 sm:px-8 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl skeu-card flex items-center justify-center text-primary shadow-sm shrink-0">
              <span className="material-symbols-outlined text-[24px]">apartment</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-tight truncate">
                {profile.nama}
              </h1>
              {profile.alamat && (
                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px] shrink-0">location_on</span>
                  <span className="truncate">{profile.alamat}</span>
                </p>
              )}
            </div>
          </div>
          {waPhone && (
            <a
              href={`https://wa.me/${waPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="skeu-button text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">chat</span>
              <span className="hidden sm:inline">Hubungi</span>
            </a>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="py-10 sm:py-16 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              <span>Kost Terverifikasi & Fasilitas Lengkap</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
              {profile.tagline || profile.nama}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Selamat datang di website resmi {profile.nama}. Kami menyediakan hunian kost modern, bersih, dan aman dengan sistem reservasi digital.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a href="#kamar" className="skeu-button text-white px-6 py-3 rounded-xl font-bold text-xs shadow-md">
                Lihat Kamar Tersedia ({availableRooms.length})
              </a>
              {waPhone && (
                <a
                  href={`https://wa.me/${waPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="skeu-button-secondary text-slate-800 px-5 py-3 rounded-xl font-bold text-xs"
                >
                  Tanya WhatsApp
                </a>
              )}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="skeu-card p-5 rounded-3xl shadow-xl space-y-3">
              <div className="h-48 bg-slate-200 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                  <span className="material-symbols-outlined text-slate-400 text-[48px] block mb-1">apartment</span>
                  <span className="text-xs text-slate-500 font-medium">{profile.nama}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl skeu-inset">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Kamar Kosong</span>
                  <span className="text-lg font-black text-emerald-700">{availableRooms.length} Kamar</span>
                </div>
                <div className="p-3 rounded-xl skeu-inset">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Tarif Mulai</span>
                  <span className="text-sm font-black text-primary">
                    {minPrice > 0
                      ? `Rp ${minPrice.toLocaleString("id-ID")}/bln`
                      : "Hubungi kami"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fasilitas */}
      <section className="py-12 bg-surface-container-low border-y border-white/60 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Fasilitas Utama</span>
            <h3 className="text-2xl font-black text-slate-900 mt-1">Kenyamanan Eksklusif</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 text-center">
            {[
              { icon: "ac_unit", title: "AC Dingin" },
              { icon: "wifi", title: "WiFi 100 Mbps" },
              { icon: "shower", title: "K. Mandi Dalam" },
              { icon: "local_parking", title: "Parkir Luas" },
              { icon: "soup_kitchen", title: "Dapur Bersama" },
              { icon: "videocam", title: "CCTV 24 Jam" },
            ].map((f, i) => (
              <div key={i} className="skeu-card p-4 rounded-2xl flex flex-col items-center justify-center">
                <span className="material-symbols-outlined text-primary text-[28px] mb-2">{f.icon}</span>
                <span className="text-xs font-bold text-slate-800">{f.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Kamar */}
      <section id="kamar" className="py-16 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Katalog Kamar</span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">Pilih Kamar Idaman Anda</h3>
              <p className="text-xs text-slate-500 mt-1">Data kamar diperbarui langsung dari pengelola.</p>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full self-start sm:self-auto shrink-0">
              ● {availableRooms.length} Kamar Siap Huni
            </span>
          </div>

          {rooms.length === 0 ? (
            <div className="text-center py-16 skeu-card rounded-2xl">
              <span className="material-symbols-outlined text-slate-300 text-[56px] block mb-3">bed</span>
              <p className="text-sm font-bold text-slate-500">Belum ada kamar yang dipublikasikan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => {
                const isAvailable = room.status === "Kosong";
                const bookingText = `Halo pengelola ${profile.nama}, saya tertarik booking kamar ${room.nomor} (${room.tipe}) seharga Rp ${room.harga.toLocaleString("id-ID")}/bulan dari ${profile.subdomain}.${APP_DOMAIN}. Apakah masih tersedia?`;
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
                      </div>
                      <div className="text-xl font-black text-primary mb-4">
                        Rp {room.harga.toLocaleString("id-ID")}
                        <span className="text-xs font-normal text-slate-500"> / bulan</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-4">
                        {(room.fasilitas || []).map((f: string, i: number) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 bg-white/70 rounded-md text-slate-600 border border-slate-200">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="pt-3 border-t border-white/60">
                      {isAvailable && waPhone ? (
                        <BookingButton
                          waPhone={waPhone}
                          message={bookingText}
                        />
                      ) : (
                        <button
                          disabled
                          className="bg-slate-200 text-slate-500 text-xs font-bold py-2.5 w-full rounded-xl cursor-not-allowed"
                        >
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
      </section>

      {/* Lokasi */}
      {profile.alamat && (
        <section className="py-12 bg-surface-container-low border-t border-white/60 px-4 sm:px-8">
          <div className="max-w-4xl mx-auto skeu-card p-6 sm:p-8 rounded-3xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-3xl">location_on</span>
            </div>
            <h3 className="text-2xl font-black text-slate-900">Lokasi & Akses Strategis</h3>
            <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">{profile.alamat}</p>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(profile.alamat)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="skeu-button-secondary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">map</span>
              Buka di Google Maps
            </a>
          </div>
        </section>
      )}

      <footer className="mt-12 text-center text-xs text-slate-500 pb-4">
        <p>© {new Date().getFullYear()} {profile.nama}. Diberdayakan oleh platform KOSTKU.</p>
      </footer>
    </div>
  );
}
