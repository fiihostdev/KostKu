"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

interface KostBranch {
  id: string;
  nama: string;
  subdomain: string;
  alamat: string;
  paket: string;
  telepon: string;
  user_email: string;
  totalKamar: number;
  kamarTerisi: number;
  pendapatan: number;
  okupansi: number;
}

export default function SuperadminDashboardPage() {
  const supabase = createClient();
  const [branches, setBranches] = useState<KostBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchQ, setSearchQ] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Ambil semua kost profiles
        const { data: profiles } = await supabase
          .from("kost_profiles")
          .select("id, nama, subdomain, alamat, paket, telepon")
          .order("created_at", { ascending: false });

        if (!profiles) { setLoading(false); return; }

        // Untuk setiap kost, ambil jumlah kamar dan invoice
        const enriched: KostBranch[] = await Promise.all(
          profiles.map(async (p) => {
            const { data: rooms } = await supabase
              .from("rooms")
              .select("status, harga")
              .eq("kost_id", p.id);

            const { data: invoices } = await supabase
              .from("invoices")
              .select("nominal, status")
              .eq("kost_id", p.id);

            const totalKamar = rooms?.length || 0;
            const kamarTerisi = rooms?.filter((r) => r.status === "Terisi").length || 0;
            const pendapatan = invoices
              ?.filter((i) => i.status === "Lunas")
              .reduce((s, i) => s + Number(i.nominal), 0) || 0;
            const okupansi = totalKamar > 0 ? Math.round((kamarTerisi / totalKamar) * 100) : 0;

            return {
              id: p.id,
              nama: p.nama,
              subdomain: p.subdomain,
              alamat: p.alamat || "-",
              paket: p.paket || "Pro Plan",
              telepon: p.telepon || "-",
              user_email: "",
              totalKamar,
              kamarTerisi,
              pendapatan,
              okupansi,
            };
          })
        );

        setBranches(enriched);
        setTotalUsers(profiles.length);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [supabase]);

  const filtered = branches.filter(
    (b) =>
      b.nama.toLowerCase().includes(searchQ.toLowerCase()) ||
      b.subdomain.toLowerCase().includes(searchQ.toLowerCase()) ||
      b.alamat.toLowerCase().includes(searchQ.toLowerCase())
  );

  const totalKamar = branches.reduce((a, b) => a + b.totalKamar, 0);
  const totalTerisi = branches.reduce((a, b) => a + b.kamarTerisi, 0);
  const totalPendapatan = branches.reduce((a, b) => a + b.pendapatan, 0);
  const avgOkupansi = totalKamar > 0 ? Math.round((totalTerisi / totalKamar) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="skeu-card p-8 rounded-2xl text-center space-y-3">
          <span className="material-symbols-outlined text-primary text-[40px] animate-spin block">sync</span>
          <p className="text-xs font-bold text-slate-600">Memuat data seluruh kost...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface p-4 sm:p-6 md:p-10 space-y-6 sm:space-y-8 max-w-full">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-primary uppercase">
              Master Command Center
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            Dashboard Superadmin
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kontrol & monitoring seluruh {branches.length} kost yang terdaftar di platform KOSTKU.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/admin/dashboard"
            className="skeu-button-secondary text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">home_work</span>
            <span>Panel Admin</span>
          </Link>
          <button
            onClick={() => alert("Export laporan konsolidasi seluruh kost...")}
            className="skeu-button text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Ekspor Global</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <div className="skeu-card p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase truncate">
            Total Kost Terdaftar
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            {branches.length}
            <span className="text-xs sm:text-sm font-normal text-slate-500 ml-1">Properti</span>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-white/60 text-[11px] text-slate-500">
            {totalUsers} Akun Admin Aktif
          </div>
        </div>

        <div className="skeu-card p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase truncate">
            Total Unit & Okupansi
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            {totalKamar}
            <span className="text-xs sm:text-sm font-normal text-slate-500 ml-1">Kamar</span>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-white/60 text-[11px]">
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              {avgOkupansi}% Terisi
            </span>
          </div>
        </div>

        <div className="skeu-card p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase truncate">
            Pendapatan Konsolidasi
          </span>
          <div className="text-2xl sm:text-3xl font-black text-primary mt-1">
            Rp {(totalPendapatan / 1000000).toFixed(1)} Jt
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-white/60 text-[11px] text-emerald-700 font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">trending_up</span>
            Total Invoice Lunas
          </div>
        </div>

        <div className="skeu-card p-4 sm:p-5 rounded-2xl border-2 border-primary/20 flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs text-primary font-bold uppercase truncate">
            Role Anda
          </span>
          <div className="text-xl sm:text-2xl font-black text-primary mt-1">
            SUPERADMIN
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-white/60 text-[11px] text-slate-500">
            Akses penuh ke seluruh platform
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
          search
        </span>
        <input
          type="text"
          placeholder="Cari nama kost, subdomain, lokasi..."
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl skeu-inset text-slate-800 outline-none"
        />
      </div>

      {/* Kost List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">domain</span>
            Daftar Seluruh Properti Kost
          </h2>
          <span className="text-xs text-slate-500 font-medium">{filtered.length} Properti</span>
        </div>

        {filtered.length === 0 ? (
          <div className="skeu-card p-12 rounded-2xl text-center">
            <span className="material-symbols-outlined text-slate-300 text-[56px] block mb-3">
              search_off
            </span>
            <p className="text-sm font-bold text-slate-500">
              {searchQ ? "Tidak ada kost yang cocok." : "Belum ada kost terdaftar."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
            {filtered.map((b) => (
              <div
                key={b.id}
                className="skeu-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between transition hover:-translate-y-1"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 pr-2">
                      <h3 className="font-bold text-slate-900 text-base truncate">{b.nama}</h3>
                      <p className="text-xs text-primary font-mono font-bold">
                        {b.subdomain}.kostku.id
                      </p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                        <span className="material-symbols-outlined text-[13px] shrink-0">location_on</span>
                        <span className="truncate">{b.alamat}</span>
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                      {b.paket}
                    </span>
                  </div>

                  <div className="space-y-2 my-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Okupansi</span>
                      <span className="font-bold text-slate-900">
                        {b.kamarTerisi}/{b.totalKamar} Kamar ({b.okupansi}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${b.okupansi}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs pt-1">
                      <span className="text-slate-500">Pendapatan (Lunas)</span>
                      <span className="font-black text-primary">
                        Rp {b.pendapatan.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/60 flex gap-2">
                  <Link
                    href={`/kost/${b.subdomain}`}
                    target="_blank"
                    className="flex-1 skeu-button-secondary text-xs font-bold px-3 py-2 rounded-xl flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    Website
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm(`Nonaktifkan kost "${b.nama}"? Akun admin tidak bisa login.`)) {
                        alert("Fitur suspend akan aktif setelah koneksi penuh.");
                      }
                    }}
                    className="px-3 py-2 rounded-xl skeu-card text-xs font-bold text-red-500 hover:text-red-700"
                  >
                    <span className="material-symbols-outlined text-[16px]">block</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
