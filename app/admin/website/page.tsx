"use client";

import { useState } from "react";
import Link from "next/link";
import { useKost } from "@/lib/store";

export default function WebsiteSayaPage() {
  const { profile, setProfile, rooms } = useKost();

  const [subdomain, setSubdomain] = useState(profile.subdomain);
  const [namaKost, setNamaKost] = useState(profile.nama);
  const [tagline, setTagline] = useState(profile.tagline);
  const [alamat, setAlamat] = useState(profile.alamat);
  const [kontakWa, setKontakWa] = useState(profile.telepon);
  const [showSavedToast, setShowSavedToast] = useState(false);

  const handleSave = () => {
    setProfile({
      ...profile,
      subdomain,
      nama: namaKost,
      tagline,
      alamat,
      telepon: kontakWa,
    });
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  const sampleAvailableRoom = rooms.find((r) => r.status === "Kosong") || rooms[0];

  return (
    <div className="space-y-6 sm:space-y-8 max-w-full">
      {/* Toast */}
      {showSavedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-fadeInUp">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>Pengaturan Website Kost berhasil diperbarui dan disimpan!</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-primary uppercase">Modul Website Publik</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Kelola Landing Page & Subdomain Kost</h1>
          <p className="text-xs text-slate-500 mt-0.5">Website profil kost otomatis yang dapat diakses oleh calon penyewa baru.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/kost/${subdomain}`}
            target="_blank"
            className="skeu-button-secondary text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm flex-1 sm:flex-none"
          >
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            <span>Live Site</span>
          </Link>
          <button
            onClick={handleSave}
            className="skeu-button text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md flex-1 sm:flex-none"
          >
            <span className="material-symbols-outlined text-[16px]">save</span>
            <span>Simpan</span>
          </button>
        </div>
      </div>

      {/* Subdomain Status Card */}
      <div className="skeu-card p-4 sm:p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border-2 border-emerald-500/20">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <span className="material-symbols-outlined text-[24px] sm:text-[28px]">language</span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm sm:text-base font-bold text-slate-900 truncate">
                https://{subdomain}.fiihost.my.id
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full shrink-0">
                SSL Aktif (Aman)
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Subdomain publik siap dibagikan ke calon penyewa melalui Instagram / WhatsApp Bio.
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(`https://${subdomain}.fiihost.my.id`);
            alert("Link website kost berhasil disalin ke clipboard!");
          }}
          className="skeu-button-secondary text-xs font-bold px-3 py-2 rounded-xl flex items-center justify-center gap-1 self-start md:self-auto shrink-0"
        >
          <span className="material-symbols-outlined text-[16px]">content_copy</span>
          <span>Salin Link</span>
        </button>
      </div>

      {/* Form & Live Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Settings Form */}
        <div className="lg:col-span-7 skeu-card p-5 sm:p-6 rounded-2xl space-y-4 text-xs">
          <h2 className="font-bold text-slate-900 text-sm pb-2 border-b border-white/60">
            Informasi Profil Kost
          </h2>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Subdomain Kost</label>
            <div className="flex items-center max-w-full">
              <input
                type="text"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                className="p-2.5 rounded-l-xl skeu-inset text-slate-800 outline-none w-36 sm:w-48 font-mono font-bold text-xs"
              />
              <span className="p-2.5 bg-slate-200 text-slate-600 rounded-r-xl font-mono text-xs border-l border-slate-300">
                .fiihost.my.id
              </span>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Nama Properti Kost</label>
            <input
              type="text"
              value={namaKost}
              onChange={(e) => setNamaKost(e.target.value)}
              className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-bold"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Tagline / Deskripsi Singkat</label>
            <textarea
              rows={2}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Alamat Lengkap</label>
              <input
                type="text"
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">No. WhatsApp Pemilik / Admin</label>
              <input
                type="text"
                value={kontakWa}
                onChange={(e) => setKontakWa(e.target.value)}
                className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="font-bold text-slate-700 block mb-2">Fasilitas Kost yang Ditampilkan</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {["AC Kamar", "WiFi Cepat", "K. Mandi Dalam", "Parkir Luas", "Dapur Bersama", "CCTV 24 Jam"].map((f, i) => (
                <label key={i} className="flex items-center gap-2 p-2 rounded-lg skeu-inset cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-primary shrink-0" />
                  <span className="text-slate-800 text-[11px] font-bold truncate">{f}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="lg:col-span-5 skeu-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/60">
              <span className="font-bold text-slate-900 text-xs sm:text-sm">Preview Layar Calon Penyewa</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            </div>

            {/* Mobile frame */}
            <div className="skeu-card p-4 rounded-3xl border-4 border-slate-300 max-w-[270px] mx-auto shadow-inner">
              <div className="w-14 h-2.5 bg-slate-300 rounded-full mx-auto mb-3"></div>

              <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2 font-bold">
                  <span className="material-symbols-outlined text-[20px]">apartment</span>
                </div>
                <h3 className="font-bold text-slate-900 text-xs leading-snug">{namaKost}</h3>
                <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-tight">{tagline}</p>
                <div className="text-[9px] text-slate-400 mt-2 flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">location_on</span>
                  <span className="truncate">{alamat}</span>
                </div>

                {sampleAvailableRoom && (
                  <div className="mt-3 p-2 bg-slate-50 rounded-xl border border-slate-100 text-left">
                    <span className="text-[8px] font-bold text-emerald-600 block uppercase">
                      {sampleAvailableRoom.status === "Kosong" ? "Kamar Tersedia" : "Contoh Tipe Kamar"}
                    </span>
                    <p className="text-[11px] font-bold text-slate-800">
                      {sampleAvailableRoom.tipe} {sampleAvailableRoom.nomor}
                    </p>
                    <p className="text-[10px] font-bold text-primary mt-0.5">
                      Rp {sampleAvailableRoom.harga.toLocaleString("id-ID")} / bln
                    </p>
                  </div>
                )}

                <a
                  href={`https://wa.me/${kontakWa.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  className="skeu-button text-white text-[10px] font-bold py-2 w-full rounded-xl mt-3 block"
                >
                  Hubungi via WhatsApp
                </a>
              </div>
            </div>
          </div>

          <div className="text-center pt-3 text-[11px] text-slate-500">
            Perubahan nama dan kontak langsung tersinkronisasi dan tersimpan ke memori kost Anda.
          </div>
        </div>
      </div>
    </div>
  );
}
