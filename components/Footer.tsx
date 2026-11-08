import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-surface-container-low py-10 sm:py-14 border-t border-white/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg skeu-card flex items-center justify-center text-primary shadow-sm">
                <span className="material-symbols-outlined text-[20px]">apartment</span>
              </div>
              <span className="text-xl text-primary font-black tracking-tight">KOSTKU</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm">
              Platform all-in-one manajemen operasional kost, tagihan sewa otomatis WhatsApp, dan website profil properti modern.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 mb-3 uppercase tracking-wider">Navigasi Utama</h4>
            <ul className="flex flex-col gap-2 text-xs sm:text-sm text-slate-600">
              <li><Link className="hover:text-primary transition-colors" href="/">Beranda</Link></li>
              <li><a className="hover:text-primary transition-colors" href="#fitur">Fitur Unggulan</a></li>
              <li><a className="hover:text-primary transition-colors" href="#harga">Pilihan Paket</a></li>
              <li><Link className="hover:text-primary transition-colors" href="/admin/dashboard">Demo Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 mb-3 uppercase tracking-wider">Modul Operasional</h4>
            <ul className="flex flex-col gap-2 text-xs sm:text-sm text-slate-600">
              <li><Link className="hover:text-primary transition-colors" href="/admin/kamar">Manajemen Kamar</Link></li>
              <li><Link className="hover:text-primary transition-colors" href="/admin/penyewa">Data Penyewa</Link></li>
              <li><Link className="hover:text-primary transition-colors" href="/admin/tagihan">Billing & Invoice</Link></li>
              <li><Link className="hover:text-primary transition-colors" href="/admin/pengaturan">Integrasi Midtrans</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 mb-3 uppercase tracking-wider">Hubungi Kami</h4>
            <p className="text-xs sm:text-sm text-slate-600 mb-1">Email: support@kostku.id</p>
            <p className="text-xs sm:text-sm text-slate-600 mb-3">WhatsApp: +62 812-3456-7890</p>
            <span className="inline-block px-3 py-1 bg-white/80 rounded-full text-[11px] font-bold text-primary border border-slate-200">
              Multi-Tenant SaaS v1.0
            </span>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-slate-300/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-xs text-slate-500">
          <p>© 2026 KOSTKU Multi-Tenant SaaS Platform. Hak Cipta Dilindungi.</p>
          <div className="flex gap-4">
            <span className="hover:underline cursor-pointer">Kebijakan Privasi</span>
            <span className="hover:underline cursor-pointer">Syarat & Ketentuan</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
