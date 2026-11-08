import Link from "next/link";

export default function Navbar() {
  return (
    <header className="fixed top-0 w-full z-50 bg-surface/90 backdrop-blur-xl border-b border-white/50 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
      <div className="h-20 max-w-7xl mx-auto px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 drop-shadow-sm">
          <span className="material-symbols-outlined text-primary text-[28px] drop-shadow">apartment</span>
          <span className="text-2xl font-bold tracking-tight text-primary">KOSTKU</span>
        </Link>
        <nav className="hidden lg:flex items-center gap-6">
          <Link href="/" className="transition-colors px-3 py-1.5 rounded-lg skeu-inset text-primary font-bold text-sm">
            Beranda
          </Link>
          <a href="#fitur" className="text-sm text-on-surface-variant hover:text-on-surface transition-colors font-medium">
            Fitur
          </a>
          <a href="#cara-kerja" className="text-sm text-on-surface-variant hover:text-on-surface transition-colors font-medium">
            Cara Kerja
          </a>
          <a href="#harga" className="text-sm text-on-surface-variant hover:text-on-surface transition-colors font-medium">
            Harga
          </a>
          <a href="#faq" className="text-sm text-on-surface-variant hover:text-on-surface transition-colors font-medium">
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="skeu-button-secondary text-on-surface px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-surface-container-highest transition-colors shadow-sm hidden sm:inline-flex"
          >
            Dashboard Demo
          </Link>
          <Link
            href="/onboarding/step-1"
            className="skeu-button text-on-primary px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-95 transition-opacity shadow-md flex items-center gap-1.5"
          >
            <span>Daftar Gratis</span>
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

