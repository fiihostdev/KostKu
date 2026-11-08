import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-surface font-sans overflow-x-hidden">
      <Navbar />

      <main className="w-full pt-16 sm:pt-20 bg-surface">
        <div className="flex flex-col w-full">
          {/* Hero Section */}
          <section className="relative pt-8 sm:pt-16 pb-16 sm:pb-24 overflow-hidden bg-surface">
            {/* Ambient Glow */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[600px] h-[320px] sm:h-[600px] bg-primary/10 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                
                {/* Hero Text */}
                <div className="lg:col-span-6 flex flex-col items-start gap-4 sm:gap-6 text-left">
                  <div className="inline-flex items-center gap-2 skeu-pill px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-bold text-primary shadow-sm">
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    <span>Platform Manajemen Kost #1 di Indonesia</span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15] drop-shadow-sm">
                    Kelola Bisnis Kost Lebih Mudah,{" "}
                    <span className="text-primary block mt-1">Semuanya Dalam Satu Platform</span>
                  </h1>

                  <p className="text-sm sm:text-base lg:text-lg text-slate-600 leading-relaxed max-w-xl">
                    Buat website kost profesional otomatis, pantau okupansi kamar, kelola data penyewa, dan terima pembayaran sewa dengan QRIS / Virtual Account tanpa ribet.
                  </p>

                  {/* CTAs */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto pt-2">
                    <Link
                      href="/onboarding/step-1"
                      className="skeu-button text-white px-7 py-3.5 sm:py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98]"
                    >
                      <span>Mulai Gratis Sekarang</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </Link>
                    <Link
                      href="/admin/dashboard"
                      className="skeu-button-secondary text-slate-800 px-6 py-3.5 sm:py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm hover:bg-white active:scale-[0.98]"
                    >
                      <span className="material-symbols-outlined text-[20px] text-primary">dashboard</span>
                      <span>Demo Panel Admin</span>
                    </Link>
                  </div>

                  {/* Social Proof */}
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-slate-300/60 w-full">
                    <div className="flex -space-x-2.5">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full skeu-card flex items-center justify-center text-[10px] sm:text-xs text-primary font-bold shadow-sm">BS</div>
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full skeu-card flex items-center justify-center text-[10px] sm:text-xs text-emerald-700 font-bold shadow-sm">KM</div>
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full skeu-card flex items-center justify-center text-[10px] sm:text-xs text-indigo-700 font-bold shadow-sm">AP</div>
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary text-white flex items-center justify-center text-[10px] sm:text-xs font-bold shadow-sm">+5k</div>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-0.5 text-amber-500 text-xs sm:text-sm">
                        {"★★★★★".split("").map((star, i) => (
                          <span key={i}>{star}</span>
                        ))}
                      </div>
                      <span className="text-[11px] sm:text-xs text-slate-500 font-medium">Dipercaya oleh 5,000+ pemilik kost</span>
                    </div>
                  </div>
                </div>

                {/* Hero Preview Bento Card */}
                <div className="lg:col-span-6 w-full">
                  <div className="skeu-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl relative shadow-xl overflow-hidden border border-white/80">
                    {/* Window Controls */}
                    <div className="flex items-center justify-between pb-3 sm:pb-4 mb-4 border-b border-white/70">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-400 shrink-0"></span>
                        <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-400 shrink-0"></span>
                        <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-400 shrink-0"></span>
                        <span className="text-[11px] sm:text-xs font-mono font-semibold text-slate-500 ml-1.5 truncate">
                          harmoni.kostku.id
                        </span>
                      </div>
                      <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold shrink-0">
                        ● Live Realtime
                      </span>
                    </div>

                    {/* Quick Stats Grid */}
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

                    {/* Recent Item */}
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

                    {/* Bottom Action inside preview */}
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

          {/* Fitur Section */}
          <section id="fitur" className="py-16 sm:py-20 bg-surface-container-low border-y border-white/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Fitur Unggulan</span>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mt-2 mb-3">
                  Semua Kebutuhan Bisnis Kost dalam Satu Genggaman
                </h2>
                <p className="text-sm sm:text-base text-slate-600">
                  Dirancang khusus agar pemilik kost dapat mengelola operasional dengan efisien dari smartphone maupun laptop.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
                {/* Feature 1 */}
                <div className="skeu-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between transition hover:-translate-y-1">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 shadow-sm">
                      <span className="material-symbols-outlined text-[26px]">bed</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">Manajemen Kamar</h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Pantau status ketersediaan kamar, tipe kamar, fasilitas, dan status perbaikan secara visual dan realtime.
                    </p>
                  </div>
                  <Link href="/admin/kamar" className="text-xs font-bold text-primary mt-5 flex items-center gap-1 hover:underline">
                    Kelola Kamar <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </Link>
                </div>

                {/* Feature 2 */}
                <div className="skeu-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between transition hover:-translate-y-1">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 shadow-sm">
                      <span className="material-symbols-outlined text-[26px]">receipt_long</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">Billing & Invoice</h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Kirim tagihan sewa otomatis ke nomor WhatsApp penyewa lengkap dengan link pembayaran Midtrans (QRIS/VA).
                    </p>
                  </div>
                  <Link href="/admin/tagihan" className="text-xs font-bold text-primary mt-5 flex items-center gap-1 hover:underline">
                    Lihat Tagihan <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </Link>
                </div>

                {/* Feature 3 */}
                <div className="skeu-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between transition hover:-translate-y-1">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 shadow-sm">
                      <span className="material-symbols-outlined text-[26px]">query_stats</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">Laporan Keuangan</h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Rekap arus kas, pemasukan sewa, biaya listrik/air/WiFi, dan laba bersih secara otomatis tanpa buku manual.
                    </p>
                  </div>
                  <Link href="/admin/laporan" className="text-xs font-bold text-primary mt-5 flex items-center gap-1 hover:underline">
                    Lihat Laporan <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </Link>
                </div>

                {/* Feature 4 */}
                <div className="skeu-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between transition hover:-translate-y-1">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 shadow-sm">
                      <span className="material-symbols-outlined text-[26px]">public</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">Website Profil Kost</h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Dapatkan alamat subdomain gratis (namakost.kostku.id) untuk galeri foto dan promosi ke calon penyewa.
                    </p>
                  </div>
                  <Link href="/admin/website" className="text-xs font-bold text-primary mt-5 flex items-center gap-1 hover:underline">
                    Kustomisasi Web <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Pricing Section */}
          <section id="harga" className="py-16 sm:py-20 bg-surface">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
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
                <div className="skeu-card p-6 sm:p-8 rounded-2xl sm:rounded-3xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900">Paket Starter</h3>
                    <p className="text-xs text-slate-500 mt-1 mb-5">Untuk pemilik 1 properti kost pemula</p>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-3xl sm:text-4xl font-black text-slate-900">Rp 99.000</span>
                      <span className="text-xs text-slate-500 font-semibold">/ bulan</span>
                    </div>
                    <ul className="space-y-3 text-xs sm:text-sm text-slate-600">
                      <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span> Hingga 15 Kamar</li>
                      <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span> 1 Lokasi Kost</li>
                      <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span> Subdomain Profil Gratis</li>
                      <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span> Manajemen Kamar & Penyewa</li>
                    </ul>
                  </div>
                  <Link
                    href="/onboarding/step-2?plan=starter"
                    className="skeu-button-secondary text-center block w-full py-3 sm:py-3.5 rounded-xl font-bold text-xs mt-8 hover:bg-white transition-colors"
                  >
                    Pilih Paket Starter
                  </Link>
                </div>

                {/* Pro (Highlighted) */}
                <div className="skeu-card p-6 sm:p-8 rounded-2xl sm:rounded-3xl flex flex-col justify-between relative border-2 border-primary shadow-2xl">
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
                      <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span> Hingga 50 Kamar</li>
                      <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span> Hingga 3 Cabang Kost</li>
                      <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span> Tagihan WhatsApp Otomatis</li>
                      <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span> Payment Gateway Midtrans (QRIS/VA)</li>
                      <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span> Laporan Arus Kas & Ekspor Data</li>
                    </ul>
                  </div>
                  <Link
                    href="/onboarding/step-2?plan=pro"
                    className="skeu-button text-white text-center block w-full py-3.5 sm:py-4 rounded-xl font-bold text-xs sm:text-sm mt-8 shadow-lg"
                  >
                    Pilih Paket Pro
                  </Link>
                </div>

                {/* Enterprise */}
                <div className="skeu-card p-6 sm:p-8 rounded-2xl sm:rounded-3xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900">Paket Enterprise</h3>
                    <p className="text-xs text-slate-500 mt-1 mb-5">Untuk juragan kost & manajemen multi-cabang</p>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-3xl sm:text-4xl font-black text-slate-900">Rp 399.000</span>
                      <span className="text-xs text-slate-500 font-semibold">/ bulan</span>
                    </div>
                    <ul className="space-y-3 text-xs sm:text-sm text-slate-600">
                      <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span> Kamar & Properti Tanpa Batas</li>
                      <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span> Multi-User Admin & Pengelola</li>
                      <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span> Domain Kustom Sendiri (.com/.id)</li>
                      <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span> Master Dashboard Multi-Kost</li>
                    </ul>
                  </div>
                  <Link
                    href="/onboarding/step-2?plan=enterprise"
                    className="skeu-button-secondary text-center block w-full py-3 sm:py-3.5 rounded-xl font-bold text-xs mt-8 hover:bg-white transition-colors"
                  >
                    Pilih Paket Enterprise
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Banner Section */}
          <section className="py-12 sm:py-16 bg-surface">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="skeu-button rounded-2xl sm:rounded-3xl p-6 sm:p-12 md:p-14 text-center relative overflow-hidden shadow-2xl">
                <div className="relative z-10 max-w-2xl mx-auto">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-3">
                    Siap Mengubah Cara Anda Mengelola Bisnis Kost?
                  </h2>
                  <p className="text-white/90 text-xs sm:text-base mb-6 sm:mb-8 leading-relaxed">
                    Tinggalkan pencatatan manual di buku atau spreadsheet. Mulai sekarang dan rasakan kemudahan pengelolaan properti kost Anda secara modern.
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center gap-3">
                    <Link
                      href="/onboarding/step-1"
                      className="skeu-pill text-primary px-7 py-3.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg hover:opacity-95 text-center"
                    >
                      Daftar Gratis Sekarang
                    </Link>
                    <Link
                      href="/admin/dashboard"
                      className="skeu-button-secondary text-slate-900 px-7 py-3.5 rounded-xl text-xs sm:text-sm font-bold shadow-md text-center hover:bg-white"
                    >
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
