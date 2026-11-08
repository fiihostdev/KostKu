"use client";

import { useState } from "react";

interface Tenant {
  id: string;
  nama: string;
  phone: string;
  kamar: string;
  mulaiSewa: string;
  akhirSewa: string;
  statusBayar: "Lunas" | "Jatuh Tempo" | "Tertunggak";
  ktpVerified: boolean;
}

const initialTenants: Tenant[] = [
  { id: "1", nama: "Dimas Anggara", phone: "0812-3456-7890", kamar: "Kamar A-01", mulaiSewa: "01 Jan 2026", akhirSewa: "31 Des 2026", statusBayar: "Lunas", ktpVerified: true },
  { id: "2", nama: "Andi Pratama", phone: "0813-9876-5432", kamar: "Kamar A-03", mulaiSewa: "15 Feb 2026", akhirSewa: "14 Feb 2027", statusBayar: "Lunas", ktpVerified: true },
  { id: "3", nama: "Rian Hidayat", phone: "0821-1122-3344", kamar: "Kamar A-04", mulaiSewa: "01 Mar 2026", akhirSewa: "01 Mar 2027", statusBayar: "Jatuh Tempo", ktpVerified: true },
  { id: "4", nama: "Fajar Nugraha", phone: "0857-4433-2211", kamar: "Kamar B-01", mulaiSewa: "10 Jun 2026", akhirSewa: "10 Des 2026", statusBayar: "Tertunggak", ktpVerified: false },
  { id: "5", nama: "Budi Santoso", phone: "0819-7788-9900", kamar: "Kamar B-02", mulaiSewa: "01 Jul 2026", akhirSewa: "31 Jul 2027", statusBayar: "Lunas", ktpVerified: true },
  { id: "6", nama: "Siti Rahmawati", phone: "0878-5566-7788", kamar: "Kamar B-04", mulaiSewa: "01 Mei 2026", akhirSewa: "30 Apr 2027", statusBayar: "Lunas", ktpVerified: true },
];

