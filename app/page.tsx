"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// ── Intersection Observer hook for scroll-reveal animations ──────────────────
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

export default function Home() {
  useScrollReveal();

  return (
    <div className="min-h-screen flex flex-col bg-surface font-sans overflow-x-hidden scroll-smooth">
      <Navbar />

      <main className="w-full pt-16 sm:pt-20 bg-surface">
        <div className="flex flex-col w-full">

          {/* ── Hero Section ── */}
          <section className="relative pt-8 sm:pt-16 pb-16 sm:pb-24 overflow-hidden bg-surface">
            {/* Ambient blobs */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[700px] h-[320px] sm:h-[700px] bg-primary/8 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none animate-pulse-slow"></div>
            <div className="absolute bottom-0 right-0 w-[200px] sm:w-[400px] h-[200px] sm:h-[400px] bg-indigo-400/6 rounded-full blur-[80px] pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

                {/* Hero Text */}
                <div className="lg:col-span-6 flex flex-col items-start gap-4 sm:gap-6 text-left">
                  <div
                    data-reveal
                    className="reveal-fade-up inline-flex items-center gap-2 skeu-pill px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-bold text-primary shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    <span>Platform Manajemen Kost #1 di Indonesia</span>
                  </div>

                  <h1
                    data-reveal
                    className="reveal-fade-up delay-100 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15] drop-shadow-sm"
                  >
                    Kelola Bisnis Kost Lebih Mudah,{" "}
                    <span className="text-primary block mt-1">Semuanya Dalam Satu Platform</span>
                  </h1>

                  <p
                    data-reveal
                    className="reveal-fade-up delay-200 text-sm sm:text-base lg:text-lg text-slate-600 leading-relaxed max-w-xl"
                  >
                    Buat website kost profesional otomatis, pantau okupansi kamar, kelola data penyewa, dan terima pembayaran sewa dengan QRIS / Virtual Account tanpa ribet.
                  </p>

                  {/* CTAs */}
                  <div data-reveal className="reveal-fade-up delay-300 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto pt-2">
                    <Link
                      href="/onboarding/step-1"
                      className="skeu-button text-white px-7 py-3.5 sm:py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 active:scale-[0.98]"
                    >
                      <span>Mulai Gratis Sekarang</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </Link>
                    <Link
                      href="/login"
                      className="skeu-button-secondary text-slate-800 px-6 py-3.5 sm:py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm hover:bg-white hover:-translate-y-0.5 active:scale-[0.98]"
                    >
                      <span className="material-symbols-outlined text-[20px] text-primary">login</span>
                      <span>Masuk ke Dashboard</span>
                    </Link>
                  </div>

                  {/* Social Proof */}
                  <div data-reveal className="reveal-fade-up delay-400 flex flex-wrap items-center gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-slate-300/60 w-full">
                    <div className="flex -space-x-2.5">
                      {["BS","KM","AP"].map((initials, i) => (
                        <div key={i} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full skeu-card flex items-center justify-center text-[10px] sm:text-xs font-bold shadow-sm"
                          style={{ color: ["#4F46E5","#059669","#4338CA"][i] }}>
                          {initials}
                        </div>
                      ))}
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary text-white flex items-center justify-center text-[10px] sm:text-xs font-bold shadow-sm">+5k</div>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-0.5 text-amber-500 text-xs sm:text-sm">
                        {"★★★★★".split("").map((s, i) => <span key={i}>{s}</span>)}
                      </div>
                      <span className="text-[11px] sm:text-xs text-slate-500 font-medium">Dipercaya oleh 5,000+ pemilik kost</span>
                    </div>
                  </div>
                </div>

                {/* Hero Preview Card */}
                <div data-reveal className="reveal-fade-left delay-200 lg:col-span-6 w-full">
                  <div className="skeu-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl relative shadow-xl overflow-hidden border border-white/80">
                    <div className="flex items-center justify-between pb-3 sm:pb-4 mb-4 border-b border-white/70">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-400 shrink-0"></span>
                        <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-400 shrink-0"></span>
                        <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-400 shrink-0"></span>
                        <span className="text-[11px] sm:text-xs font-mono font-semibold text-slate-500 ml-1.5 truncate">
                          harmoni.{process.env.NEXT_PUBLIC_APP_DOMAIN || "manajementkost.my.id"}
                        </span>
                      </div>
                      <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold shrink-0">
                        ● Live Realtime
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
                      <div className="skeu-inset p-3 sm:p-4 rounded-xl">
                        <span className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase tracking-wider block">Kamar Terisi</span>
                        <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">22 / 24</div>
                        <span className="text-[10px] sm:text-xs text-emerald-600 font-bold">Okupansi 91.6%</span>
                      </div>
                      <div className="skeu-inset p-3 sm:p-4 rounded-xl">
                        <span className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase tracking-wider block">Pendapatan</span>
                        <div className="text-xl sm:text-2xl font-bold text-primary mt-1">Rp 39.6 Jt</div>
                        <span className="text-[10px] sm:text-xs text-emerald-600 font-bold">+14% vs target</span>
                      </div>
                    </div>
                    <div className="skeu-card p-3 sm:p-4 rounded-xl mb-4 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                          <span className="material-symbols-outlined text-[18px] sm:text-[22px]">payments</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">Pembayaran QRIS Masuk</p>
                          <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">Kamar A-01 • Dimas Anggara</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 shrink-0">+Rp 1.800.000</span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-white/60">
                      <span className="text-[10px] text-slate-500 text-center sm:text-left">Terintegrasi otomatis dengan WhatsApp Bot</span>
                      <Link
                        href="/admin/dashboard"
                        className="skeu-button text-[11px] sm:text-xs font-bold px-3.5 py-2 rounded-xl flex items-center justify-center gap-1 shadow-sm"
                      >
                        <span>Jelajahi Dashboard</span>
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </Link>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </section>

          {/* ── Fitur Section ── */}
          <section id="fitur" className="py-16 sm:py-20 bg-surface-container-low border-y border-white/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div data-reveal className="reveal-fade-up text-center max-w-2xl mx-auto mb-12 sm:mb-16">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Fitur Unggulan</span>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mt-2 mb-3">
                  Semua Kebutuhan Bisnis Kost dalam Satu Genggaman
                </h2>
                <p className="text-sm sm:text-base text-slate-600">
                  Dirancang khusus agar pemilik kost dapat mengelola operasional dengan efisien dari smartphone maupun laptop.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
                {[
                  { icon: "bed",          color: "bg-primary/10 text-primary",        title: "Manajemen Kamar",     desc: "Pantau status ketersediaan kamar, tipe, fasilitas, dan status perbaikan secara visual dan realtime.", href: "/admin/kamar",    link: "Kelola Kamar" },
                  { icon: "receipt_long", color: "bg-emerald-50 text-emerald-600",    title: "Billing & Invoice",   desc: "Kirim tagihan sewa otomatis ke nomor WhatsApp penyewa lengkap dengan link pembayaran Midtrans (QRIS/VA).", href: "/admin/tagihan", link: "Lihat Tagihan" },
                  { icon: "query_stats",  color: "bg-amber-50 text-amber-600",        title: "Laporan Keuangan",    desc: "Rekap arus kas, pemasukan sewa, biaya operasional, dan laba bersih secara otomatis tanpa buku manual.", href: "/admin/laporan", link: "Lihat Laporan" },
                  { icon: "public",       color: "bg-purple-50 text-purple-600",      title: "Website Profil Kost", desc: `Dapatkan subdomain gratis (namakost.${process.env.NEXT_PUBLIC_APP_DOMAIN || "manajementkost.my.id"}) untuk galeri foto dan promosi.`, href: "/admin/website", link: "Kustomisasi Web" },
                ].map((f, i) => (
                  <div
                    key={i}
                    data-reveal
                    className={`reveal-fade-up delay-${(i + 1) * 100} skeu-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl`}
                  >
                    <div>
                      <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4 shadow-sm`}>
                        <span className="material-symbols-outlined text-[26px]">{f.icon}</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{f.desc}</p>
                    </div>
                    <Link href={f.href} className="text-xs font-bold text-primary mt-5 flex items-center gap-1 hover:gap-2 transition-all">
                      {f.link} <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Cara Kerja Section ── */}
          <section id="cara-kerja" className="py-16 sm:py-24 bg-surface relative overflow-hidden">
            {/* bg decoration */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-[80px]"></div>
              <div className="absolute bottom-10 right-10 w-56 h-56 bg-indigo-300/5 rounded-full blur-[60px]"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div data-reveal className="reveal-fade-up text-center max-w-2xl mx-auto mb-14 sm:mb-20">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Cara Kerja</span>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mt-2 mb-3">
                  Mulai dalam 3 Langkah Mudah
                </h2>
                <p className="text-sm sm:text-base text-slate-600">
                  Tidak perlu keahlian teknis. Dari daftar hingga kost Anda online hanya butuh beberapa menit.
                </p>
              </div>

              {/* Steps */}
              <div className="relative">
                {/* Connector line (desktop only) */}
                <div className="hidden lg:block absolute top-14 left-[16.666%] right-[16.666%] h-0.5 bg-gradient-to-r from-primary/20 via-primary/50 to-primary/20 z-0"></div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10 relative z-10">
                  {[
                    {
                      step: "01",
                      icon: "person_add",
                      title: "Daftar & Pilih Paket",
                      desc: "Buat akun gratis, isi data kost Anda, lalu pilih paket yang sesuai skala bisnis. Proses registrasi selesai kurang dari 2 menit.",
                      color: "bg-primary/10 text-primary border-primary/20",
                      dot: "bg-primary",
                    },
                    {
                      step: "02",
                      icon: "domain",
                      title: "Dapatkan Subdomain Kost",
                      desc: `Sistem otomatis membuat website profil kost Anda di alamat subdomain.${process.env.NEXT_PUBLIC_APP_DOMAIN || "manajementkost.my.id"} — siap dibagikan ke calon penyewa.`,
                      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
                      dot: "bg-emerald-500",
                    },
                    {
                      step: "03",
                      icon: "rocket_launch",
                      title: "Kelola & Terima Pembayaran",
                      desc: "Tambahkan kamar, daftarkan penyewa, terbitkan tagihan, dan terima pembayaran QRIS/VA otomatis. Semua tersinkron realtime.",
                      color: "bg-amber-50 text-amber-700 border-amber-200",
                      dot: "bg-amber-500",
                    },
                  ].map((s, i) => (
                    <div
                      key={i}
                      data-reveal
                      className={`reveal-fade-up delay-${(i + 1) * 150} flex flex-col items-center text-center`}
                    >
                      {/* Step number circle */}
                      <div className="relative mb-6">
                        <div className={`w-28 h-28 rounded-full skeu-card flex flex-col items-center justify-center shadow-lg border-2 ${s.color} transition-transform duration-300 hover:scale-105`}>
                          <span className="material-symbols-outlined text-[36px] mb-0.5">{s.icon}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{s.step}</span>
                        </div>
                        {/* dot on connector */}
                        <div className={`hidden lg:block absolute top-1/2 -right-5 -translate-y-1/2 w-3 h-3 rounded-full ${s.dot} ring-4 ring-white shadow-sm`}></div>
                      </div>

                      <h3 className="text-base sm:text-lg font-black text-slate-900 mb-2">{s.title}</h3>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xs">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA below steps */}
              <div data-reveal className="reveal-fade-up delay-300 mt-14 text-center">
                <Link
                  href="/onboarding/step-1"
                  className="skeu-button text-white px-8 py-4 rounded-xl font-bold text-sm shadow-lg inline-flex items-center gap-2 hover:-translate-y-0.5 transition-transform"
                >
                  <span>Coba Sekarang — Gratis</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
              </div>
            </div>
          </section>

          {/* ── Pricing Section ── */}
          <section id="harga" className="py-16 sm:py-20 bg-surface-container-low border-t border-white/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div data-reveal className="reveal-fade-up text-center max-w-2xl mx-auto mb-12 sm:mb-16">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Pilihan Paket</span>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mt-2 mb-3">
                  Investasi Terjangkau untuk Bisnis Kost Anda
                </h2>
                <p className="text-sm sm:text-base text-slate-600">
                  Pilih paket langganan yang fleksibel sesuai skala kamar dan properti Anda.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
                {/* Starter */}
                <div data-reveal className="reveal-fade-up delay-100 skeu-card p-6 sm:p-8 rounded-2xl sm:rounded-3xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900">Paket Starter</h3>
                    <p className="text-xs text-slate-500 mt-1 mb-5">Untuk pemilik 1 properti kost pemula</p>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-3xl sm:text-4xl font-black text-slate-900">Rp 99.000</span>
                      <span className="text-xs text-slate-500 font-semibold">/ bulan</span>
                    </div>
                    <ul className="space-y-3 text-xs sm:text-sm text-slate-600">
                      {["Hingga 15 Kamar","1 Lokasi Kost","Subdomain Profil Gratis","Manajemen Kamar & Penyewa"].map((f) => (
                        <li key={f} className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link href="/onboarding/step-2?plan=starter" className="skeu-button-secondary text-center block w-full py-3 sm:py-3.5 rounded-xl font-bold text-xs mt-8 hover:bg-white transition-colors">
                    Pilih Paket Starter
                  </Link>
                </div>

                {/* Pro */}
                <div data-reveal className="reveal-fade-up delay-200 skeu-card p-6 sm:p-8 rounded-2xl sm:rounded-3xl flex flex-col justify-between relative border-2 border-primary shadow-2xl transition-all duration-300 hover:-translate-y-2">
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-white text-[11px] font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-md whitespace-nowrap">
                    Paling Banyak Dipilih
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900">Paket Pro</h3>
                    <p className="text-xs text-slate-500 mt-1 mb-5">Pilihan favorit pemilik kost menengah</p>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-3xl sm:text-4xl font-black text-primary">Rp 199.000</span>
                      <span className="text-xs text-slate-500 font-semibold">/ bulan</span>
                    </div>
                    <ul className="space-y-3 text-xs sm:text-sm text-slate-800 font-medium">
                      {["Hingga 50 Kamar","Hingga 3 Cabang Kost","Tagihan WhatsApp Otomatis","Payment Gateway Midtrans (QRIS/VA)","Laporan Arus Kas & Ekspor Data"].map((f) => (
                        <li key={f} className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link href="/onboarding/step-2?plan=pro" className="skeu-button text-white text-center block w-full py-3.5 sm:py-4 rounded-xl font-bold text-xs sm:text-sm mt-8 shadow-lg">
                    Pilih Paket Pro
                  </Link>
                </div>

                {/* Enterprise */}
                <div data-reveal className="reveal-fade-up delay-300 skeu-card p-6 sm:p-8 rounded-2xl sm:rounded-3xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900">Paket Enterprise</h3>
                    <p className="text-xs text-slate-500 mt-1 mb-5">Untuk juragan kost & manajemen multi-cabang</p>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-3xl sm:text-4xl font-black text-slate-900">Rp 399.000</span>
                      <span className="text-xs text-slate-500 font-semibold">/ bulan</span>
                    </div>
                    <ul className="space-y-3 text-xs sm:text-sm text-slate-600">
                      {["Kamar & Properti Tanpa Batas","Multi-User Admin & Pengelola","Domain Kustom Sendiri (.com/.id)","Master Dashboard Multi-Kost"].map((f) => (
                        <li key={f} className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link href="/onboarding/step-2?plan=enterprise" className="skeu-button-secondary text-center block w-full py-3 sm:py-3.5 rounded-xl font-bold text-xs mt-8 hover:bg-white transition-colors">
                    Pilih Paket Enterprise
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* ── CTA Banner ── */}
          <section className="py-12 sm:py-16 bg-surface">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div data-reveal className="reveal-fade-up skeu-button rounded-2xl sm:rounded-3xl p-6 sm:p-12 md:p-14 text-center relative overflow-hidden shadow-2xl">
                <div className="relative z-10 max-w-2xl mx-auto">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-3">
                    Siap Mengubah Cara Anda Mengelola Bisnis Kost?
                  </h2>
                  <p className="text-white/90 text-xs sm:text-base mb-6 sm:mb-8 leading-relaxed">
                    Tinggalkan pencatatan manual di buku atau spreadsheet. Mulai sekarang dan rasakan kemudahan pengelolaan properti kost Anda secara modern.
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center gap-3">
                    <Link href="/onboarding/step-1" className="skeu-pill text-primary px-7 py-3.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg hover:opacity-95 text-center hover:-translate-y-0.5 transition-transform">
                      Daftar Gratis Sekarang
                    </Link>
                    <Link href="/admin/dashboard" className="skeu-button-secondary text-slate-900 px-7 py-3.5 rounded-xl text-xs sm:text-sm font-bold shadow-md text-center hover:bg-white hover:-translate-y-0.5 transition-transform">
                      Buka Demo Admin Langsung
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
