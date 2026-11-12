"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

// ── Types ─────────────────────────────────────────────────────────────────────

interface KostTenant {
  id: string;
  user_id: string;
  email: string;
  nama: string;
  subdomain: string;
  paket: string;
  telepon: string;
  alamat: string;
  role: string;
  is_suspended: boolean;
  suspended_reason: string | null;
  max_kamar: number;
  platform_fee_pct: number;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
  totalKamar: number;
  kamarTerisi: number;
  totalPenyewa: number;
  pendapatanLunas: number;
  tagihanPending: number;
  okupansi: number;
}

interface PlatformPlan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  max_kamar: number;
  max_cabang: number;
  features: string[];
  is_active: boolean;
}

type ActiveTab = "overview" | "tenants" | "plans" | "settings";

const PLAN_COLORS: Record<string, string> = {
  starter: "bg-slate-100 text-slate-800",
  pro: "bg-primary/10 text-primary",
  enterprise: "bg-amber-100 text-amber-800",
};

// ── Main Component ─────────────────────────────────────────────────────────────

export default function SuperadminDashboardPage() {
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [tenants, setTenants] = useState<KostTenant[]>([]);
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [filterPaket, setFilterPaket] = useState("Semua");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Modal states
  const [editTenant, setEditTenant] = useState<KostTenant | null>(null);
  const [editPlan, setEditPlan] = useState<PlatformPlan | null>(null);
  const [showAddPlan, setShowAddPlan] = useState(false);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Load semua data platform ────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Ambil semua kost profiles (kecuali superadmin)
      const { data: profiles } = await supabase
        .from("kost_profiles")
        .select("*")
        .neq("role", "superadmin")
        .order("created_at", { ascending: false });

      if (profiles) {
        // 2. Enrich dengan data rooms, tenants, invoices
        const enriched: KostTenant[] = await Promise.all(
          profiles.map(async (p) => {
            const [roomsRes, tenantsRes, invoicesRes] = await Promise.all([
              supabase.from("rooms").select("status, harga").eq("kost_id", p.id),
              supabase.from("tenants").select("id").eq("kost_id", p.id),
              supabase.from("invoices").select("nominal, status").eq("kost_id", p.id),
            ]);

            const rooms = roomsRes.data || [];
            const totalKamar = rooms.length;
            const kamarTerisi = rooms.filter((r) => r.status === "Terisi").length;
            const totalPenyewa = tenantsRes.data?.length || 0;
            const invoices = invoicesRes.data || [];
            const pendapatanLunas = invoices
              .filter((i) => i.status === "Lunas")
              .reduce((s, i) => s + Number(i.nominal), 0);
            const tagihanPending = invoices
              .filter((i) => i.status !== "Lunas")
              .reduce((s, i) => s + Number(i.nominal), 0);
            const okupansi = totalKamar > 0 ? Math.round((kamarTerisi / totalKamar) * 100) : 0;

            // Ambil email user
            const { data: authUser } = await supabase.auth.admin
              ? { data: null }
              : { data: null };

            return {
              id: p.id,
              user_id: p.user_id,
              email: p.user_email || "",
              nama: p.nama,
              subdomain: p.subdomain,
              paket: p.paket || "Pro Plan",
              telepon: p.telepon || "",
              alamat: p.alamat || "",
              role: p.role || "admin",
              is_suspended: p.is_suspended || false,
              suspended_reason: p.suspended_reason || null,
              max_kamar: p.max_kamar || 50,
              platform_fee_pct: p.platform_fee_pct || 0,
              expires_at: p.expires_at || null,
              notes: p.notes || null,
              created_at: p.created_at,
              totalKamar,
              kamarTerisi,
              totalPenyewa,
              pendapatanLunas,
              tagihanPending,
              okupansi,
            };
          })
        );
        setTenants(enriched);
      }

      // 3. Ambil platform plans
      const { data: plansData } = await supabase
        .from("platform_plans")
        .select("*")
        .order("price_monthly", { ascending: true });
      setPlans(plansData || []);

    } catch (err) {
      console.error("loadData error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Suspend / Aktifkan tenant ──────────────────────────────────────────────
  const toggleSuspend = async (tenant: KostTenant) => {
    const reason = tenant.is_suspended
      ? null
      : prompt(`Alasan suspend kost "${tenant.nama}":`);

    if (!tenant.is_suspended && reason === null) return; // user cancel

    const { error } = await supabase
      .from("kost_profiles")
      .update({
        is_suspended: !tenant.is_suspended,
        suspended_reason: reason,
      })
      .eq("id", tenant.id);

    if (error) {
      showToast("error", "Gagal mengubah status: " + error.message);
    } else {
      showToast("success", tenant.is_suspended ? `Kost "${tenant.nama}" diaktifkan.` : `Kost "${tenant.nama}" disuspend.`);
      loadData();
    }
  };

  // ── Update tenant (paket, max_kamar, harga, notes) ─────────────────────────
  const saveTenantEdit = async () => {
    if (!editTenant) return;
    const { error } = await supabase
      .from("kost_profiles")
      .update({
        paket: editTenant.paket,
        max_kamar: editTenant.max_kamar,
        platform_fee_pct: editTenant.platform_fee_pct,
        expires_at: editTenant.expires_at,
        notes: editTenant.notes,
        telepon: editTenant.telepon,
        alamat: editTenant.alamat,
      })
      .eq("id", editTenant.id);

    if (error) {
      showToast("error", "Gagal menyimpan: " + error.message);
    } else {
      showToast("success", "Data kost berhasil diperbarui!");
      setEditTenant(null);
      loadData();
    }
  };

  // ── Save plan ──────────────────────────────────────────────────────────────
  const savePlan = async (plan: Partial<PlatformPlan>, isNew: boolean) => {
    const { error } = isNew
      ? await supabase.from("platform_plans").insert(plan)
      : await supabase.from("platform_plans").update(plan).eq("id", plan.id!);

    if (error) {
      showToast("error", "Gagal menyimpan paket: " + error.message);
    } else {
      showToast("success", isNew ? "Paket baru ditambahkan!" : "Paket berhasil diperbarui!");
      setEditPlan(null);
      setShowAddPlan(false);
      loadData();
    }
  };

  // ── Hapus tenant ────────────────────────────────────────────────────────────
  const deleteTenant = async (tenant: KostTenant) => {
    if (!confirm(`HAPUS PERMANEN kost "${tenant.nama}"? Data kamar, penyewa, dan invoice akan ikut terhapus!`)) return;
    const { error } = await supabase.from("kost_profiles").delete().eq("id", tenant.id);
    if (error) showToast("error", "Gagal hapus: " + error.message);
    else { showToast("success", "Kost berhasil dihapus."); loadData(); }
  };

  // ── Derived stats ──────────────────────────────────────────────────────────
  const activeTenants = tenants.filter((t) => !t.is_suspended);
  const suspendedTenants = tenants.filter((t) => t.is_suspended);
  const totalKamar = tenants.reduce((a, b) => a + b.totalKamar, 0);
  const totalTerisi = tenants.reduce((a, b) => a + b.kamarTerisi, 0);
  const totalPendapatan = tenants.reduce((a, b) => a + b.pendapatanLunas, 0);
  const totalPenyewa = tenants.reduce((a, b) => a + b.totalPenyewa, 0);
  const avgOkupansi = totalKamar > 0 ? Math.round((totalTerisi / totalKamar) * 100) : 0;

  const filtered = tenants.filter((t) => {
    const matchSearch =
      t.nama.toLowerCase().includes(searchQ.toLowerCase()) ||
      t.subdomain.toLowerCase().includes(searchQ.toLowerCase()) ||
      t.email.toLowerCase().includes(searchQ.toLowerCase());
    const matchPaket = filterPaket === "Semua" || t.paket.toLowerCase().includes(filterPaket.toLowerCase());
    const matchStatus =
      filterStatus === "Semua" ||
      (filterStatus === "Aktif" && !t.is_suspended) ||
      (filterStatus === "Suspended" && t.is_suspended);
    return matchSearch && matchPaket && matchStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="skeu-card p-8 rounded-2xl text-center space-y-3">
          <span className="material-symbols-outlined text-primary text-[40px] animate-spin block">sync</span>
          <p className="text-xs font-bold text-slate-600">Memuat data platform...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface p-4 sm:p-6 lg:p-8 space-y-6 max-w-full">

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-fadeInUp ${
          toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
        }`}>
          <span className="material-symbols-outlined text-[18px]">
            {toast.type === "success" ? "check_circle" : "error"}
          </span>
          {toast.msg}
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Platform Master Control</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Superadmin Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola seluruh {tenants.length} kost · {totalPenyewa} penyewa · platform KOSTKU
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadData}
            className="skeu-button-secondary text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Refresh
          </button>
          <Link
            href="/admin/dashboard"
            className="skeu-button-secondary text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">home_work</span>
            Panel Admin
          </Link>
        </div>
      </div>

      {/* ── KPI Row ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Kost", val: tenants.length.toString(), sub: `${activeTenants.length} Aktif`, color: "text-primary", icon: "domain" },
          { label: "Suspended", val: suspendedTenants.length.toString(), sub: "Perlu Perhatian", color: "text-red-600", icon: "block" },
          { label: "Total Kamar", val: totalKamar.toString(), sub: `${avgOkupansi}% Terisi`, color: "text-slate-900", icon: "bed" },
          { label: "Total Penyewa", val: totalPenyewa.toString(), sub: "Aktif Huni", color: "text-indigo-600", icon: "group" },
          { label: "Pendapatan", val: `Rp ${(totalPendapatan / 1000000).toFixed(1)} Jt`, sub: "Invoice Lunas", color: "text-emerald-700", icon: "payments" },
          { label: "Paket Aktif", val: plans.filter((p) => p.is_active).length.toString(), sub: "Platform Plans", color: "text-amber-600", icon: "sell" },
        ].map((s, i) => (
          <div key={i} className="skeu-card p-3 sm:p-4 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase truncate">{s.label}</span>
              <span className={`material-symbols-outlined text-[16px] opacity-40 ${s.color}`}>{s.icon}</span>
            </div>
            <div className={`text-lg sm:text-xl font-black ${s.color}`}>{s.val}</div>
            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-1 truncate block">{s.sub}</span>
          </div>
        ))}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-white/60">
        {[
          { id: "overview", label: "Overview", icon: "dashboard" },
          { id: "tenants", label: "Kelola Kost", icon: "domain" },
          { id: "plans", label: "Kelola Paket", icon: "sell" },
          { id: "settings", label: "Platform Settings", icon: "settings" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ActiveTab)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
              activeTab === tab.id ? "skeu-button text-white shadow-sm" : "skeu-card text-slate-600 hover:text-slate-900"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: OVERVIEW */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Revenue by Paket */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {["starter", "pro", "enterprise"].map((slug) => {
              const planTenants = tenants.filter((t) => t.paket.toLowerCase().includes(slug));
              const rev = planTenants.reduce((s, t) => s + t.pendapatanLunas, 0);
              const plan = plans.find((p) => p.slug === slug);
              return (
                <div key={slug} className="skeu-card p-5 rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${PLAN_COLORS[slug] || "bg-slate-100 text-slate-800"}`}>
                      {plan?.name || slug}
                    </span>
                    <span className="text-xs font-bold text-slate-500">{planTenants.length} kost</span>
                  </div>
                  <div className="text-xl font-black text-slate-900">
                    Rp {(rev / 1000000).toFixed(2)} Jt
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Rp {plan?.price_monthly.toLocaleString("id-ID") || "-"}/bln per kost
                  </div>
                  <div className="mt-3 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{ width: `${tenants.length > 0 ? (planTenants.length / tenants.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Tenants */}
          <div className="skeu-card p-5 rounded-2xl">
            <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">group_add</span>
              Kost Terbaru Bergabung
            </h3>
            <div className="space-y-3">
              {tenants.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-xl skeu-inset">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0">
                      {t.nama.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{t.nama}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{t.subdomain}.{process.env.NEXT_PUBLIC_APP_DOMAIN || "manajementkost.my.id"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PLAN_COLORS[t.paket.toLowerCase().replace("paket ", "")] || "bg-slate-100 text-slate-800"}`}>
                      {t.paket}
                    </span>
                    {t.is_suspended && (
                      <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Suspended</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: KELOLA KOST (TENANTS) */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "tenants" && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
              <input
                type="text"
                placeholder="Cari nama, subdomain, email..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl skeu-inset text-slate-800 outline-none"
              />
            </div>
            <div className="flex gap-2">
              {["Semua", "Starter", "Pro", "Enterprise"].map((p) => (
                <button key={p} onClick={() => setFilterPaket(p)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${filterPaket === p ? "skeu-button" : "skeu-card text-slate-600"}`}>
                  {p}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {["Semua", "Aktif", "Suspended"].map((s) => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${filterStatus === s ? "skeu-button" : "skeu-card text-slate-600"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium">{filtered.length} kost ditemukan</div>

          {/* Tenant Table */}
          <div className="skeu-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[900px]">
                <thead>
                  <tr className="border-b border-white/60 bg-white/40 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Kost</th>
                    <th className="py-3 px-4">Subdomain</th>
                    <th className="py-3 px-4">Paket</th>
                    <th className="py-3 px-4">Kamar</th>
                    <th className="py-3 px-4">Penyewa</th>
                    <th className="py-3 px-4">Pendapatan</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/40">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} className="py-10 text-center text-slate-400">Tidak ada data</td></tr>
                  ) : filtered.map((t) => (
                    <tr key={t.id} className={`hover:bg-white/50 transition-colors ${t.is_suspended ? "opacity-60" : ""}`}>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{t.nama}</div>
                        <div className="text-[10px] text-slate-500">{t.email || t.telepon || "—"}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-primary text-[11px]">
                        <a href={`https://${t.subdomain}.${process.env.NEXT_PUBLIC_APP_DOMAIN || "manajementkost.my.id"}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {t.subdomain}.{process.env.NEXT_PUBLIC_APP_DOMAIN || "manajementkost.my.id"}
                        </a>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PLAN_COLORS[t.paket.toLowerCase().replace("paket ", "")] || "bg-slate-100 text-slate-800"}`}>
                          {t.paket}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{t.kamarTerisi}/{t.totalKamar}</div>
                        <div className="w-16 bg-slate-200 h-1 rounded-full mt-1 overflow-hidden">
                          <div className="bg-primary h-full rounded-full" style={{ width: `${t.okupansi}%` }} />
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{t.totalPenyewa}</td>
                      <td className="py-3 px-4 font-black text-primary">
                        Rp {(t.pendapatanLunas / 1000000).toFixed(1)} Jt
                        {t.tagihanPending > 0 && (
                          <div className="text-[10px] text-amber-600 font-bold">+Rp {(t.tagihanPending / 1000000).toFixed(1)} Jt pending</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {t.is_suspended ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">Suspended</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">Aktif</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit */}
                          <button
                            onClick={() => setEditTenant({ ...t })}
                            className="p-1.5 rounded-lg skeu-card text-primary hover:text-primary/80"
                            title="Edit"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          {/* Suspend/Aktif */}
                          <button
                            onClick={() => toggleSuspend(t)}
                            className={`p-1.5 rounded-lg skeu-card ${t.is_suspended ? "text-emerald-600" : "text-amber-600"}`}
                            title={t.is_suspended ? "Aktifkan" : "Suspend"}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {t.is_suspended ? "play_circle" : "pause_circle"}
                            </span>
                          </button>
                          {/* Website */}
                          <a
                            href={`https://${t.subdomain}.${process.env.NEXT_PUBLIC_APP_DOMAIN || "manajementkost.my.id"}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg skeu-card text-slate-500 hover:text-slate-700"
                            title="Buka Website"
                          >
                            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                          </a>
                          {/* Hapus */}
                          <button
                            onClick={() => deleteTenant(t)}
                            className="p-1.5 rounded-lg skeu-card text-red-500 hover:text-red-700"
                            title="Hapus Permanen"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: KELOLA PAKET */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "plans" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-base">Platform Pricing Plans</h2>
            <button
              onClick={() => setShowAddPlan(true)}
              className="skeu-button text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              Tambah Paket
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((plan) => {
              const countTenants = tenants.filter((t) => t.paket.toLowerCase().includes(plan.slug)).length;
              return (
                <div key={plan.id} className={`skeu-card p-6 rounded-2xl flex flex-col justify-between ${!plan.is_active ? "opacity-60" : ""}`}>
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-black text-slate-900 text-base">{plan.name}</h3>
                        <p className="text-[11px] text-slate-500 font-mono">{plan.slug}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${plan.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
                        {plan.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                    <div className="text-2xl font-black text-primary mb-1">
                      Rp {plan.price_monthly.toLocaleString("id-ID")}
                      <span className="text-xs font-normal text-slate-500">/bln</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 my-4 text-xs">
                      <div className="skeu-inset p-2 rounded-lg text-center">
                        <span className="text-[10px] text-slate-500 block">Max Kamar</span>
                        <span className="font-black text-slate-900">{plan.max_kamar === 999 ? "∞" : plan.max_kamar}</span>
                      </div>
                      <div className="skeu-inset p-2 rounded-lg text-center">
                        <span className="text-[10px] text-slate-500 block">Max Cabang</span>
                        <span className="font-black text-slate-900">{plan.max_cabang === 99 ? "∞" : plan.max_cabang}</span>
                      </div>
                    </div>
                    <ul className="space-y-1.5 mb-4">
                      {(plan.features || []).map((f, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-[11px] text-slate-700">
                          <span className="material-symbols-outlined text-emerald-600 text-[14px]">check_circle</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="text-[11px] text-slate-500 skeu-inset p-2 rounded-lg text-center">
                      <strong className="text-primary">{countTenants}</strong> kost menggunakan paket ini
                    </div>
                  </div>
                  <button
                    onClick={() => setEditPlan({ ...plan })}
                    className="mt-4 skeu-button-secondary text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 w-full"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    Edit Paket
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: PLATFORM SETTINGS */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "settings" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="skeu-card p-6 rounded-2xl space-y-4 text-xs">
            <h3 className="font-bold text-slate-900 text-sm pb-3 border-b border-white/60 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">settings</span>
              Platform Configuration
            </h3>
            {[
              { label: "Platform Name", val: "KOSTKU SaaS" },
              { label: "Main Domain", val: process.env.NEXT_PUBLIC_APP_DOMAIN || "manajementkost.my.id" },
              { label: "Supabase Project", val: "mmcgxkjbmdfrgkhrajuc" },
              { label: "Bot URL", val: "wiya3dh8uopgirnwkgmuolug.fiihosting.my.id" },
              { label: "Total Registered", val: `${tenants.length} kost accounts` },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg skeu-inset">
                <span className="text-slate-500 font-bold">{item.label}</span>
                <span className="font-mono font-bold text-slate-800 text-[11px]">{item.val}</span>
              </div>
            ))}
          </div>

          <div className="skeu-card p-6 rounded-2xl space-y-4 text-xs">
            <h3 className="font-bold text-slate-900 text-sm pb-3 border-b border-white/60 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">analytics</span>
              Platform Statistics
            </h3>
            {[
              { label: "Total Kost Aktif", val: activeTenants.length.toString(), icon: "domain" },
              { label: "Total Kamar Platform", val: totalKamar.toString(), icon: "bed" },
              { label: "Total Penyewa Platform", val: totalPenyewa.toString(), icon: "group" },
              { label: "Platform Revenue (All)", val: `Rp ${(totalPendapatan / 1000000).toFixed(2)} Jt`, icon: "payments" },
              { label: "Avg Okupansi", val: `${avgOkupansi}%`, icon: "percent" },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg skeu-inset">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[16px]">{s.icon}</span>
                  <span className="text-slate-600 font-bold">{s.label}</span>
                </div>
                <span className="font-black text-slate-900">{s.val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: Edit Tenant */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {editTenant && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="skeu-card p-6 rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/60">
              <h3 className="font-black text-slate-900">Edit Kost: {editTenant.nama}</h3>
              <button onClick={() => setEditTenant(null)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Paket Langganan</label>
                <select
                  value={editTenant.paket}
                  onChange={(e) => setEditTenant({ ...editTenant, paket: e.target.value })}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-bold cursor-pointer"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.name}>{p.name} — Rp {p.price_monthly.toLocaleString("id-ID")}/bln</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Max Kamar</label>
                  <input
                    type="number"
                    value={editTenant.max_kamar}
                    onChange={(e) => setEditTenant({ ...editTenant, max_kamar: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Platform Fee (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    step="0.5"
                    value={editTenant.platform_fee_pct}
                    onChange={(e) => setEditTenant({ ...editTenant, platform_fee_pct: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tanggal Kadaluarsa Paket</label>
                <input
                  type="date"
                  value={editTenant.expires_at ? editTenant.expires_at.split("T")[0] : ""}
                  onChange={(e) => setEditTenant({ ...editTenant, expires_at: e.target.value || null })}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">No. WhatsApp Admin</label>
                <input
                  type="text"
                  value={editTenant.telepon}
                  onChange={(e) => setEditTenant({ ...editTenant, telepon: e.target.value })}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Alamat Kost</label>
                <input
                  type="text"
                  value={editTenant.alamat}
                  onChange={(e) => setEditTenant({ ...editTenant, alamat: e.target.value })}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan Internal (Superadmin)</label>
                <textarea
                  rows={2}
                  value={editTenant.notes || ""}
                  onChange={(e) => setEditTenant({ ...editTenant, notes: e.target.value })}
                  placeholder="Catatan internal tentang kost ini..."
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
                />
              </div>

              {/* Info Box */}
              <div className="skeu-inset p-3 rounded-xl space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subdomain</span>
                  <span className="font-mono font-bold text-primary">{editTenant?.subdomain}.{process.env.NEXT_PUBLIC_APP_DOMAIN || "manajementkost.my.id"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Kamar</span>
                  <span className="font-bold text-slate-800">{editTenant.totalKamar} kamar</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pendapatan</span>
                  <span className="font-bold text-emerald-700">Rp {editTenant.pendapatanLunas.toLocaleString("id-ID")}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setEditTenant(null)} className="skeu-button-secondary px-4 py-2 rounded-xl font-bold">
                  Batal
                </button>
                <button onClick={saveTenantEdit} className="skeu-button px-5 py-2 rounded-xl font-bold shadow-md">
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: Edit/Tambah Plan */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {(editPlan || showAddPlan) && (
        <PlanModal
          plan={editPlan}
          onClose={() => { setEditPlan(null); setShowAddPlan(false); }}
          onSave={(plan) => savePlan(plan, !editPlan)}
        />
      )}
    </div>
  );
}

// ── Plan Modal Component ───────────────────────────────────────────────────────

function PlanModal({
  plan,
  onClose,
  onSave,
}: {
  plan: PlatformPlan | null;
  onClose: () => void;
  onSave: (plan: Partial<PlatformPlan>) => void;
}) {
  const [form, setForm] = useState<Partial<PlatformPlan>>(
    plan || { name: "", slug: "", price_monthly: 99000, max_kamar: 15, max_cabang: 1, features: [], is_active: true }
  );
  const [featInput, setFeatInput] = useState("");

  const addFeature = () => {
    if (!featInput.trim()) return;
    setForm({ ...form, features: [...(form.features || []), featInput.trim()] });
    setFeatInput("");
  };

  const removeFeature = (i: number) => {
    setForm({ ...form, features: (form.features || []).filter((_, idx) => idx !== i) });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="skeu-card p-6 rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/60">
          <h3 className="font-black text-slate-900">{plan ? "Edit Paket" : "Tambah Paket Baru"}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Nama Paket</label>
            <input type="text" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Paket Pro" className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-bold" />
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">Slug (ID unik)</label>
            <input type="text" value={form.slug || ""} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
              placeholder="pro" className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-mono" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Harga/Bln (Rp)</label>
              <input type="number" value={form.price_monthly || 0} onChange={(e) => setForm({ ...form, price_monthly: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-bold" />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Max Kamar</label>
              <input type="number" value={form.max_kamar || 0} onChange={(e) => setForm({ ...form, max_kamar: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none" />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Max Cabang</label>
              <input type="number" value={form.max_cabang || 1} onChange={(e) => setForm({ ...form, max_cabang: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none" />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Fitur</label>
            <div className="flex gap-2 mb-2">
              <input type="text" value={featInput} onChange={(e) => setFeatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }}
                placeholder="Tambah fitur..." className="flex-1 p-2 rounded-lg skeu-inset text-slate-800 outline-none" />
              <button onClick={addFeature} className="skeu-button px-3 py-2 rounded-lg font-bold text-[11px]">+</button>
            </div>
            <div className="space-y-1">
              {(form.features || []).map((f, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg skeu-inset">
                  <span className="text-slate-800">{f}</span>
                  <button onClick={() => removeFeature(i)} className="text-red-500 hover:text-red-700 ml-2">
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl skeu-inset">
            <span className="font-bold text-slate-700">Paket Aktif</span>
            <button onClick={() => setForm({ ...form, is_active: !form.is_active })}
              className={`w-10 h-5 rounded-full relative transition-all ${form.is_active ? "bg-emerald-500" : "bg-slate-300"}`}>
              <span className={`w-4 h-4 rounded-full bg-white shadow absolute top-0.5 transition-all ${form.is_active ? "right-0.5" : "left-0.5"}`}></span>
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="skeu-button-secondary px-4 py-2 rounded-xl font-bold text-xs">Batal</button>
            <button onClick={() => onSave(form)} className="skeu-button px-5 py-2 rounded-xl font-bold text-xs shadow-md">
              {plan ? "Simpan" : "Tambah Paket"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
