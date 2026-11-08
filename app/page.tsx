import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-surface font-sans">
      <Navbar />

      <main className="w-full pt-20 bg-surface">
        <div className="flex flex-col w-full">
          {/* Hero Section */}
          <section className="relative pt-16 pb-24 overflow-hidden bg-surface">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="max-w-7xl mx-auto px-6 relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                {/* Hero Text */}
                <div className="lg:col-span-6 flex flex-col items-start gap-6">
                  <div className="inline-flex items-center gap-2 skeu-pill px-4 py-1.5 rounded-full text-xs font-semibold text-primary">
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    <span>Platform Manajemen Kost #1 di Indonesia</span>
                  </div>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-on-surface tracking-tight text-left drop-shadow-sm leading-tight">
                    Kelola Bisnis Kost Lebih Mudah,{" "}
                    <span className="text-primary block mt-1">Semuanya Dalam Satu Platform</span>
                  </h1>
                  <p className="text-lg text-on-surface-variant text-left leading-relaxed">
                    Buat website kost profesional, kelola kamar, pantau penyewa, dan terima reservasi secara online dengan mudah dan otomatis.
                  </p>
                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <Link
                      href="/onboarding/step-1"
                      className="skeu-button text-on-primary px-8 py-4 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg"
                    >
                      <span>Mulai Sekarang</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </Link>
                    <Link
                      href="/admin/dashboard"
                      className="skeu-button-secondary text-on-surface px-8 py-4 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[20px] text-primary">dashboard</span>
                      <span>Demo Dashboard</span>
                    </Link>
                  </div>
                  {/* Social Proof */}
                  <div className="flex items-center gap-4 pt-4">
                    <div className="flex -space-x-3">
                      <div className="w-10 h-10 rounded-full skeu-card flex items-center justify-center text-xs text-primary font-bold shadow-sm">BS</div>
                      <div className="w-10 h-10 rounded-full skeu-card flex items-center justify-center text-xs text-secondary font-bold shadow-sm">KM</div>
                      <div className="w-10 h-10 rounded-full skeu-card flex items-center justify-center text-xs text-indigo-700 font-bold shadow-sm">AP</div>
                      <div className="w-10 h-10 rounded-full skeu-card flex items-center justify-center text-xs bg-primary text-white font-bold shadow-sm">+5k</div>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1 text-amber-500">
                        {"★★★★★".split("").map((star, i) => (
                          <span key={i} className="text-sm">{star}</span>
                        ))}
                      </div>
                      <span className="text-xs text-on-surface-variant font-medium">Dipercaya oleh 5,000+ pemilik kost</span>
                    </div>
                  </div>
                </div>

                {/* Hero Mockup Preview Card */}
                <div className="lg:col-span-6">
                  <div className="skeu-card p-4 sm:p-6 rounded-2xl relative">
                    <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/60">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-400"></span>
                        <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                        <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                        <span className="text-xs font-semibold text-slate-500 ml-2">kostku.id/demo-kost</span>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold">Live Preview</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="skeu-inset p-4 rounded-xl">
                        <span className="text-xs text-slate-500 font-medium">Total Kamar</span>
                        <div className="text-2xl font-bold text-slate-900 mt-1">24 Kamar</div>
                        <span className="text-[11px] text-emerald-600 font-medium">21 Terisi (87.5%)</span>
                      </div>
                      <div className="skeu-inset p-4 rounded-xl">
                        <span className="text-xs text-slate-500 font-medium">Pendapatan Bulan Ini</span>
                        <div className="text-2xl font-bold text-primary mt-1">Rp 37.8 Jt</div>
                        <span className="text-[11px] text-emerald-600 font-medium">+12% vs bulan lalu</span>
                      </div>
                    </div>

                    <div className="skeu-card p-4 rounded-xl mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                          <span className="material-symbols-outlined text-[20px]">payments</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">Pembayaran Sewa Diterima</p>
                          <p className="text-[11px] text-slate-500">Kamar A-03 • Andi Pratama</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-600">+Rp 1.800.000</span>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Link href="/admin/dashboard" className="skeu-button text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1">
                        <span>Buka Dashboard Penuh</span>
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Fitur Section */}
          <section id="fitur" className="py-20 bg-surface-container-low border-y border-white/50">
            <div className="max-w-7xl mx-auto px-6">
              <div className="text-center max-w-3xl mx-auto mb-16">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Fitur Unggulan</span>
                <h2 className="text-3xl font-bold text-on-surface mt-2 mb-4">Semua Kebutuhan Bisnis Kost dalam Satu Genggaman</h2>
                <p className="text-on-surface-variant text-base">Dirancang khusus untuk memudahkan operasional harian kost Anda mulai dari check-in hingga laporan laba rugi.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Feature 1 */}
                <div className="skeu-card p-6 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                      <span className="material-symbols-outlined text-[26px]">bed</span>
                    </div>
                    <h3 className="text-lg font-bold text-on-surface mb-2">Manajemen Kamar</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      Pantau ketersediaan kamar, tipe kamar, fasilitas, dan status perawatan secara visual dan realtime.
                    </p>
                  </div>
                  <Link href="/admin/kamar" className="text-xs font-bold text-primary mt-6 flex items-center gap-1 hover:underline">
                    Kelola Kamar <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </Link>
                </div>

                {/* Feature 2 */}
                <div className="skeu-card p-6 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5">
                      <span className="material-symbols-outlined text-[26px]">receipt_long</span>
                    </div>
                    <h3 className="text-lg font-bold text-on-surface mb-2">Billing & Invoice</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      Kirim tagihan otomatis via WhatsApp & Email dengan QRIS dan Payment Gateway Midtrans.
                    </p>
                  </div>
                  <Link href="/admin/tagihan" className="text-xs font-bold text-primary mt-6 flex items-center gap-1 hover:underline">
                    Lihat Tagihan <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </Link>
                </div>

                {/* Feature 3 */}
                <div className="skeu-card p-6 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-5">
                      <span className="material-symbols-outlined text-[26px]">query_stats</span>
                    </div>
                    <h3 className="text-lg font-bold text-on-surface mb-2">Laporan Keuangan</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      Laporan pemasukan, pengeluaran, laba rugi, dan tren okupansi otomatis tanpa perlu spreadsheet manual.
                    </p>
                  </div>
                  <Link href="/admin/laporan" className="text-xs font-bold text-primary mt-6 flex items-center gap-1 hover:underline">
                    Lihat Laporan <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </Link>
                </div>

                {/* Feature 4 */}
                <div className="skeu-card p-6 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-5">
                      <span className="material-symbols-outlined text-[26px]">public</span>
                    </div>
                    <h3 className="text-lg font-bold text-on-surface mb-2">Website Kost Otomatis</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      Dapatkan website publik gratis dengan subdomain kustom (namakost.kostku.id) untuk promosi & booking.
                    </p>
                  </div>
                  <Link href="/admin/website" className="text-xs font-bold text-primary mt-6 flex items-center gap-1 hover:underline">
                    Kustomisasi Web <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Pricing Section */}
          <section id="harga" className="py-20 bg-surface">
            <div className="max-w-7xl mx-auto px-6">
              <div className="text-center max-w-2xl mx-auto mb-16">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Pilihan Paket</span>
                <h2 className="text-3xl font-bold text-on-surface mt-2 mb-4">Investasi Terjangkau untuk Bisnis Kost Anda</h2>
                <p className="text-on-surface-variant text-base">Pilih paket langganan yang sesuai dengan jumlah properti dan kamar yang Anda miliki.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
                {/* Starter */}
                <div className="skeu-card p-8 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-on-surface">Paket Starter</h3>
                    <p className="text-xs text-on-surface-variant mt-1 mb-6">Cocok untuk pemilik 1 properti kost kecil</p>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-3xl font-bold text-on-surface">Rp 99.000</span>
                      <span className="text-xs text-on-surface-variant">/ bulan</span>
                    </div>
                    <ul className="space-y-3 text-xs text-on-surface-variant">
                      <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span> Hingga 15 Kamar</li>
                      <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span> 1 Properti Kost</li>
                      <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span> Manajemen Penyewa & Kamar</li>
                      <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span> Subdomain Gratis</li>
                    </ul>
                  </div>
                  <Link
                    href="/onboarding/step-2?plan=starter"
                    className="skeu-button-secondary text-center block w-full py-3 rounded-xl font-semibold text-xs mt-8"
                  >
                    Pilih Paket Starter
                  </Link>
                </div>

                {/* Pro (Highlighted) */}
                <div className="skeu-card p-8 rounded-2xl flex flex-col justify-between relative border-2 border-primary shadow-xl">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Paling Populer
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-on-surface">Paket Pro</h3>
                    <p className="text-xs text-on-surface-variant mt-1 mb-6">Paling banyak dipilih pemilik kost menengah</p>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-4xl font-bold text-primary">Rp 199.000</span>
                      <span className="text-xs text-on-surface-variant">/ bulan</span>
                    </div>
                    <ul className="space-y-3 text-xs text-on-surface">
                      <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span> Hingga 50 Kamar</li>
                      <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span> Hingga 3 Properti Kost</li>
                      <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span> Tagihan WhatsApp Otomatis</li>
                      <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span> Integrasi Payment Gateway Midtrans</li>
                      <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span> Laporan Arus Kas & Ekspor Excel</li>
                    </ul>
                  </div>
                  <Link
                    href="/onboarding/step-2?plan=pro"
                    className="skeu-button text-center block w-full py-3.5 rounded-xl font-bold text-xs mt-8 shadow-md"
                  >
                    Pilih Paket Pro
                  </Link>
                </div>

                {/* Enterprise */}
                <div className="skeu-card p-8 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-on-surface">Paket Enterprise</h3>
                    <p className="text-xs text-on-surface-variant mt-1 mb-6">Untuk juragan kost & manajemen multi-cabang</p>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-3xl font-bold text-on-surface">Rp 399.000</span>
                      <span className="text-xs text-on-surface-variant">/ bulan</span>
                    </div>
                    <ul className="space-y-3 text-xs text-on-surface-variant">
                      <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span> Kamar & Properti Tanpa Batas</li>
                      <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span> Multi-User Admin & Operator</li>
                      <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span> Domain Kustom Penuh (.com / .id)</li>
                      <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span> Dashboard Multi-Kost Terpadu</li>
                      <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span> Dedicated Account Manager</li>
                    </ul>
                  </div>
                  <Link
                    href="/onboarding/step-2?plan=enterprise"
                    className="skeu-button-secondary text-center block w-full py-3 rounded-xl font-semibold text-xs mt-8"
                  >
                    Pilih Paket Enterprise
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Banner Section */}
          <section className="py-16 bg-surface">
            <div className="max-w-7xl mx-auto px-6">
              <div className="skeu-button rounded-2xl p-8 sm:p-14 text-center relative overflow-hidden shadow-2xl">
                <div className="relative z-10 max-w-2xl mx-auto">
                  <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                    Siap Mengubah Cara Anda Mengelola Bisnis Kost?
                  </h2>
                  <p className="text-white/90 text-sm sm:text-base mb-8">
                    Bergabunglah sekarang dan nikmati kemudahan otomatisasi bisnis kost Anda hari ini.
                  </p>
                  <div className="flex flex-wrap justify-center gap-4">
                    <Link
                      href="/onboarding/step-1"
                      className="skeu-pill text-primary px-8 py-4 rounded-xl text-sm font-bold shadow-lg hover:opacity-95"
                    >
                      Daftar Gratis Sekarang
                    </Link>
                    <Link
                      href="/admin/dashboard"
                      className="skeu-button-secondary text-on-surface px-8 py-4 rounded-xl text-sm font-bold shadow-md"
                    >
                      Coba Demo Langsung
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