export default function DataPenyewaPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Semua");
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTenant, setNewTenant] = useState({
    nama: "",
    phone: "",
    kamar: "Kamar A-02",
    mulaiSewa: "01 Des 2026",
    akhirSewa: "01 Des 2027",
  });

  const filteredTenants = tenants.filter((t) => {
    const matchSearch =
      t.nama.toLowerCase().includes(search.toLowerCase()) ||
      t.kamar.toLowerCase().includes(search.toLowerCase()) ||
      t.phone.includes(search);
    const matchFilter = filter === "Semua" || t.statusBayar === filter;
    return matchSearch && matchFilter;
  });

  const handleAddTenant = (e: React.FormEvent) => {
    e.preventDefault();
    const created: Tenant = {
      id: Date.now().toString(),
      nama: newTenant.nama,
      phone: newTenant.phone,
      kamar: newTenant.kamar,
      mulaiSewa: newTenant.mulaiSewa,
      akhirSewa: newTenant.akhirSewa,
      statusBayar: "Lunas",
      ktpVerified: true,
    };
    setTenants([created, ...tenants]);
    setShowAddModal(false);
    setNewTenant({ nama: "", phone: "", kamar: "Kamar A-02", mulaiSewa: "01 Des 2026", akhirSewa: "01 Des 2027" });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-primary uppercase">Modul Pengelola</span>
            <span className="text-slate-400">•</span>
            <span className="text-[11px] text-slate-500 font-semibold">Penyewa Kost</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Data Penyewa</h1>
          <p className="text-xs text-slate-500 mt-1">Kelola data identitas, masa aktif kontrak, dan kontak WhatsApp penghuni kost.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="skeu-button text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 self-start sm:self-auto shadow-md"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span>Tambah Penyewa Baru</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="skeu-card p-4 rounded-xl">
          <span className="text-xs text-slate-500 font-medium">Total Penyewa Aktif</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{tenants.length} Orang</div>
        </div>
        <div className="skeu-card p-4 rounded-xl">
          <span className="text-xs text-emerald-600 font-medium">Pembayaran Lunas</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {tenants.filter((t) => t.statusBayar === "Lunas").length} Orang
          </div>
        </div>
        <div className="skeu-card p-4 rounded-xl">
          <span className="text-xs text-amber-600 font-medium">Jatuh Tempo (H-7)</span>
          <div className="text-2xl font-bold text-amber-700 mt-1">
            {tenants.filter((t) => t.statusBayar === "Jatuh Tempo").length} Orang
          </div>
        </div>
        <div className="skeu-card p-4 rounded-xl">
          <span className="text-xs text-red-600 font-medium">Tertunggak</span>
          <div className="text-2xl font-bold text-red-700 mt-1">
            {tenants.filter((t) => t.statusBayar === "Tertunggak").length} Orang
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="skeu-card p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined text-[18px] text-slate-400 absolute left-3 top-2.5">search</span>
          <input
            type="text"
            placeholder="Cari nama, kamar, no hp..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl skeu-inset text-xs text-slate-800 outline-none"
          />
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          {["Semua", "Lunas", "Jatuh Tempo", "Tertunggak"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === s
                  ? "skeu-button text-white shadow-sm"
                  : "skeu-button-secondary text-slate-600 hover:text-slate-900"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Tenants Table */}
      <div className="skeu-card rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/60 bg-white/40 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Nama Penyewa</th>
                <th className="py-3 px-4">Kamar</th>
                <th className="py-3 px-4">No. WhatsApp</th>
                <th className="py-3 px-4">Periode Kontrak</th>
                <th className="py-3 px-4">Status Tagihan</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/40">
              {filteredTenants.map((t) => (
                <tr key={t.id} className="hover:bg-white/50 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                        {t.nama.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">{t.nama}</span>
                        {t.ktpVerified && (
                          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[12px]">verified</span> KTP Terverifikasi
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">{t.kamar}</td>
                  <td className="py-3.5 px-4 text-slate-600">{t.phone}</td>
                  <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                    {t.mulaiSewa} — {t.akhirSewa}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        t.statusBayar === "Lunas"
                          ? "bg-emerald-100 text-emerald-800"
                          : t.statusBayar === "Jatuh Tempo"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {t.statusBayar}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <button
                      onClick={() => alert(`Mengirim pesan WhatsApp ke ${t.phone}...`)}
                      className="p-1.5 rounded-lg skeu-card text-emerald-600 hover:text-emerald-800 inline-flex items-center"
                      title="Kirim WhatsApp"
                    >
                      <span className="material-symbols-outlined text-[16px]">chat</span>
                    </button>
                    <button
                      onClick={() => alert(`Buka data profil penyewa ${t.nama}`)}
                      className="p-1.5 rounded-lg skeu-card text-slate-600 hover:text-slate-900 inline-flex items-center"
                      title="Lihat Detail"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Tenant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="skeu-card p-6 rounded-2xl max-w-md w-full relative shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/60">
              <h3 className="font-bold text-base text-slate-900">Tambah Data Penyewa Baru</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddTenant} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Lengkap</label>
                <input
                  required
                  type="text"
                  placeholder="Nama sesuai KTP"
                  value={newTenant.nama}
                  onChange={(e) => setNewTenant({ ...newTenant, nama: e.target.value })}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">No. WhatsApp</label>
                  <input
                    required
                    type="text"
                    placeholder="08123456789"
                    value={newTenant.phone}
                    onChange={(e) => setNewTenant({ ...newTenant, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pilih Kamar</label>
                  <input
                    type="text"
                    placeholder="Contoh: Kamar A-02"
                    value={newTenant.kamar}
                    onChange={(e) => setNewTenant({ ...newTenant, kamar: e.target.value })}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal Mulai Sewa</label>
                  <input
                    type="text"
                    value={newTenant.mulaiSewa}
                    onChange={(e) => setNewTenant({ ...newTenant, mulaiSewa: e.target.value })}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal Berakhir</label>
                  <input
                    type="text"
                    value={newTenant.akhirSewa}
                    onChange={(e) => setNewTenant({ ...newTenant, akhirSewa: e.target.value })}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="skeu-button-secondary px-4 py-2 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="skeu-button px-5 py-2 rounded-xl font-bold shadow-md"
                >
                  Simpan Penyewa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

