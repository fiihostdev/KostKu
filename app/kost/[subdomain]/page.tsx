"use client";

import { useState } from "react";
import Link from "next/link";
import { useKost } from "@/lib/store";

export default function PublicKostPage({
  params,
}: {
  params: { subdomain: string };
}) {
  const { profile, rooms } = useKost();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  const availableRooms = rooms.filter((r) => r.status === "Kosong");
  const occupiedRooms = rooms.filter((r) => r.status === "Terisi");

  const handleBooking = (roomNomor: string, tipe: string, harga: number) => {
    const text = encodeURIComponent(
      `Halo pengelola ${profile.nama}, saya tertarik untuk survei / booking kamar ${roomNomor} (${tipe}) seharga Rp ${harga.toLocaleString("id-ID")}/bulan yang saya lihat di ${profile.subdomain}.kostku.id. Apakah masih tersedia?`
    );
    window.open(`https://wa.me/${profile.telepon.replace(/[^0-9]/g, "")}?text=${text}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-surface font-sans text-slate-800 pb-16">
      {/* Top Notice Bar */}
      <div className="bg-slate-900 text-white text-[11px] py-2 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Website Resmi <strong>{profile.subdomain}.kostku.id</strong> • Didukung oleh Platform KOSTKU</span>
          </div>
          <Link href="/admin/dashboard" className="text-emerald-400 hover:underline font-bold text-[10px]">
            Masuk Panel Pemilik →
          </Link>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-surface/90 backdrop-blur-md border-b border-white/60 sticky top-0 z-40 px-4 sm:px-8 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl skeu-card flex items-center justify-center text-primary shadow-sm">
              <span className="material-symbols-outlined text-[24px]">apartment</span>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">{profile.nama}</h1>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-slate-400">location_on</span>
                <span className="truncate">{profile.alamat}</span>
              </p>
            </div>
          </div>
          <a
            href={`https://wa.me/${profile.telepon.replace(/[^0-9]/g, "")}`}
            target="_blank"
            className="skeu-button text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md"
          >
            <span className="material-symbols-outlined text-[16px]">chat</span>
            <span className="hidden sm:inline">Hubungi Pengelola</span>
          </a>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="py-10 sm:py-16 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              <span>Kost Terverifikasi & Fasilitas Lengkap</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 leading-tight">
              {profile.tagline}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Selamat datang di website resmi {profile.nama}. Kami menyediakan hunian kost modern, bersih, aman, dengan sistem reservasi digital dan pembayaran langsung via transfer / QRIS.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href="#kamar"
                className="skeu-button text-white px-6 py-3 rounded-xl font-bold text-xs shadow-md"
              >
                Lihat Kamar Tersedia ({availableRooms.length})
              </a>
              <a
                href={`https://wa.me/${profile.telepon.replace(/[^0-9]/g, "")}`}
                target="_blank"
                className="skeu-button-secondary text-slate-800 px-5 py-3 rounded-xl font-bold text-xs"
              >
                Tanya WhatsApp
              </a>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="skeu-card p-5 rounded-3xl shadow-xl space-y-3">
              <div className="h-52 bg-slate-200 rounded-2xl overflow-hidden relative">
                <img
                  src="/screens/11_website_saya.png"
                  alt="Foto Kost"
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-sm">
                  Foto Properti & Bangunan
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl skeu-inset">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Kamar Kosong</span>
                  <span className="text-lg font-black text-emerald-700">{availableRooms.length} Kamar</span>
                </div>
                <div className="p-3 rounded-xl skeu-inset">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Tarif Mulai</span>
                  <span className="text-lg font-black text-primary">Rp 1.5 Jt/bln</span>
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
            <h3 className="text-2xl font-black text-slate-900 mt-1">Kenyamanan & Fasilitas Eksklusif</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 text-center">
            {[
              { icon: "ac_unit", title: "AC Dingin" },
              { icon: "wifi", title: "WiFi 100 Mbps" },
              { icon: "shower", title: "Kamar Mandi Dalam" },
              { icon: "local_parking", title: "Parkir Mobil/Motor" },
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

      {/* Available Rooms Section */}
      <section id="kamar" className="py-16 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Katalog Kamar</span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">Pilih Kamar Idaman Anda</h3>
              <p className="text-xs text-slate-500 mt-1">Data kamar di bawah ini terhubung langsung secara realtime dengan sistem pengelola.</p>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full self-start sm:self-auto">
              ● {availableRooms.length} Kamar Siap Huni
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => {
              const isAvailable = room.status === "Kosong";

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
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isAvailable
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {isAvailable ? "Tersedia" : "Sudah Terisi"}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 mb-2">
                      Tipe: <span className="font-bold text-slate-800">{room.tipe}</span>
                    </div>

                    <div className="text-xl font-black text-primary mb-4">
                      Rp {room.harga.toLocaleString("id-ID")}{" "}
                      <span className="text-xs font-normal text-slate-500">/ bulan</span>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-4">
                      {room.fasilitas.map((f, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 bg-white/70 rounded-md text-slate-600 border border-slate-200">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/60">
                    {isAvailable ? (
                      <button
                        onClick={() => handleBooking(room.nomor, room.tipe, room.harga)}
                        className="skeu-button text-white text-xs font-bold py-2.5 w-full rounded-xl flex items-center justify-center gap-1.5 shadow-md"
                      >
                        <span className="material-symbols-outlined text-[16px]">chat</span>
                        <span>Booking via WhatsApp</span>
                      </button>
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
        </div>
      </section>

      {/* Location Section */}
      <section className="py-12 bg-surface-container-low border-t border-white/60 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto skeu-card p-6 sm:p-8 rounded-3xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl">location_on</span>
          </div>
          <h3 className="text-2xl font-black text-slate-900">Lokasi & Akses Strategis</h3>
          <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            {profile.alamat}
          </p>
          <div className="pt-2">
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(profile.alamat)}`}
              target="_blank"
              className="skeu-button-secondary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">map</span>
              <span>Buka Petunjuk Arah di Google Maps</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-12 text-center text-xs text-slate-500">
        <p>© 2026 {profile.nama}. Diberdayakan oleh platform KOSTKU SaaS.</p>
      </footer>
    </div>
  );
}
