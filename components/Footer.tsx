import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-surface-container-low py-12 border-t border-white/60">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px] drop-shadow-sm">apartment</span>
            <span className="text-xl text-primary font-bold">KOSTKU</span>
          </div>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Platform manajemen kos dan properti modern untuk kemudahan dan efisiensi bisnis Anda.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-bold text-on-surface mb-3 uppercase tracking-wider">Navigasi</h4>
          <ul className="flex flex-col gap-2 text-sm text-on-surface-variant">
            <li><Link className="hover:text-primary transition-colors" href="/">Beranda</Link></li>
            <li><a className="hover:text-primary transition-colors" href="#fitur">Fitur Utama</a></li>
            <li><a className="hover:text-primary transition-colors" href="#harga">Pilihan Paket</a></li>
            <li><Link className="hover:text-primary transition-colors" href="/admin/dashboard">Demo Dashboard</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-bold text-on-surface mb-3 uppercase tracking-wider">Sistem & Modul</h4>
          <ul className="flex flex-col gap-2 text-sm text-on-surface-variant">
            <li><Link className="hover:text-primary transition-colors" href="/admin/kamar">Manajemen Kamar</Link></li>
            <li><Link className="hover:text-primary transition-colors" href="/admin/penyewa">Data Penyewa</Link></li>
            <li><Link className="hover:text-primary transition-colors" href="/admin/tagihan">Billing & Tagihan</Link></li>
            <li><Link className="hover:text-primary transition-colors" href="/admin/pengaturan">Integrasi Midtrans</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-bold text-on-surface mb-3 uppercase tracking-wider">Kontak & Support</h4>
          <p className="text-sm text-on-surface-variant mb-1">support@kostku.id</p>
          <p className="text-sm text-on-surface-variant mb-3">+62 812-3456-7890</p>
          <div className="inline-block px-3 py-1 bg-white/70 rounded-full text-xs font-semibold text-primary border border-slate-200">
            Multi-Tenant SaaS v1.0
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-10 pt-6 border-t border-slate-300/40 text-center text-on-surface-variant text-xs">
        © 2026 KOSTKU Platform. Hak Cipta Dilindungi.
      </div>
    </footer>
  );
}

