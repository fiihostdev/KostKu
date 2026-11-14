"use client";

import { useState, useEffect, useCallback } from "react";
import { usePlanLimits } from "@/lib/use-plan-limits";
import { useToast } from "@/components/ui/Toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { LockedFeatureCard } from "@/components/admin/PlanLimitBanner";
import Link from "next/link";

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
}

interface BranchForm {
  nama:     string;
  subdomain: string;
  alamat:   string;
  telepon:  string;
  tagline:  string;
}

const emptyForm: BranchForm = { nama: "", subdomain: "", alamat: "", telepon: "", tagline: "" };

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "manajementkost.my.id";

export default function CabangPage() {
  const planStatus = usePlanLimits();
  const toast      = useToast();

  const [branches,    setBranches]    = useState<Branch[]>([]);
  const [limits,      setLimits]      = useState<{ maxCabang: number; hasMultiCabang: boolean } | null>(null);
  const [canAdd,      setCanAdd]      = useState(false);
  const [loading,     setLoading]     = useState(true);

  // Add modal
  const [showAdd,     setShowAdd]     = useState(false);
  const [addForm,     setAddForm]     = useState<BranchForm>(emptyForm);
  const [addLoading,  setAddLoading]  = useState(false);
  const [subAvailable, setSubAvail]   = useState<boolean | null>(null);
  const [checkingSub,  setCheckingSub] = useState(false);

  // Edit modal
  const [editTarget,  setEditTarget]  = useState<Branch | null>(null);
  const [editForm,    setEditForm]    = useState<BranchForm>(emptyForm);
  const [editLoading, setEditLoading] = useState(false);

  // Delete modal
  const [delTarget,   setDelTarget]   = useState<Branch | null>(null);
  const [delLoading,  setDelLoading]  = useState(false);

  // ── Fetch branches ────────────────────────────────────────────────────────
  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/branches", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setBranches(data.branches || []);
        setLimits(data.limits);
        setCanAdd(data.canAddBranch);
      }
    } catch {
      toast.error("Gagal memuat data cabang", "Periksa koneksi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  // ── Subdomain check ───────────────────────────────────────────────────────
  const checkSubdomain = async (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (clean.length < 3) { setSubAvail(null); return; }
    setCheckingSub(true);
    setSubAvail(null);
    try {
      const res  = await fetch(`/api/onboarding/check-subdomain?subdomain=${clean}`);
      const data = await res.json();
      setSubAvail(data.available);
    } catch {
      setSubAvail(null);
    } finally {
      setCheckingSub(false);
    }
  };

  // ── Tambah cabang ─────────────────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subAvailable) {
      toast.error("Subdomain tidak tersedia", "Pilih subdomain lain.");
      return;
    }
    setAddLoading(true);
    try {
      const res = await fetch("/api/branches", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Gagal menambahkan cabang", data.error);
        return;
      }
      toast.success("Cabang berhasil ditambahkan!", `${addForm.nama} sudah aktif.`);
      setShowAdd(false);
      setAddForm(emptyForm);
      setSubAvail(null);
      fetchBranches();
    } catch {
      toast.error("Gagal", "Periksa koneksi.");
    } finally {
      setAddLoading(false);
    }
  };

  // ── Edit cabang ───────────────────────────────────────────────────────────
  const openEdit = (b: Branch) => {
    setEditTarget(b);
    setEditForm({ nama: b.nama, subdomain: b.subdomain, alamat: b.alamat || "", telepon: b.telepon || "", tagline: b.tagline || "" });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/branches/${editTarget.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ nama: editForm.nama, alamat: editForm.alamat, telepon: editForm.telepon, tagline: editForm.tagline }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error("Gagal menyimpan", data.error); return; }
      toast.success("Cabang diperbarui!", `${editForm.nama} berhasil disimpan.`);
      setEditTarget(null);
      fetchBranches();
    } catch {
      toast.error("Gagal", "Periksa koneksi.");
    } finally {
      setEditLoading(false);
    }
  };

  // ── Toggle aktif/nonaktif ─────────────────────────────────────────────────
  const toggleActive = async (b: Branch) => {
    try {
      const res = await fetch(`/api/branches/${b.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ is_active: !b.is_active }),
      });
      if (!res.ok) throw new Error();
      toast.success(b.is_active ? "Cabang dinonaktifkan" : "Cabang diaktifkan", b.nama);
      fetchBranches();
    } catch {
      toast.error("Gagal", "Periksa koneksi.");
    }
  };

  // ── Hapus cabang ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!delTarget) return;
    setDelLoading(true);
    try {
      const res = await fetch(`/api/branches/${delTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Cabang dihapus", `${delTarget.nama} telah dihapus.`);
      setDelTarget(null);
      fetchBranches();
    } catch {
      toast.error("Gagal menghapus", "Coba lagi.");
    } finally {
      setDelLoading(false);
    }
  };

  // ── Render: plan loading ──────────────────────────────────────────────────
  if (planStatus.loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-64 rounded-xl"></div>
        <div className="skeleton h-32 w-full rounded-2xl"></div>
        <div className="skeleton h-48 w-full rounded-2xl"></div>
      </div>
    );
  }

  // ── Render: plan tidak mendukung cabang ───────────────────────────────────
  if (!planStatus.limits || planStatus.limits.maxCabang <= 1) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Manajemen Cabang Kost</h1>
          <p className="text-xs text-slate-500 mt-0.5">Kelola properti kost di beberapa lokasi.</p>
        </div>
        <LockedFeatureCard
          feature="Multi-Cabang Kost"
          description="Kelola hingga 3 cabang kost di lokasi berbeda (Pro), atau cabang tak terbatas (Enterprise). Upgrade sekarang untuk mengaktifkan fitur ini."
          minPlan="Pro"
        />
        {/* Show what Pro/Enterprise offers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { plan: "Paket Pro", maxCabang: 3, color: "border-primary/30 bg-primary/5", icon: "apartment", features: ["Hingga 3 cabang kost", "Subdomain unik per cabang", "Dashboard terpusat", "Kelola kamar & penyewa per cabang"] },
            { plan: "Paket Enterprise", maxCabang: "Tak Terbatas", color: "border-amber-300 bg-amber-50", icon: "domain", features: ["Cabang tak terbatas", "Multi-user admin", "Domain kustom", "Master dashboard semua cabang"] },
          ].map((p) => (
            <div key={p.plan} className={`skeu-card p-5 rounded-2xl border-2 ${p.color}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-primary text-[22px]">{p.icon}</span>
                <h3 className="font-black text-slate-900">{p.plan}</h3>
              </div>
              <p className="text-xs font-black text-primary mb-3">Maks. {p.maxCabang} Cabang</p>
              <ul className="space-y-1.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-slate-700">
                    <span className="material-symbols-outlined text-emerald-600 text-[14px]">check_circle</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="text-center">
          <Link href="/admin/pengaturan" className="skeu-button inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm shadow-md hover:-translate-y-0.5 transition-transform">
            <span className="material-symbols-outlined text-[18px]">upgrade</span>
            Upgrade Paket Sekarang
          </Link>
        </div>
      </div>
    );
  }

  // ── Render: fitur tersedia ────────────────────────────────────────────────
  return (
    <div className="space-y-6 sm:space-y-8 max-w-full">

      {/* Confirm delete */}
      <ConfirmModal
        isOpen={!!delTarget}
        title={`Hapus Cabang "${delTarget?.nama || ""}"?`}
        message="Cabang akan dihapus permanen. Subdomain akan langsung non-aktif."
        confirmLabel={delLoading ? "Menghapus..." : "Ya, Hapus Cabang"}
        cancelLabel="Batal"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDelTarget(null)}
      />

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
          <p className="text-xs text-slate-500 mt-0.5">Kelola properti kost Anda di beberapa lokasi berbeda dengan subdomain unik masing-masing.</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setAddForm(emptyForm); setSubAvail(null); }}
          disabled={!canAdd}
          title={!canAdd ? `Batas cabang paket ${planStatus.paket} tercapai` : "Tambah cabang baru"}
          className={`skeu-button text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md w-full sm:w-auto transition-all ${!canAdd ? "opacity-60 cursor-not-allowed" : "hover:-translate-y-0.5"}`}
        >
          <span className="material-symbols-outlined text-[18px]">{canAdd ? "add_home_work" : "lock"}</span>
          <span>{canAdd ? "Tambah Cabang" : `Batas Tercapai (${branches.length}/${limits?.maxCabang})`}</span>
        </button>
      </div>

      {/* ── Kuota bar ── */}
      {limits && (
        <div className="skeu-card p-3 rounded-xl flex items-center gap-3 text-xs">
          <span className="material-symbols-outlined text-primary text-[18px] shrink-0">apartment</span>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-700">Kuota Cabang — {planStatus.paket}</span>
              <span className={`font-black ${canAdd ? "text-emerald-700" : "text-red-700"}`}>
                {branches.length} / {limits.maxCabang === 99 ? "∞" : limits.maxCabang}
              </span>
            </div>
            {limits.maxCabang < 99 && (
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${!canAdd ? "bg-red-500" : branches.length / limits.maxCabang >= 0.7 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(100, (branches.length / limits.maxCabang) * 100)}%` }}
                />
              </div>
            )}
          </div>
          {!canAdd && limits.maxCabang < 99 && (
            <Link href="/admin/pengaturan" className="shrink-0 text-[10px] font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-full hover:bg-red-200 transition-colors">
              Upgrade
            </Link>
          )}
        </div>
      )}

      {/* ── Branch Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map((i) => <div key={i} className="skeleton h-48 rounded-2xl"></div>)}
        </div>
      ) : branches.length === 0 ? (
        <div className="skeu-card rounded-2xl p-12 text-center">
          <span className="material-symbols-outlined text-slate-300 text-[52px] block mb-3">add_home_work</span>
          <p className="font-black text-slate-700 text-base mb-1">Belum ada cabang</p>
          <p className="text-xs text-slate-500 mb-6 max-w-xs mx-auto leading-relaxed">
            Tambahkan cabang kost pertama Anda. Setiap cabang mendapat subdomain dan halaman publik sendiri.
          </p>
          <button
            onClick={() => { setShowAdd(true); setAddForm(emptyForm); setSubAvail(null); }}
            className="skeu-button px-6 py-3 rounded-xl font-bold text-sm shadow-md inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add_home_work</span>
            Tambah Cabang Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {branches.map((b) => (
            <div key={b.id} className={`skeu-card p-4 sm:p-5 rounded-2xl flex flex-col justify-between transition hover:-translate-y-0.5 ${!b.is_active ? "opacity-60" : ""}`}>
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="material-symbols-outlined text-primary text-[16px]">apartment</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${b.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {b.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                    <h3 className="font-black text-slate-900 text-base truncate">{b.nama}</h3>
                  </div>
                </div>

                {/* Subdomain */}
                <a
                  href={`https://${b.subdomain}.${APP_DOMAIN}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[11px] font-mono text-primary hover:underline mb-3 truncate"
                >
                  <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                  {b.subdomain}.{APP_DOMAIN}
                </a>

                {b.tagline && (
                  <p className="text-xs text-slate-500 italic mb-2 leading-relaxed">"{b.tagline}"</p>
                )}

                {b.alamat && (
                  <div className="flex items-start gap-1.5 text-[11px] text-slate-600 mb-1.5">
                    <span className="material-symbols-outlined text-[13px] mt-0.5 shrink-0">location_on</span>
                    <span className="leading-relaxed">{b.alamat}</span>
                  </div>
                )}

                {b.telepon && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mb-2">
                    <span className="material-symbols-outlined text-[13px] shrink-0">phone</span>
                    <span>{b.telepon}</span>
                  </div>
                )}

                <p className="text-[10px] text-slate-400 mt-2">
                  Dibuat {new Date(b.created_at).toLocaleDateString("id-ID", { day:"2-digit", month:"short", year:"numeric" })}
                </p>
              </div>

              {/* Actions */}
              <div className="pt-3 mt-3 border-t border-white/60 flex items-center gap-2">
                <button
                  onClick={() => openEdit(b)}
                  className="flex-1 skeu-button-secondary text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[15px]">edit</span>
                  Edit
                </button>
                <button
                  onClick={() => toggleActive(b)}
                  className={`px-3 py-2 rounded-xl skeu-card text-xs font-bold transition-colors ${b.is_active ? "text-amber-600 hover:text-amber-800" : "text-emerald-600 hover:text-emerald-800"}`}
                  title={b.is_active ? "Nonaktifkan" : "Aktifkan"}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {b.is_active ? "pause_circle" : "play_circle"}
                  </span>
                </button>
                <button
                  onClick={() => setDelTarget(b)}
                  className="px-3 py-2 rounded-xl skeu-card text-red-500 hover:text-red-700 transition-colors"
                  title="Hapus cabang"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Info box ── */}
      <div className="skeu-card p-4 rounded-2xl flex items-start gap-3 text-xs text-slate-600">
        <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">info</span>
        <div className="space-y-1 leading-relaxed">
          <p className="font-bold text-slate-800">Cara Kerja Multi-Cabang</p>
          <p>Setiap cabang mendapat subdomain unik sendiri (contoh: <span className="font-mono text-primary">cabang2.{APP_DOMAIN}</span>) yang dapat Anda bagikan ke calon penyewa.</p>
          <p>Cabang dikelola dari dashboard yang sama — kamar, penyewa, dan tagihan masing-masing cabang sepenuhnya terpisah.</p>
          {limits?.maxCabang === 99 ? (
            <p className="text-emerald-700 font-bold">✓ Paket Enterprise — Cabang tak terbatas</p>
          ) : (
            <p>Paket Pro mendukung hingga <strong>{limits?.maxCabang} cabang</strong>. Upgrade ke Enterprise untuk cabang tak terbatas.</p>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: Tambah Cabang */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="skeu-card p-5 sm:p-6 rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/60">
              <div>
                <h3 className="font-black text-sm text-slate-900">Tambah Cabang Baru</h3>
                <p className="text-[11px] text-slate-500">
                  {branches.length + 1} / {limits?.maxCabang === 99 ? "∞" : limits?.maxCabang} cabang
                </p>
              </div>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Cabang <span className="text-red-500">*</span></label>
                <input
                  required
                  type="text"
                  placeholder="Kost Harmoni Cabang 2"
                  value={addForm.nama}
                  onChange={(e) => setAddForm({ ...addForm, nama: e.target.value })}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Subdomain <span className="text-red-500">*</span></label>
                <div className="flex items-center gap-2">
                  <input
                    required
                    type="text"
                    placeholder="harmoni2"
                    value={addForm.subdomain}
                    onChange={(e) => {
                      const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"");
                      setAddForm({ ...addForm, subdomain: v });
                      setSubAvail(null);
                    }}
                    onBlur={() => checkSubdomain(addForm.subdomain)}
                    maxLength={30}
                    className="flex-1 p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-mono"
                  />
                  <span className="text-[10px] text-slate-500 font-mono shrink-0 bg-white/60 px-2 py-1.5 rounded-lg border border-white/60">
                    .{APP_DOMAIN}
                  </span>
                </div>
                {checkingSub && <p className="text-slate-500 mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[13px] animate-spin">sync</span> Memeriksa...</p>}
                {!checkingSub && subAvailable === true  && <p className="text-emerald-700 font-bold mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">check_circle</span> Tersedia</p>}
                {!checkingSub && subAvailable === false && <p className="text-red-600 font-bold mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">cancel</span> Sudah dipakai</p>}
                <p className="text-[10px] text-slate-400 mt-1">Hanya huruf kecil, angka, dan tanda hubung. Min. 3 karakter.</p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tagline / Deskripsi Singkat</label>
                <input
                  type="text"
                  placeholder="Hunian nyaman dekat kampus"
                  value={addForm.tagline}
                  onChange={(e) => setAddForm({ ...addForm, tagline: e.target.value })}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Alamat Lengkap</label>
                <textarea
                  rows={2}
                  placeholder="Jl. Contoh No. 1, Kota..."
                  value={addForm.alamat}
                  onChange={(e) => setAddForm({ ...addForm, alamat: e.target.value })}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nomor WhatsApp Pengelola</label>
                <input
                  type="text"
                  placeholder="08xxxxxxxxxx"
                  value={addForm.telepon}
                  onChange={(e) => setAddForm({ ...addForm, telepon: e.target.value })}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/60">
                <button type="button" onClick={() => setShowAdd(false)} className="skeu-button-secondary px-4 py-2 rounded-xl font-bold">
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={addLoading || !subAvailable}
                  className="skeu-button px-5 py-2 rounded-xl font-bold shadow-md disabled:opacity-60 flex items-center gap-1.5"
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
          <div className="skeu-card p-5 sm:p-6 rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/60">
              <div>
                <h3 className="font-black text-sm text-slate-900">Edit Cabang</h3>
                <p className="text-[11px] font-mono text-primary">{editTarget.subdomain}.{APP_DOMAIN}</p>
              </div>
              <button onClick={() => setEditTarget(null)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleEdit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Cabang <span className="text-red-500">*</span></label>
                <input
                  required
                  type="text"
                  value={editForm.nama}
                  onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-bold"
                />
              </div>

              {/* Subdomain tidak bisa diedit (menghindari link mati) */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Subdomain <span className="text-slate-400 font-normal">(tidak bisa diubah)</span></label>
                <div className="flex items-center gap-2 p-2.5 rounded-xl skeu-inset opacity-60 cursor-not-allowed">
                  <span className="font-mono font-bold text-slate-600">{editTarget.subdomain}</span>
                  <span className="text-slate-400 text-[10px]">.{APP_DOMAIN}</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tagline</label>
                <input
                  type="text"
                  value={editForm.tagline}
                  onChange={(e) => setEditForm({ ...editForm, tagline: e.target.value })}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Alamat</label>
                <textarea
                  rows={2}
                  value={editForm.alamat}
                  onChange={(e) => setEditForm({ ...editForm, alamat: e.target.value })}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nomor WhatsApp</label>
                <input
                  type="text"
                  value={editForm.telepon}
                  onChange={(e) => setEditForm({ ...editForm, telepon: e.target.value })}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/60">
                <button type="button" onClick={() => setEditTarget(null)} className="skeu-button-secondary px-4 py-2 rounded-xl font-bold">
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="skeu-button px-5 py-2 rounded-xl font-bold shadow-md disabled:opacity-60 flex items-center gap-1.5"
                >
                  {editLoading
                    ? <><span className="material-symbols-outlined text-[16px] animate-spin">sync</span> Menyimpan...</>
                    : <><span className="material-symbols-outlined text-[16px]">save</span> Simpan</>
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
