"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { usePlanLimits } from "@/lib/use-plan-limits";
import { useKost } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { LockedFeatureCard } from "@/components/admin/PlanLimitBanner";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────
interface BranchStats {
  totalKamar:   number;
  kamarTerisi:  number;
  totalPenyewa: number;
  okupansi:     number;
}

interface Branch {
  id:         string;
  kost_id:    string;
  nama:       string;
  subdomain:  string;
  alamat:     string | null;
  telepon:    string | null;
  tagline:    string | null;
  is_active:  boolean;
  logo_url:   string | null;
  created_at: string;
  stats:      BranchStats;
}

interface BranchForm {
  nama:      string;
  subdomain: string;
  alamat:    string;
  telepon:   string;
  tagline:   string;
  logo_url:  string;
}

const emptyForm: BranchForm = { nama: "", subdomain: "", alamat: "", telepon: "", tagline: "", logo_url: "" };
const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "manajementkost.my.id";

// ── Skeleton loader ───────────────────────────────────────────────────────────
function BranchSkeleton() {
  return (
    <div className="skeu-card p-5 rounded-2xl space-y-3 animate-pulse">
      <div className="skeleton h-5 w-32 rounded-lg"></div>
      <div className="skeleton h-3 w-48 rounded-lg"></div>
      <div className="skeleton h-3 w-24 rounded-lg"></div>
      <div className="flex gap-2 pt-2">
        <div className="skeleton h-8 flex-1 rounded-xl"></div>
        <div className="skeleton h-8 w-10 rounded-xl"></div>
        <div className="skeleton h-8 w-10 rounded-xl"></div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CabangPage() {
  const planStatus = usePlanLimits();
  const toast      = useToast();
  const { setActiveBranch, activeBranchId } = useKost();
  const router     = useRouter();

  const [branches,    setBranches]    = useState<Branch[]>([]);
  const [limits,      setLimits]      = useState<{ maxCabang: number; hasMultiCabang: boolean } | null>(null);
  const [canAdd,      setCanAdd]      = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [filterStatus,setFilterStatus]= useState<"all"|"active"|"inactive">("all");

  // ── Add modal state ───────────────────────────────────────────────────────
  const [showAdd,      setShowAdd]      = useState(false);
  const [addForm,      setAddForm]      = useState<BranchForm>(emptyForm);
  const [addLoading,   setAddLoading]   = useState(false);
  const [subAvailable, setSubAvail]     = useState<boolean | null>(null);
  const [checkingSub,  setCheckingSub]  = useState(false);

  // ── Edit modal state ──────────────────────────────────────────────────────
  const [editTarget,   setEditTarget]   = useState<Branch | null>(null);
  const [editForm,     setEditForm]     = useState<BranchForm>(emptyForm);
  const [editLoading,  setEditLoading]  = useState(false);

  // ── Delete modal state ────────────────────────────────────────────────────
  const [delTarget,    setDelTarget]    = useState<Branch | null>(null);
  const [delConfText,  setDelConfText]  = useState("");
  const [delLoading,   setDelLoading]   = useState(false);

  // ── Detail drawer ─────────────────────────────────────────────────────────
  const [detailBranch, setDetailBranch] = useState<Branch | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/branches", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setBranches(data.branches || []);
        setLimits(data.limits);
        setCanAdd(data.canAddBranch);
      } else {
        toast.error("Gagal memuat cabang", data.error || "Periksa koneksi.");
      }
    } catch {
      toast.error("Gagal memuat cabang", "Periksa koneksi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  // ── Filtered branches ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return branches.filter((b) => {
      const matchSearch =
        !search ||
        b.nama.toLowerCase().includes(search.toLowerCase()) ||
        b.subdomain.toLowerCase().includes(search.toLowerCase()) ||
        (b.alamat || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "active"   &&  b.is_active) ||
        (filterStatus === "inactive" && !b.is_active);
      return matchSearch && matchStatus;
    });
  }, [branches, search, filterStatus]);

  // ── Subdomain check ───────────────────────────────────────────────────────
  const checkSubdomain = useCallback(async (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (clean.length < 3) { setSubAvail(null); return; }
    setCheckingSub(true);
    setSubAvail(null);
    try {
      const res  = await fetch(`/api/onboarding/check-subdomain?subdomain=${encodeURIComponent(clean)}`);
      const data = await res.json();
      setSubAvail(!!data.available);
    } catch {
      setSubAvail(null);
    } finally {
      setCheckingSub(false);
    }
  }, []);

  // ── Add cabang ────────────────────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subAvailable) { toast.error("Subdomain tidak tersedia", "Pilih subdomain lain."); return; }
    setAddLoading(true);
    try {
      const res = await fetch("/api/branches", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) { toast.error("Gagal menambahkan cabang", data.error); return; }
      toast.success("Cabang berhasil ditambahkan!", `${addForm.nama} sudah aktif dan dapat diakses.`);
      setShowAdd(false);
      setAddForm(emptyForm);
      setSubAvail(null);
      fetchBranches();
    } catch { toast.error("Gagal", "Periksa koneksi."); }
    finally { setAddLoading(false); }
  };

  // ── Edit cabang ───────────────────────────────────────────────────────────
  const openEdit = (b: Branch) => {
    setEditTarget(b);
    setEditForm({ nama: b.nama, subdomain: b.subdomain, alamat: b.alamat || "", telepon: b.telepon || "", tagline: b.tagline || "", logo_url: b.logo_url || "" });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditLoading(true);
    try {
      const res  = await fetch(`/api/branches/${editTarget.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: editForm.nama, alamat: editForm.alamat, telepon: editForm.telepon, tagline: editForm.tagline, logo_url: editForm.logo_url || null }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error("Gagal menyimpan", data.error); return; }
      toast.success("Cabang diperbarui!", `${editForm.nama} berhasil disimpan.`);
      setEditTarget(null);
      // Juga update detail drawer jika terbuka
      if (detailBranch?.id === editTarget.id) setDetailBranch(null);
      fetchBranches();
    } catch { toast.error("Gagal", "Periksa koneksi."); }
    finally { setEditLoading(false); }
  };

  // ── Toggle aktif/nonaktif ─────────────────────────────────────────────────
  const toggleActive = async (b: Branch) => {
    try {
      const res = await fetch(`/api/branches/${b.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !b.is_active }),
      });
      if (!res.ok) throw new Error();
      toast.success(b.is_active ? "Cabang dinonaktifkan" : "Cabang diaktifkan", `${b.nama} berhasil ${b.is_active ? "dinonaktifkan" : "diaktifkan"}.`);
      fetchBranches();
    } catch { toast.error("Gagal mengubah status", "Coba lagi."); }
  };

  // ── Hapus cabang ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!delTarget) return;
    setDelLoading(true);
    try {
      const res = await fetch(`/api/branches/${delTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Cabang dihapus", `${delTarget.nama} telah dihapus permanen.`);
      setDelTarget(null);
      setDelConfText("");
      if (detailBranch?.id === delTarget.id) setDetailBranch(null);
      fetchBranches();
    } catch { toast.error("Gagal menghapus", "Coba lagi."); }
    finally { setDelLoading(false); }
  };

  // ── Copy link ─────────────────────────────────────────────────────────────
  const copyLink = (b: Branch) => {
    const url = `https://${b.subdomain}.${APP_DOMAIN}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    toast.success("Link disalin!", url);
  };

  // ── Summary stats ─────────────────────────────────────────────────────────
  const activeBranches   = branches.filter((b) => b.is_active).length;
  const inactiveBranches = branches.filter((b) => !b.is_active).length;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Plan loading
  // ═══════════════════════════════════════════════════════════════════════════
  if (planStatus.loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-72 rounded-xl"></div>
        <div className="skeleton h-20 w-full rounded-2xl"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <BranchSkeleton /><BranchSkeleton /><BranchSkeleton />
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Paket tidak mendukung multi-cabang (Starter)
  // ═══════════════════════════════════════════════════════════════════════════
  if (!planStatus.limits || planStatus.limits.maxCabang <= 1) {
    return (
      <div className="space-y-6 sm:space-y-8 max-w-full">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-primary uppercase">Multi-Cabang</span>
            <span className="text-slate-400">•</span>
            <span className="text-[10px] text-slate-500 font-semibold">{planStatus.paket}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Manajemen Cabang Kost</h1>
          <p className="text-xs text-slate-500 mt-0.5">Kelola properti kost di beberapa lokasi berbeda dengan subdomain unik per cabang.</p>
        </div>

        <LockedFeatureCard
          feature="Multi-Cabang Kost"
          description="Kelola hingga 3 cabang kost di lokasi berbeda (Pro), atau cabang tak terbatas (Enterprise). Upgrade sekarang untuk mengaktifkan fitur ini."
          minPlan="Pro"
        />

        {/* Perbandingan paket */}
        <div>
          <p className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">Apa yang Anda dapatkan setelah upgrade:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                plan: "Paket Pro", badge: "POPULER", maxCabang: "3",
                color: "border-primary/30 bg-primary/5", badgeColor: "bg-primary text-white",
                icon: "apartment",
                features: [
                  "Hingga 3 cabang kost aktif",
                  "Subdomain unik per cabang",
                  "Dashboard terpusat",
                  "Akses langsung ke website publik tiap cabang",
                  "Aktifkan / nonaktifkan cabang kapan saja",
                ],
              },
              {
                plan: "Paket Enterprise", badge: "UNLIMITED", maxCabang: "∞",
                color: "border-amber-300 bg-amber-50/80", badgeColor: "bg-amber-500 text-white",
                icon: "domain",
                features: [
                  "Cabang tak terbatas",
                  "Multi-user admin & staf",
                  "Domain kustom sendiri (.com/.id)",
                  "Master dashboard semua cabang",
                  "Prioritas support 24/7",
                ],
              },
            ].map((p) => (
              <div key={p.plan} className={`skeu-card p-5 sm:p-6 rounded-2xl border-2 ${p.color} relative overflow-hidden`}>
                <div className={`absolute top-3 right-3 text-[9px] font-black px-2 py-0.5 rounded-full ${p.badgeColor}`}>{p.badge}</div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">{p.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">{p.plan}</h3>
                    <p className="text-[11px] text-primary font-bold">Maks. {p.maxCabang} Cabang</p>
                  </div>
                </div>
                <ul className="space-y-2 mt-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-slate-700">
                      <span className="material-symbols-outlined text-emerald-600 text-[14px] mt-0.5 shrink-0">check_circle</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="skeu-card p-5 rounded-2xl">
          <p className="font-bold text-slate-900 text-sm mb-4">Cara Kerja Multi-Cabang</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { step: "1", icon: "add_home_work", title: "Tambah Cabang", desc: "Daftarkan lokasi baru dengan nama dan subdomain unik" },
              { step: "2", icon: "domain",        title: "Website Otomatis", desc: `Cabang langsung punya halaman publik di subdomain.${APP_DOMAIN}` },
              { step: "3", icon: "share",         title: "Bagikan Link", desc: "Salin link dan bagikan ke calon penyewa di area tersebut" },
              { step: "4", icon: "dashboard",     title: "Kelola Terpusat", desc: "Semua cabang dikelola dari satu dashboard yang sama" },
            ].map((s) => (
              <div key={s.step} className="text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
                </div>
                <p className="font-bold text-slate-900 text-xs">{s.title}</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center pt-2">
          <Link href="/admin/pengaturan" className="skeu-button inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm shadow-lg hover:-translate-y-0.5 transition-transform">
            <span className="material-symbols-outlined text-[18px]">upgrade</span>
            Upgrade Paket Sekarang
          </Link>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Fitur tersedia
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 sm:space-y-8 max-w-full">

      {/* ── Delete Confirm Modal (ketik nama) ── */}
      {delTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="skeu-card p-6 rounded-2xl max-w-md w-full shadow-2xl text-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/60">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-red-600 text-[22px]">delete_forever</span>
              </div>
              <div>
                <h3 className="font-black text-sm text-red-900">Hapus Cabang Permanen</h3>
                <p className="text-slate-500 text-[11px]">{delTarget.subdomain}.{APP_DOMAIN}</p>
              </div>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 space-y-1">
              <p className="font-bold">⚠️ Tindakan ini TIDAK DAPAT dibatalkan!</p>
              <p className="text-[11px] leading-relaxed">Subdomain <strong>{delTarget.subdomain}.{APP_DOMAIN}</strong> akan langsung non-aktif. Semua link yang sudah dibagikan ke penyewa tidak akan bisa diakses lagi.</p>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Ketik nama cabang untuk konfirmasi: <strong className="text-red-600">{delTarget.nama}</strong>
              </label>
              <input
                type="text"
                value={delConfText}
                onChange={(e) => setDelConfText(e.target.value)}
                placeholder={delTarget.nama}
                className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-bold"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setDelTarget(null); setDelConfText(""); }} className="skeu-button-secondary px-4 py-2 rounded-xl font-bold">Batal</button>
              <button
                onClick={handleDelete}
                disabled={delLoading || delConfText !== delTarget.nama}
                className="px-5 py-2 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 shadow-md transition-colors flex items-center gap-1.5"
              >
                {delLoading ? <><span className="material-symbols-outlined text-[16px] animate-spin">sync</span> Menghapus...</> : "Hapus Permanen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-primary uppercase">Multi-Cabang</span>
            <span className="text-slate-400">•</span>
            <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold">
              {planStatus.paket} — Maks. {limits?.maxCabang === 99 ? "Tak Terbatas" : limits?.maxCabang} Cabang
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Manajemen Cabang Kost</h1>
          <p className="text-xs text-slate-500 mt-0.5">Kelola semua properti kost di berbagai lokasi dengan subdomain unik dan halaman publik masing-masing.</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setAddForm(emptyForm); setSubAvail(null); }}
          disabled={!canAdd}
          title={!canAdd ? `Batas ${limits?.maxCabang} cabang sudah tercapai` : "Tambah cabang baru"}
          className={`skeu-button text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md w-full sm:w-auto ${
            !canAdd ? "opacity-60 cursor-not-allowed" : "hover:-translate-y-0.5 transition-transform"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">{canAdd ? "add_home_work" : "lock"}</span>
          <span>{canAdd ? "Tambah Cabang Baru" : `Batas Tercapai (${branches.length}/${limits?.maxCabang})`}</span>
        </button>
      </div>

      {/* ── Summary KPI ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Cabang",    val: branches.length,                  icon: "apartment",    color: "text-primary" },
          { label: "Cabang Aktif",    val: activeBranches,                   icon: "check_circle", color: "text-emerald-700" },
          { label: "Cabang Nonaktif", val: inactiveBranches,                 icon: "pause_circle", color: "text-amber-600" },
          { label: "Sisa Kuota",      val: limits?.maxCabang === 99 ? "∞" : Math.max(0, (limits?.maxCabang || 0) - branches.length), icon: "add_home_work", color: "text-indigo-600" },
        ].map((s, i) => (
          <div key={i} className="skeu-card p-3 sm:p-4 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase truncate">{s.label}</span>
              <span className={`material-symbols-outlined text-[16px] opacity-40 ${s.color}`}>{s.icon}</span>
            </div>
            <div className={`text-lg sm:text-xl font-black ${s.color}`}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* ── Kuota progress bar ── */}
      {limits && limits.maxCabang < 99 && (
        <div className="skeu-card p-3 sm:p-4 rounded-xl flex items-center gap-3 text-xs">
          <span className="material-symbols-outlined text-primary text-[18px] shrink-0">sell</span>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-700">Kuota Cabang — {planStatus.paket}</span>
              <span className={`font-black ${canAdd ? "text-emerald-700" : "text-red-700"}`}>
                {branches.length} / {limits.maxCabang}
              </span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  !canAdd ? "bg-red-500" :
                  branches.length / limits.maxCabang >= 0.75 ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, (branches.length / limits.maxCabang) * 100)}%` }}
              />
            </div>
          </div>
          {!canAdd && (
            <Link href="/admin/pengaturan" className="shrink-0 text-[10px] font-bold bg-red-100 text-red-700 px-3 py-1.5 rounded-full hover:bg-red-200 transition-colors whitespace-nowrap">
              Upgrade →
            </Link>
          )}
        </div>
      )}

      {/* ── Search + Filter ── */}
      {branches.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
            <input
              type="text"
              placeholder="Cari nama cabang, subdomain, atau alamat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl skeu-inset text-slate-800 outline-none"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {(["all","active","inactive"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  filterStatus === s ? "skeu-button text-white shadow-sm" : "skeu-card text-slate-600 hover:text-slate-900"
                }`}
              >
                {s === "all" ? `Semua (${branches.length})` : s === "active" ? `Aktif (${activeBranches})` : `Nonaktif (${inactiveBranches})`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Branch Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <BranchSkeleton /><BranchSkeleton /><BranchSkeleton />
        </div>
      ) : branches.length === 0 ? (
        /* ── Empty state ── */
        <div className="skeu-card rounded-2xl p-10 sm:p-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 shadow-sm">
            <span className="material-symbols-outlined text-[42px]">add_home_work</span>
          </div>
          <h2 className="font-black text-slate-900 text-lg mb-2">Belum Ada Cabang</h2>
          <p className="text-xs text-slate-500 mb-2 max-w-sm mx-auto leading-relaxed">
            Setiap cabang mendapat subdomain dan halaman publik sendiri di{" "}
            <span className="font-mono text-primary">nama.{APP_DOMAIN}</span>.
          </p>
          <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto leading-relaxed">
            Cocok untuk Anda yang punya properti kost di lebih dari satu lokasi dan ingin mengelolanya dari satu dashboard.
          </p>
          <button
            onClick={() => { setShowAdd(true); setAddForm(emptyForm); setSubAvail(null); }}
            className="skeu-button px-7 py-3.5 rounded-xl font-bold text-sm shadow-lg inline-flex items-center gap-2 hover:-translate-y-0.5 transition-transform"
          >
            <span className="material-symbols-outlined text-[18px]">add_home_work</span>
            Tambah Cabang Pertama
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="skeu-card rounded-2xl p-10 text-center">
          <span className="material-symbols-outlined text-slate-300 text-[40px] block mb-3">search_off</span>
          <p className="font-bold text-slate-600">Tidak ada cabang yang sesuai pencarian</p>
          <button onClick={() => { setSearch(""); setFilterStatus("all"); }} className="text-primary text-xs font-bold mt-2 hover:underline">
            Reset filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filtered.map((b) => (
            <div
              key={b.id}
              className={`skeu-card p-4 sm:p-5 rounded-2xl flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl group ${!b.is_active ? "opacity-70" : ""}`}
            >
              <div>
                {/* Status + nama */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Logo / icon */}
                    <div className="w-10 h-10 rounded-xl skeu-inset flex items-center justify-center overflow-hidden shrink-0">
                      {b.logo_url ? (
                        <img src={b.logo_url} alt={b.nama} className="w-full h-full object-contain p-1" />
                      ) : (
                        <span className="material-symbols-outlined text-primary text-[20px]">apartment</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${b.is_active ? "bg-emerald-500" : "bg-slate-300"}`}></span>
                        <span className={`text-[10px] font-bold ${b.is_active ? "text-emerald-700" : "text-slate-400"}`}>
                          {b.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>
                      <h3 className="font-black text-slate-900 text-sm leading-tight truncate">{b.nama}</h3>
                    </div>
                  </div>
                  {/* Quick copy button */}
                  <button
                    onClick={() => copyLink(b)}
                    className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="Salin link"
                  >
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  </button>
                </div>

                {/* Subdomain link */}
                <a
                  href={`https://${b.subdomain}.${APP_DOMAIN}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-mono text-primary hover:underline mb-3 truncate max-w-full"
                >
                  <span className="material-symbols-outlined text-[12px] shrink-0">open_in_new</span>
                  <span className="truncate">{b.subdomain}.{APP_DOMAIN}</span>
                </a>

                {/* Stats chips */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                    {b.stats.totalKamar} Kamar
                  </span>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    {b.stats.kamarTerisi} Terisi
                  </span>
                  {b.stats.totalPenyewa > 0 && (
                    <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {b.stats.totalPenyewa} Penyewa
                    </span>
                  )}
                </div>

                {/* Tagline */}
                {b.tagline && (
                  <p className="text-xs text-slate-500 italic mb-2 leading-relaxed line-clamp-2">"{b.tagline}"</p>
                )}

                {/* Info rows */}
                <div className="space-y-1.5 mb-3">
                  {b.alamat && (
                    <div className="flex items-start gap-1.5 text-[11px] text-slate-600">
                      <span className="material-symbols-outlined text-[13px] mt-0.5 shrink-0 text-slate-400">location_on</span>
                      <span className="leading-relaxed line-clamp-2">{b.alamat}</span>
                    </div>
                  )}
                  {b.telepon && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                      <span className="material-symbols-outlined text-[13px] shrink-0 text-slate-400">phone</span>
                      <span>{b.telepon}</span>
                    </div>
                  )}
                </div>

                {/* Tanggal dibuat */}
                <p className="text-[10px] text-slate-400 font-mono">
                  Dibuat {new Date(b.created_at).toLocaleDateString("id-ID", { day:"2-digit", month:"short", year:"numeric" })}
                </p>
              </div>

              {/* ── Actions ── */}
              <div className="pt-3 mt-3 border-t border-white/60 space-y-2">
                {/* Kelola cabang — primary action */}
                <button
                  onClick={() => {
                    setActiveBranch(b.id);
                    router.push("/admin/dashboard");
                    toast.success(`Beralih ke ${b.nama}`, "Semua data sekarang menampilkan cabang ini.");
                  }}
                  className={`w-full skeu-button text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm ${
                    activeBranchId === b.id ? "opacity-100 ring-2 ring-primary/40" : ""
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {activeBranchId === b.id ? "check_circle" : "dashboard"}
                  </span>
                  {activeBranchId === b.id ? "Sedang Aktif" : "Kelola Cabang Ini"}
                </button>

                {/* Secondary actions */}
                <div className="flex items-center gap-1.5">
                  <button onClick={() => openEdit(b)} className="flex-1 skeu-button-secondary text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 hover:bg-white transition-colors" title="Edit informasi cabang">
                    <span className="material-symbols-outlined text-[15px]">edit</span>
                    Edit
                  </button>
                  <button onClick={() => copyLink(b)} className="px-2.5 py-2 rounded-xl skeu-card text-slate-500 hover:text-primary transition-colors" title="Salin link cabang">
                    <span className="material-symbols-outlined text-[17px]">content_copy</span>
                  </button>
                  <button onClick={() => toggleActive(b)} className={`px-2.5 py-2 rounded-xl skeu-card transition-colors ${b.is_active ? "text-amber-600 hover:text-amber-800" : "text-emerald-600 hover:text-emerald-800"}`} title={b.is_active ? "Nonaktifkan cabang" : "Aktifkan cabang"}>
                    <span className="material-symbols-outlined text-[17px]">{b.is_active ? "pause_circle" : "play_circle"}</span>
                  </button>
                  <button onClick={() => { setDelTarget(b); setDelConfText(""); }} className="px-2.5 py-2 rounded-xl skeu-card text-red-500 hover:text-red-700 transition-colors" title="Hapus cabang permanen">
                    <span className="material-symbols-outlined text-[17px]">delete_forever</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Info & Panduan ── */}
      <div className="skeu-card p-5 sm:p-6 rounded-2xl space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-white/60">
          <span className="material-symbols-outlined text-primary text-[20px]">help</span>
          <h3 className="font-bold text-slate-900 text-sm">Panduan Kelola Cabang</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: "add_home_work", title: "Tambah Cabang",
              desc: "Klik tombol \"Tambah Cabang Baru\" di kanan atas. Isi nama, subdomain unik, alamat, dan nomor WhatsApp pengelola cabang.",
            },
            {
              icon: "language", title: "Website Otomatis",
              desc: `Setiap cabang langsung punya halaman publik di <subdomain>.${APP_DOMAIN} yang dapat dibagikan ke calon penyewa.`,
            },
            {
              icon: "pause_circle", title: "Nonaktifkan Sementara",
              desc: "Gunakan tombol pause untuk menonaktifkan cabang tanpa menghapusnya. Halaman publik tidak akan bisa diakses selama nonaktif.",
            },
            {
              icon: "delete_forever", title: "Hapus Permanen",
              desc: "Hapus cabang yang tidak digunakan lagi. Ketik nama cabang untuk konfirmasi. Subdomain langsung non-aktif setelah penghapusan.",
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
              </div>
              <div>
                <p className="font-bold text-slate-800 text-xs mb-0.5">{item.title}</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Enterprise upsell jika Pro */}
        {limits && limits.maxCabang < 99 && (
          <div className="border-t border-white/60 pt-4 flex items-center justify-between gap-4">
            <div className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-800">Butuh lebih dari {limits.maxCabang} cabang?</strong>{" "}
              Upgrade ke Paket Enterprise untuk cabang tak terbatas, multi-user admin, dan domain kustom sendiri.
            </div>
            <Link
              href="/admin/pengaturan"
              className="shrink-0 skeu-button text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm hover:-translate-y-0.5 transition-transform"
            >
              <span className="material-symbols-outlined text-[15px]">upgrade</span>
              Upgrade
            </Link>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: Tambah Cabang */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="skeu-card p-5 sm:p-6 rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto animate-fadeInUp">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/60">
              <div>
                <h3 className="font-black text-sm text-slate-900">Tambah Cabang Baru</h3>
                <p className="text-[11px] text-slate-500">
                  Cabang ke {branches.length + 1}{limits?.maxCabang !== 99 ? ` dari ${limits?.maxCabang}` : ""} · {planStatus.paket}
                </p>
              </div>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4 text-xs">
              {/* Nama */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nama Cabang <span className="text-red-500">*</span>
                </label>
                <input
                  required autoFocus
                  type="text"
                  placeholder="Contoh: Kost Harmoni Cabang Selatan"
                  value={addForm.nama}
                  onChange={(e) => setAddForm({ ...addForm, nama: e.target.value })}
                  maxLength={100}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-1">{addForm.nama.length}/100 karakter</p>
              </div>

              {/* Subdomain */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Subdomain <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-0">
                  <input
                    required
                    type="text"
                    placeholder="harmoni-selatan"
                    value={addForm.subdomain}
                    onChange={(e) => {
                      const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                      setAddForm({ ...addForm, subdomain: v });
                      setSubAvail(null);
                    }}
                    onBlur={() => checkSubdomain(addForm.subdomain)}
                    maxLength={30}
                    className="flex-1 p-2.5 rounded-l-xl skeu-inset text-slate-800 outline-none font-mono border-r-0"
                  />
                  <span className="p-2.5 bg-slate-100 text-slate-500 rounded-r-xl font-mono text-[10px] border border-white/60 border-l-0 whitespace-nowrap shrink-0">
                    .{APP_DOMAIN}
                  </span>
                </div>
                {/* Availability indicator */}
                <div className="mt-1 h-4">
                  {checkingSub && (
                    <p className="text-slate-500 flex items-center gap-1 text-[11px]">
                      <span className="material-symbols-outlined text-[13px] animate-spin">sync</span> Memeriksa ketersediaan...
                    </p>
                  )}
                  {!checkingSub && subAvailable === true && (
                    <p className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                      <span className="material-symbols-outlined text-[13px]">check_circle</span> Tersedia! Subdomain dapat digunakan.
                    </p>
                  )}
                  {!checkingSub && subAvailable === false && (
                    <p className="text-red-600 font-bold flex items-center gap-1 text-[11px]">
                      <span className="material-symbols-outlined text-[13px]">cancel</span> Sudah dipakai. Coba nama lain.
                    </p>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Hanya huruf kecil (a-z), angka (0-9), dan tanda hubung (-). Min. 3 karakter. Tidak bisa diubah setelah disimpan.</p>
              </div>

              {/* Tagline */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tagline / Deskripsi Singkat</label>
                <input
                  type="text"
                  placeholder="Hunian nyaman dekat kampus, harga terjangkau"
                  value={addForm.tagline}
                  onChange={(e) => setAddForm({ ...addForm, tagline: e.target.value })}
                  maxLength={120}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
                />
              </div>

              {/* Alamat */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Alamat Lengkap</label>
                <textarea
                  rows={2}
                  placeholder="Jl. Contoh No. 1, Kelurahan, Kecamatan, Kota..."
                  value={addForm.alamat}
                  onChange={(e) => setAddForm({ ...addForm, alamat: e.target.value })}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none leading-relaxed"
                />
              </div>

              {/* WhatsApp */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nomor WhatsApp Pengelola Cabang</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] font-mono">+62</span>
                  <input
                    type="tel"
                    placeholder="81234567890"
                    value={addForm.telepon}
                    onChange={(e) => setAddForm({ ...addForm, telepon: e.target.value })}
                    className="w-full pl-10 p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Nomor ini tampil di halaman publik sebagai kontak cabang.</p>
              </div>

              {/* Preview URL */}
              {addForm.subdomain.length >= 3 && (
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 flex items-center gap-2 text-[11px]">
                  <span className="material-symbols-outlined text-primary text-[16px] shrink-0">language</span>
                  <div>
                    <p className="text-slate-500">Cabang akan dapat diakses di:</p>
                    <p className="font-mono font-bold text-primary">https://{addForm.subdomain}.{APP_DOMAIN}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-white/60">
                <button type="button" onClick={() => setShowAdd(false)} className="skeu-button-secondary px-4 py-2.5 rounded-xl font-bold">
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={addLoading || subAvailable !== true}
                  className="skeu-button px-5 py-2.5 rounded-xl font-bold shadow-md disabled:opacity-60 flex items-center gap-1.5"
                >
                  {addLoading
                    ? <><span className="material-symbols-outlined text-[16px] animate-spin">sync</span> Menyimpan...</>
                    : <><span className="material-symbols-outlined text-[16px]">add_home_work</span> Tambah Cabang</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: Edit Cabang */}
      {editTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="skeu-card p-5 sm:p-6 rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto animate-fadeInUp">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/60">
              <div>
                <h3 className="font-black text-sm text-slate-900">Edit Cabang</h3>
                <a
                  href={`https://${editTarget.subdomain}.${APP_DOMAIN}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-mono text-primary hover:underline flex items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[11px]">open_in_new</span>
                  {editTarget.subdomain}.{APP_DOMAIN}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${editTarget.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {editTarget.is_active ? "Aktif" : "Nonaktif"}
                </span>
                <button onClick={() => setEditTarget(null)} className="text-slate-400 hover:text-slate-700">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleEdit} className="space-y-4 text-xs">
              {/* Logo Cabang */}
              <div>
                <label className="font-bold text-slate-700 block mb-2">Logo / Foto Cabang</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl skeu-inset flex items-center justify-center overflow-hidden shrink-0">
                    {editForm.logo_url ? (
                      <img src={editForm.logo_url} alt="Logo cabang" className="w-full h-full object-contain p-1" />
                    ) : (
                      <span className="material-symbols-outlined text-slate-300 text-[28px]">apartment</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      type="url"
                      placeholder="https://contoh.com/logo.png (URL gambar)"
                      value={editForm.logo_url}
                      onChange={(e) => setEditForm({ ...editForm, logo_url: e.target.value })}
                      className="w-full p-2 rounded-lg skeu-inset text-slate-800 outline-none text-[11px] font-mono"
                    />
                    {editForm.logo_url && (
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, logo_url: "" })}
                        className="text-red-500 hover:text-red-700 text-[10px] font-bold flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[13px]">delete</span> Hapus Logo
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">Masukkan URL gambar logo cabang. Logo tampil di halaman publik cabang.</p>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Cabang <span className="text-red-500">*</span></label>
                <input
                  required autoFocus
                  type="text"
                  value={editForm.nama}
                  onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
                  maxLength={100}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-bold"
                />
              </div>

              {/* Subdomain read-only */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Subdomain
                  <span className="text-slate-400 font-normal ml-1">(tidak dapat diubah)</span>
                </label>
                <div className="flex items-center gap-0 opacity-60 cursor-not-allowed">
                  <div className="flex-1 p-2.5 rounded-l-xl skeu-inset font-mono font-bold text-slate-600">{editTarget.subdomain}</div>
                  <span className="p-2.5 bg-slate-100 text-slate-500 rounded-r-xl font-mono text-[10px] border border-white/60 border-l-0 shrink-0">
                    .{APP_DOMAIN}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Subdomain bersifat permanen untuk menjaga link yang sudah dibagikan tetap aktif.</p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tagline</label>
                <input
                  type="text"
                  value={editForm.tagline}
                  onChange={(e) => setEditForm({ ...editForm, tagline: e.target.value })}
                  maxLength={120}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Alamat Lengkap</label>
                <textarea
                  rows={2}
                  value={editForm.alamat}
                  onChange={(e) => setEditForm({ ...editForm, alamat: e.target.value })}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nomor WhatsApp Pengelola</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] font-mono">+62</span>
                  <input
                    type="tel"
                    value={editForm.telepon}
                    onChange={(e) => setEditForm({ ...editForm, telepon: e.target.value })}
                    className="w-full pl-10 p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Quick actions */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-400 text-[16px]">settings</span>
                  <span className="text-slate-600 font-bold">Status Cabang</span>
                </div>
                <button
                  type="button"
                  onClick={() => { toggleActive(editTarget); setEditTarget(null); }}
                  className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-colors ${
                    editTarget.is_active
                      ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                      : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  }`}
                >
                  {editTarget.is_active ? "Nonaktifkan Cabang" : "Aktifkan Cabang"}
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/60">
                <button type="button" onClick={() => setEditTarget(null)} className="skeu-button-secondary px-4 py-2.5 rounded-xl font-bold">
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="skeu-button px-5 py-2.5 rounded-xl font-bold shadow-md disabled:opacity-60 flex items-center gap-1.5"
                >
                  {editLoading
                    ? <><span className="material-symbols-outlined text-[16px] animate-spin">sync</span> Menyimpan...</>
                    : <><span className="material-symbols-outlined text-[16px]">save</span> Simpan Perubahan</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
