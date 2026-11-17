"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "manajementkost.my.id";

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  max_kamar: number | null;  // null = ikuti batas paket (tidak ada override)
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

type ActiveTab = "overview" | "tenants" | "plans" | "payment" | "logs" | "settings";

// â”€â”€ Activity Log type â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface ActivityLog {
  id: string;
  action: string;
  target: string;
  detail: string;
  timestamp: string;
  by: string;
}

const PLAN_COLORS: Record<string, string> = {
  starter:          "bg-slate-100 text-slate-800",
  "paket starter":  "bg-slate-100 text-slate-800",
  pro:              "bg-primary/10 text-primary",
  "paket pro":      "bg-primary/10 text-primary",
  enterprise:       "bg-amber-100 text-amber-800",
  "paket enterprise":"bg-amber-100 text-amber-800",
};

/** Normalize paket slug â†’ display label */
function planLabel(paket: string): string {
  const p = paket.toLowerCase().trim().replace("paket ", "");
  if (p === "starter")    return "Paket Starter";
  if (p === "pro")        return "Paket Pro";
  if (p === "enterprise") return "Paket Enterprise";
  // If name was stored instead of slug, return as-is
  return paket;
}

/** Normalize to base slug for color lookup */
function planSlug(paket: string): string {
  return paket.toLowerCase().trim().replace("paket ", "");
}

// â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function SuperadminDashboardPage() {
  // useMemo agar supabase stabil â€” tidak re-create setiap render
  const supabase = useMemo(() => createClient(), []);

  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [tenants, setTenants] = useState<KostTenant[]>([]);
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [filterPaket, setFilterPaket] = useState("Semua");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Modal states
  const [editTenant, setEditTenant] = useState<KostTenant | null>(null);
  const [editPlan, setEditPlan] = useState<PlatformPlan | null>(null);
  const [showAddPlan, setShowAddPlan] = useState(false);

  // â”€â”€ Platform Payment Config state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [platformPayConfig, setPlatformPayConfig] = useState<Record<string, string>>({});
  const [payConfigLoading, setPayConfigLoading] = useState(false);
  const [payConfigSaving,  setPayConfigSaving]  = useState(false);
  const [qrisUploading,    setQrisUploading]    = useState(false);
  const [payConfigTab,     setPayConfigTab]     = useState<"midtrans"|"tripay"|"xendit"|"qris"|"transfer">("midtrans");

  // Suspend modal â€” ganti prompt() native
  const [suspendTarget, setSuspendTarget] = useState<KostTenant | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendLoading, setSuspendLoading] = useState(false);

  // Delete modal â€” ganti confirm() native
  const [deleteTarget, setDeleteTarget] = useState<KostTenant | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // Helper: tambah activity log ke DB DAN in-memory
  const addLog = useCallback(async (action: string, target: string, detail: string) => {
    const log: ActivityLog = {
      id: Date.now().toString(),
      action,
      target,
      detail,
      timestamp: new Date().toISOString(),
      by: "superadmin",
    };
    setActivityLogs((prev) => [log, ...prev].slice(0, 100));

    // Persist ke database
    try {
      await fetch("/api/superadmin/activity-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, target, detail }),
      });
    } catch {
      // silent â€” in-memory log tetap tersimpan
    }
  }, []);

  // â”€â”€ Load semua data platform â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
              paket: p.paket ? p.paket.toLowerCase().trim().replace("paket ", "") : "starter",
              telepon: p.telepon || "",
              alamat: p.alamat || "",
              role: p.role || "admin",
              is_suspended: p.is_suspended || false,
              suspended_reason: p.suspended_reason || null,
              max_kamar: p.max_kamar ?? null,
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

  // â”€â”€ Platform MRR stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [platformStats, setPlatformStats] = useState<{
    mrr: number; arr: number; expiringSoon: number; newThisMonth: number;
  } | null>(null);

  useEffect(() => { loadData(); }, [loadData]);

  // Load platform stats, activity logs, AND payment config
  useEffect(() => {
    // Load MRR stats
    fetch("/api/superadmin/stats")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setPlatformStats(d); })
      .catch(() => {});

    // Load persisted activity logs
    fetch("/api/superadmin/activity-log")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.logs) {
          setActivityLogs(d.logs.map((l: { id: string; action: string; target: string; detail: string; created_at: string }) => ({
            id: l.id,
            action: l.action,
            target: l.target,
            detail: l.detail || "",
            timestamp: l.created_at,
            by: "superadmin",
          })));
        }
      })
      .catch(() => {});

    // Load platform payment config
    setPayConfigLoading(true);
    fetch("/api/superadmin/platform-payment")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.config) setPlatformPayConfig(d.config); })
      .catch(() => {})
      .finally(() => setPayConfigLoading(false));
  }, []);

  // â”€â”€ Buka modal suspend â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const openSuspendModal = (tenant: KostTenant) => {
    setSuspendTarget(tenant);
    setSuspendReason("");
  };

  // â”€â”€ Konfirmasi suspend/aktifkan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const confirmToggleSuspend = async () => {
    if (!suspendTarget) return;
    setSuspendLoading(true);
    try {
      const willSuspend = !suspendTarget.is_suspended;
      const { error } = await supabase
        .from("kost_profiles")
        .update({
          is_suspended: willSuspend,
          suspended_reason: willSuspend ? suspendReason.trim() || "Pelanggaran kebijakan" : null,
        })
        .eq("id", suspendTarget.id);

      if (error) throw error;

      addLog(
        willSuspend ? "SUSPEND" : "AKTIFKAN",
        suspendTarget.nama,
        willSuspend ? `Alasan: ${suspendReason || "tidak disebutkan"}` : "Kost diaktifkan kembali"
      );
      showToast("success", willSuspend ? `Kost "${suspendTarget.nama}" disuspend.` : `Kost "${suspendTarget.nama}" diaktifkan.`);
      setSuspendTarget(null);
      loadData();
    } catch (err) {
      showToast("error", "Gagal: " + String(err));
    } finally {
      setSuspendLoading(false);
    }
  };

  // â”€â”€ Konfirmasi hapus tenant â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const confirmDeleteTenant = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const { error } = await supabase.from("kost_profiles").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      addLog("HAPUS", deleteTarget.nama, `Subdomain: ${deleteTarget.subdomain}`);
      showToast("success", "Kost berhasil dihapus permanen.");
      setDeleteTarget(null);
      setDeleteConfirmText("");
      loadData();
    } catch (err) {
      showToast("error", "Gagal hapus: " + String(err));
    } finally {
      setDeleteLoading(false);
    }
  };

  // â”€â”€ Update tenant â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const saveTenantEdit = async () => {
    if (!editTenant) return;
    // Normalize paket to slug before saving
    const paketSlug = editTenant.paket.toLowerCase().trim().replace("paket ", "");
    const { error } = await supabase
      .from("kost_profiles")
      .update({
        paket: paketSlug,
        max_kamar: editTenant.max_kamar && editTenant.max_kamar > 0 ? editTenant.max_kamar : null,
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
      addLog("EDIT", editTenant.nama, `Paket: ${planLabel(paketSlug)} Â· Max kamar: ${editTenant.max_kamar}`);
      showToast("success", "Data kost berhasil diperbarui!");
      setEditTenant(null);
      loadData();
    }
  };

  // â”€â”€ Save plan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Hapus tenant â€” buka modal konfirmasi â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const deleteTenant = (tenant: KostTenant) => {
    setDeleteTarget(tenant);
    setDeleteConfirmText("");
  };

  // â”€â”€ Save platform payment config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const savePlatformPayConfig = async () => {
    setPayConfigSaving(true);
    try {
      const res = await fetch("/api/superadmin/platform-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(platformPayConfig),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      addLog("PAYMENT_CONFIG", "Platform", `Tersimpan ${data.saved} konfigurasi`);
      showToast("success", "Konfigurasi payment platform berhasil disimpan!");
    } catch (err) {
      showToast("error", "Gagal: " + String(err));
    } finally {
      setPayConfigSaving(false);
    }
  };

  // â”€â”€ Upload QRIS image â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleQrisUpload = async (file: File) => {
    setQrisUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/superadmin/platform-qris", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload gagal");
      setPlatformPayConfig((prev) => ({ ...prev, qris_image_url: data.url }));
      showToast("success", "QR Code berhasil diupload!");
    } catch (err) {
      showToast("error", "Upload gagal: " + String(err));
    } finally {
      setQrisUploading(false);
    }
  };

  // â”€â”€ Derived stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    const matchPaket = filterPaket === "Semua" || planSlug(t.paket) === filterPaket.toLowerCase();
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

      {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Platform Master Control</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Superadmin Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola seluruh {tenants.length} kost Â· {totalPenyewa} penyewa Â· platform KOSTKU
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

      {/* â”€â”€ KPI Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Kost", val: tenants.length.toString(), sub: `${activeTenants.length} Aktif`, color: "text-primary", icon: "domain" },
          { label: "Suspended", val: suspendedTenants.length.toString(), sub: "Perlu Perhatian", color: suspendedTenants.length > 0 ? "text-red-600" : "text-slate-400", icon: "block" },
          { label: "Total Kamar", val: totalKamar.toString(), sub: `${avgOkupansi}% Terisi`, color: "text-slate-900", icon: "bed" },
          { label: "Total Penyewa", val: totalPenyewa.toString(), sub: "Aktif Huni", color: "text-indigo-600", icon: "group" },
          {
            label: "MRR Platform",
            val: platformStats ? `Rp ${(platformStats.mrr / 1000000).toFixed(1)} Jt` : "...",
            sub: platformStats ? `ARR Rp ${(platformStats.arr / 1000000).toFixed(0)} Jt` : "Memuat...",
            color: "text-emerald-700",
            icon: "trending_up",
          },
          {
            label: "Expire Soon",
            val: platformStats ? platformStats.expiringSoon.toString() : "...",
            sub: platformStats ? `${platformStats.newThisMonth} baru bulan ini` : "...",
            color: platformStats?.expiringSoon ? "text-amber-600" : "text-slate-400",
            icon: "schedule",
          },
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

      {/* â”€â”€ Tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-white/60">
        {[
          { id: "overview",  label: "Overview",          icon: "dashboard" },
          { id: "tenants",   label: "Kelola Kost",       icon: "domain" },
          { id: "plans",     label: "Kelola Paket",      icon: "sell" },
          { id: "payment",   label: "Payment Gateway",   icon: "payment" },
          { id: "logs",      label: `Activity Log ${activityLogs.length > 0 ? `(${activityLogs.length})` : ""}`, icon: "history" },
          { id: "settings",  label: "Platform Settings", icon: "settings" },
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

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* TAB: OVERVIEW */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Revenue by Paket */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {["starter", "pro", "enterprise"].map((slug) => {
              const planTenants = tenants.filter((t) => planSlug(t.paket) === slug);
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
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PLAN_COLORS[planSlug(t.paket)] || "bg-slate-100 text-slate-800"}`}>
                      {planLabel(t.paket)}
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

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* TAB: KELOLA KOST (TENANTS) */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
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
                        <div className="text-[10px] text-slate-500">{t.email || t.telepon || "â€”"}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-primary text-[11px]">
                        <a href={`https://${t.subdomain}.${process.env.NEXT_PUBLIC_APP_DOMAIN || "manajementkost.my.id"}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {t.subdomain}.{process.env.NEXT_PUBLIC_APP_DOMAIN || "manajementkost.my.id"}
                        </a>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PLAN_COLORS[planSlug(t.paket)] || "bg-slate-100 text-slate-800"}`}>
                          {planLabel(t.paket)}
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
                            onClick={() => openSuspendModal(t)}
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

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* TAB: KELOLA PAKET */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
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
              const countTenants = tenants.filter((t) => planSlug(t.paket) === plan.slug).length;
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
                        <span className="font-black text-slate-900">{plan.max_kamar === 999 ? "âˆž" : plan.max_kamar}</span>
                      </div>
                      <div className="skeu-inset p-2 rounded-lg text-center">
                        <span className="text-[10px] text-slate-500 block">Max Cabang</span>
                        <span className="font-black text-slate-900">{plan.max_cabang === 99 ? "âˆž" : plan.max_cabang}</span>
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

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* TAB: PAYMENT GATEWAY PLATFORM                                        */}
      {/* Konfigurasi untuk menerima pembayaran paket, upgrade, onboarding     */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {activeTab === "payment" && (
        <div className="space-y-5">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-slate-900">Konfigurasi Payment Gateway Platform</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Pembayaran paket baru, upgrade, dan biaya subdomain masuk ke sini.
              </p>
            </div>
            <button
              onClick={savePlatformPayConfig}
              disabled={payConfigSaving}
              className="skeu-button text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-md w-full sm:w-auto justify-center disabled:opacity-60"
            >
              <span className={`material-symbols-outlined text-[18px] ${payConfigSaving ? "animate-spin" : ""}`}>
                {payConfigSaving ? "sync" : "save"}
              </span>
              {payConfigSaving ? "Menyimpan..." : "Simpan Semua Config"}
            </button>
          </div>

          {/* Provider sub-tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 border-b border-white/60">
            {[
              { id: "midtrans", label: "Midtrans",      icon: "credit_card",    enabled: platformPayConfig.midtrans_enabled === "true" },
              { id: "tripay",   label: "Tripay",         icon: "account_balance",enabled: platformPayConfig.tripay_enabled   === "true" },
              { id: "xendit",   label: "Xendit",         icon: "credit_score",   enabled: platformPayConfig.xendit_enabled   === "true" },
              { id: "qris",     label: "QRIS Statis",    icon: "qr_code_2",      enabled: platformPayConfig.qris_enabled     === "true" },
              { id: "transfer", label: "Transfer Bank",  icon: "account_balance",enabled: platformPayConfig.transfer_enabled !== "false" },
            ].map((p) => (
              <button key={p.id}
                onClick={() => setPayConfigTab(p.id as typeof payConfigTab)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                  payConfigTab === p.id ? "skeu-button text-white shadow-sm" : "skeu-card text-slate-600"
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">{p.icon}</span>
                {p.label}
                <span className={`w-1.5 h-1.5 rounded-full ${p.enabled ? "bg-emerald-400" : "bg-slate-300"}`} />
              </button>
            ))}
          </div>

          {payConfigLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-6 justify-center">
              <span className="material-symbols-outlined text-[20px] animate-spin text-primary">sync</span>
              Memuat konfigurasi...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-4">

                {/* â”€â”€ MIDTRANS â”€â”€ */}
                {payConfigTab === "midtrans" && (
                  <div className="skeu-card p-5 rounded-2xl space-y-4 text-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-white/60">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                          <span className="material-symbols-outlined text-blue-600 text-[22px]">credit_card</span>
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 text-sm">Midtrans</h3>
                          <p className="text-[10px] text-slate-500">QRIS, VA BCA/BNI/Mandiri, GoPay, OVO, Kartu Kredit</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-600">{platformPayConfig.midtrans_enabled === "true" ? "Aktif" : "Nonaktif"}</span>
                        <div onClick={() => setPlatformPayConfig(p => ({ ...p, midtrans_enabled: p.midtrans_enabled === "true" ? "false" : "true" }))}
                          className={`w-10 h-5 rounded-full cursor-pointer relative transition-colors ${platformPayConfig.midtrans_enabled === "true" ? "bg-primary" : "bg-slate-300"}`}>
                          <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${platformPayConfig.midtrans_enabled === "true" ? "left-5" : "left-0.5"}`} />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { key: "midtrans_merchant_id", label: "Merchant ID", ph: "G123456789", type: "text", hint: "Settings â†’ Access Keys di dashboard Midtrans" },
                        { key: "midtrans_client_key",  label: "Client Key",  ph: "Mid-client-xxxxxxxx", type: "text", hint: "Untuk inisialisasi Snap di frontend" },
                        { key: "midtrans_server_key",  label: "Server Key (Rahasia)", ph: "Mid-server-xxxxxxxx", type: "password", hint: "Untuk buat transaksi & verify webhook" },
                      ].map((f) => (
                        <div key={f.key} className={f.key === "midtrans_server_key" ? "sm:col-span-2" : ""}>
                          <label className="font-bold text-slate-700 block mb-1">{f.label}</label>
                          <input type={f.type} placeholder={f.ph}
                            value={platformPayConfig[f.key] || ""}
                            onChange={(e) => setPlatformPayConfig(p => ({ ...p, [f.key]: e.target.value }))}
                            className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-mono text-[11px]"
                          />
                          {f.hint && <p className="text-[9px] text-slate-400 mt-0.5">{f.hint}</p>}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-700">Mode:</span>
                      {["false", "true"].map((v) => (
                        <button key={v} onClick={() => setPlatformPayConfig(p => ({ ...p, midtrans_is_production: v }))}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${platformPayConfig.midtrans_is_production === v ? (v === "true" ? "bg-emerald-600 text-white shadow-sm" : "skeu-button shadow-sm") : "skeu-card text-slate-500"}`}>
                          {v === "false" ? "ðŸ§ª Sandbox" : "ðŸš€ Production (Live)"}
                        </button>
                      ))}
                    </div>
                    <div className={`p-2.5 rounded-xl text-[11px] flex items-center gap-2 ${platformPayConfig.midtrans_is_production === "true" ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-amber-50 border border-amber-200 text-amber-800"}`}>
                      <span className="material-symbols-outlined text-[14px]">{platformPayConfig.midtrans_is_production === "true" ? "check_circle" : "science"}</span>
                      {platformPayConfig.midtrans_is_production === "true" ? "Production aktif â€” transaksi nyata akan diproses." : "Sandbox â€” tidak ada uang nyata. Gunakan kartu test Midtrans."}
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[10px] text-blue-800 space-y-1">
                      <p className="font-bold">ðŸ“‹ Cara mendapatkan API Key:</p>
                      <p>1. Login ke <strong>dashboard.midtrans.com</strong></p>
                      <p>2. Settings â†’ Access Keys â†’ Salin Merchant ID, Server Key & Client Key</p>
                      <p>3. Webhook URL: <code className="bg-white px-1 rounded">{process.env.NEXT_PUBLIC_APP_URL || "https://fiihost.my.id"}/api/payment/webhook?provider=midtrans</code></p>
                    </div>
                  </div>
                )}

                {/* â”€â”€ TRIPAY â”€â”€ */}
                {payConfigTab === "tripay" && (
                  <div className="skeu-card p-5 rounded-2xl space-y-4 text-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-white/60">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                          <span className="material-symbols-outlined text-emerald-600 text-[22px]">account_balance</span>
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 text-sm">Tripay</h3>
                          <p className="text-[10px] text-slate-500">QRIS, Transfer Bank, Minimarket (Alfamart, Indomaret)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-600">{platformPayConfig.tripay_enabled === "true" ? "Aktif" : "Nonaktif"}</span>
                        <div onClick={() => setPlatformPayConfig(p => ({ ...p, tripay_enabled: p.tripay_enabled === "true" ? "false" : "true" }))}
                          className={`w-10 h-5 rounded-full cursor-pointer relative transition-colors ${platformPayConfig.tripay_enabled === "true" ? "bg-emerald-500" : "bg-slate-300"}`}>
                          <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${platformPayConfig.tripay_enabled === "true" ? "left-5" : "left-0.5"}`} />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { key: "tripay_merchant_code", label: "Merchant Code", ph: "T12345", type: "text", hint: "Dari dashboard Tripay â†’ Akun" },
                        { key: "tripay_channel",       label: "Channel Default", ph: "QRIS", type: "text", hint: "QRIS, BRIVA, MANDIRIVA, BCAVA, dll" },
                        { key: "tripay_api_key",       label: "API Key (Rahasia)", ph: "DEV-xxxxxxxxx", type: "password", hint: "Tripay â†’ Akun â†’ API" },
                        { key: "tripay_private_key",   label: "Private Key (Rahasia)", ph: "xxxxxxxxxxxxxxxx", type: "password", hint: "Untuk verifikasi signature webhook" },
                      ].map((f) => (
                        <div key={f.key}>
                          <label className="font-bold text-slate-700 block mb-1">{f.label}</label>
                          <input type={f.type} placeholder={f.ph}
                            value={platformPayConfig[f.key] || ""}
                            onChange={(e) => setPlatformPayConfig(p => ({ ...p, [f.key]: e.target.value }))}
                            className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-mono text-[11px]"
                          />
                          {f.hint && <p className="text-[9px] text-slate-400 mt-0.5">{f.hint}</p>}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-700">Mode:</span>
                      {["false", "true"].map((v) => (
                        <button key={v} onClick={() => setPlatformPayConfig(p => ({ ...p, tripay_is_production: v }))}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${platformPayConfig.tripay_is_production === v ? (v === "true" ? "bg-emerald-600 text-white shadow-sm" : "skeu-button shadow-sm") : "skeu-card text-slate-500"}`}>
                          {v === "false" ? "ðŸ§ª Sandbox" : "ðŸš€ Production (Live)"}
                        </button>
                      ))}
                    </div>
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] text-emerald-800 space-y-1">
                      <p className="font-bold">ðŸ“‹ Setup Tripay:</p>
                      <p>1. Login ke <strong>tripay.co.id</strong> â†’ Akun â†’ API</p>
                      <p>2. Salin Merchant Code, API Key, dan Private Key</p>
                      <p>3. Callback URL: <code className="bg-white px-1 rounded">{process.env.NEXT_PUBLIC_APP_URL || "https://fiihost.my.id"}/api/payment/webhook?provider=tripay</code></p>
                    </div>
                  </div>
                )}

                {/* â”€â”€ XENDIT â”€â”€ */}
                {payConfigTab === "xendit" && (
                  <div className="skeu-card p-5 rounded-2xl space-y-4 text-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-white/60">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                          <span className="material-symbols-outlined text-violet-600 text-[22px]">credit_score</span>
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 text-sm">Xendit</h3>
                          <p className="text-[10px] text-slate-500">Virtual Account, E-Wallet, Kartu Kredit, QR Code</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-600">{platformPayConfig.xendit_enabled === "true" ? "Aktif" : "Nonaktif"}</span>
                        <div onClick={() => setPlatformPayConfig(p => ({ ...p, xendit_enabled: p.xendit_enabled === "true" ? "false" : "true" }))}
                          className={`w-10 h-5 rounded-full cursor-pointer relative transition-colors ${platformPayConfig.xendit_enabled === "true" ? "bg-violet-500" : "bg-slate-300"}`}>
                          <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${platformPayConfig.xendit_enabled === "true" ? "left-5" : "left-0.5"}`} />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { key: "xendit_secret_key",    label: "Secret Key (Rahasia)", ph: "xnd_development_xxxxxxxx", type: "password", hint: "Xendit Dashboard â†’ Settings â†’ API Keys" },
                        { key: "xendit_webhook_token", label: "Webhook Token (Rahasia)", ph: "xxxxxxxxxxxxxxxx", type: "password", hint: "Settings â†’ Callbacks â†’ Callback Token" },
                      ].map((f) => (
                        <div key={f.key}>
                          <label className="font-bold text-slate-700 block mb-1">{f.label}</label>
                          <input type={f.type} placeholder={f.ph}
                            value={platformPayConfig[f.key] || ""}
                            onChange={(e) => setPlatformPayConfig(p => ({ ...p, [f.key]: e.target.value }))}
                            className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-mono text-[11px]"
                          />
                          {f.hint && <p className="text-[9px] text-slate-400 mt-0.5">{f.hint}</p>}
                        </div>
                      ))}
                    </div>
                    <div className="p-3 bg-violet-50 border border-violet-100 rounded-xl text-[10px] text-violet-800 space-y-1">
                      <p className="font-bold">ðŸ“‹ Setup Xendit:</p>
                      <p>1. Login ke <strong>dashboard.xendit.co</strong></p>
                      <p>2. Settings â†’ API Keys â†’ Salin Secret Key</p>
                      <p>3. Settings â†’ Callbacks â†’ tambah URL dan salin Callback Token</p>
                      <p>4. Webhook URL: <code className="bg-white px-1 rounded">{process.env.NEXT_PUBLIC_APP_URL || "https://fiihost.my.id"}/api/payment/webhook?provider=xendit</code></p>
                    </div>
                  </div>
                )}

                {/* â”€â”€ QRIS â”€â”€ */}
                {payConfigTab === "qris" && (
                  <div className="skeu-card p-5 rounded-2xl space-y-4 text-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-white/60">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                          <span className="material-symbols-outlined text-emerald-600 text-[22px]">qr_code_2</span>
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 text-sm">QRIS Statis Platform</h3>
                          <p className="text-[10px] text-slate-500">Upload QR â€” calon admin scan untuk bayar paket</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-600">{platformPayConfig.qris_enabled === "true" ? "Aktif" : "Nonaktif"}</span>
                        <div onClick={() => setPlatformPayConfig(p => ({ ...p, qris_enabled: p.qris_enabled === "true" ? "false" : "true" }))}
                          className={`w-10 h-5 rounded-full cursor-pointer relative transition-colors ${platformPayConfig.qris_enabled === "true" ? "bg-emerald-500" : "bg-slate-300"}`}>
                          <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${platformPayConfig.qris_enabled === "true" ? "left-5" : "left-0.5"}`} />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Nama Pemilik Rekening</label>
                        <input type="text" placeholder="PT. KOSTKU INDONESIA"
                          value={platformPayConfig.qris_account_name || ""}
                          onChange={(e) => setPlatformPayConfig(p => ({ ...p, qris_account_name: e.target.value }))}
                          className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Bank/e-Wallet</label>
                        <input type="text" placeholder="DANA / GoPay / BCA / dll"
                          value={platformPayConfig.qris_bank_name || ""}
                          onChange={(e) => setPlatformPayConfig(p => ({ ...p, qris_bank_name: e.target.value }))}
                          className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-2">Upload Gambar QR Code QRIS</label>
                      <div className="flex flex-col sm:flex-row gap-4 items-start">
                        <div className="w-36 h-36 rounded-2xl skeu-inset flex items-center justify-center shrink-0 overflow-hidden">
                          {platformPayConfig.qris_image_url ? (
                            <img src={platformPayConfig.qris_image_url} alt="QR" className="w-full h-full object-contain p-2" />
                          ) : (
                            <div className="text-center">
                              <span className="material-symbols-outlined text-slate-300 text-[36px] block">qr_code_2</span>
                              <p className="text-[9px] text-slate-400 mt-1">Belum ada QR</p>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <label className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${qrisUploading ? "border-primary/40 bg-primary/5" : "border-slate-300 hover:border-primary/40 hover:bg-primary/5"}`}>
                            {qrisUploading ? <span className="material-symbols-outlined text-primary text-[28px] animate-spin">sync</span> : <span className="material-symbols-outlined text-slate-400 text-[28px]">upload_file</span>}
                            <span className="text-[11px] font-bold text-slate-600">{qrisUploading ? "Mengupload..." : "Klik untuk upload QR Code"}</span>
                            <span className="text-[9px] text-slate-400">PNG/JPG/WebP, max 2MB</span>
                            <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden" disabled={qrisUploading}
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleQrisUpload(f); }} />
                          </label>
                          {platformPayConfig.qris_image_url && (
                            <div className="flex items-center gap-2 text-[10px] text-emerald-700 font-semibold">
                              <span className="material-symbols-outlined text-[14px]">check_circle</span>
                              QR Code tersimpan di cloud
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* â”€â”€ TRANSFER BANK â”€â”€ */}
                {payConfigTab === "transfer" && (
                  <div className="skeu-card p-5 rounded-2xl space-y-4 text-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-white/60">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                          <span className="material-symbols-outlined text-slate-600 text-[22px]">account_balance</span>
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 text-sm">Transfer Bank Manual</h3>
                          <p className="text-[10px] text-slate-500">Admin konfirmasi setelah transfer diterima</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-600">{platformPayConfig.transfer_enabled !== "false" ? "Aktif" : "Nonaktif"}</span>
                        <div onClick={() => setPlatformPayConfig(p => ({ ...p, transfer_enabled: p.transfer_enabled === "false" ? "true" : "false" }))}
                          className={`w-10 h-5 rounded-full cursor-pointer relative transition-colors ${platformPayConfig.transfer_enabled !== "false" ? "bg-primary" : "bg-slate-300"}`}>
                          <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${platformPayConfig.transfer_enabled !== "false" ? "left-5" : "left-0.5"}`} />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Nama Bank</label>
                        <select value={platformPayConfig.transfer_bank_name || ""}
                          onChange={(e) => setPlatformPayConfig(p => ({ ...p, transfer_bank_name: e.target.value }))}
                          className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none cursor-pointer">
                          <option value="">-- Pilih --</option>
                          {["BCA","Mandiri","BNI","BRI","BSI","CIMB Niaga","Danamon","Permata","BTN"].map(b => <option key={b}>{b}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">No. Rekening</label>
                        <input type="text" placeholder="1234567890"
                          value={platformPayConfig.transfer_no_rekening || ""}
                          onChange={(e) => setPlatformPayConfig(p => ({ ...p, transfer_no_rekening: e.target.value }))}
                          className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-mono font-bold" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Nama Pemilik</label>
                        <input type="text" placeholder="NAMA PEMILIK REKENING"
                          value={platformPayConfig.transfer_account_name || ""}
                          onChange={(e) => setPlatformPayConfig(p => ({ ...p, transfer_account_name: e.target.value }))}
                          className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Instruksi Transfer</label>
                      <textarea rows={3} placeholder="Contoh: Transfer ke BCA 1234567890 a.n. PT. KOSTKU. Sertakan kode unik di berita transfer."
                        value={platformPayConfig.transfer_instructions || ""}
                        onChange={(e) => setPlatformPayConfig(p => ({ ...p, transfer_instructions: e.target.value }))}
                        className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none leading-relaxed" />
                    </div>
                  </div>
                )}
              </div>

              {/* Kolom kanan: status + panduan */}
              <div className="lg:col-span-4 space-y-4">
                <div className="skeu-card p-4 rounded-2xl space-y-2.5 text-xs">
                  <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-white/60">Status Metode</h3>
                  {[
                    { label: "Midtrans",      enabled: platformPayConfig.midtrans_enabled === "true", icon: "credit_card",    color: "text-blue-600",    desc: platformPayConfig.midtrans_is_production === "true" ? "Production" : "Sandbox" },
                    { label: "Tripay",        enabled: platformPayConfig.tripay_enabled   === "true", icon: "account_balance",color: "text-emerald-600", desc: platformPayConfig.tripay_is_production   === "true" ? "Production" : "Sandbox" },
                    { label: "Xendit",        enabled: platformPayConfig.xendit_enabled   === "true", icon: "credit_score",   color: "text-violet-600",  desc: platformPayConfig.xendit_is_production   === "true" ? "Production" : "Sandbox" },
                    { label: "QRIS Statis",   enabled: platformPayConfig.qris_enabled     === "true", icon: "qr_code_2",      color: "text-emerald-600", desc: platformPayConfig.qris_account_name || "Belum dikonfigurasi" },
                    { label: "Transfer Bank", enabled: platformPayConfig.transfer_enabled !== "false", icon: "account_balance",color: "text-slate-600",   desc: platformPayConfig.transfer_bank_name ? `${platformPayConfig.transfer_bank_name} Â· ${platformPayConfig.transfer_no_rekening || "-"}` : "Belum dikonfigurasi" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3 p-2.5 rounded-xl skeu-inset">
                      <span className={`material-symbols-outlined text-[20px] ${item.color}`}>{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-[12px]">{item.label}</p>
                        <p className="text-[9px] text-slate-500 truncate">{item.desc}</p>
                      </div>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${item.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {item.enabled ? "ON" : "OFF"}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="skeu-card p-4 rounded-2xl bg-primary/5 border border-primary/15 text-xs space-y-2">
                  <p className="font-bold text-primary flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">security</span>
                    Keamanan Webhook 100%
                  </p>
                  <div className="space-y-1.5 text-[11px] text-slate-600">
                    <p>âœ… <strong>Midtrans:</strong> SHA-512 signature + amount verify dari DB</p>
                    <p>âœ… <strong>Tripay:</strong> HMAC-SHA256 rawBody + timing-safe compare</p>
                    <p>âœ… <strong>Xendit:</strong> per-kost webhook token + timing-safe compare</p>
                    <p>âœ… <strong>Semua:</strong> nominal di-verify dari DB, tidak percaya body</p>
                    <p>âœ… <strong>Idempotency:</strong> duplikat webhook di-ignore otomatis</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: PLATFORM SETTINGS                                                */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "settings" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="skeu-card p-6 rounded-2xl space-y-4 text-xs">
            <h3 className="font-bold text-slate-900 text-sm pb-3 border-b border-white/60 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">settings</span>
              Platform Configuration
            </h3>
            {[
              { label: "Platform Name",      val: "KOSTKU SaaS" },
              { label: "Main Domain",        val: process.env.NEXT_PUBLIC_APP_DOMAIN || "manajementkost.my.id" },
              { label: "Kost Domain",        val: `*.${process.env.NEXT_PUBLIC_APP_DOMAIN || "manajementkost.my.id"}` },
              { label: "Total Registered",   val: `${tenants.length} kost accounts` },
              { label: "MRR Platform",       val: platformStats ? `Rp ${(platformStats.mrr / 1000000).toFixed(2)} Jt/bln` : "Memuat..." },
              { label: "ARR Platform",       val: platformStats ? `Rp ${(platformStats.arr / 1000000).toFixed(1)} Jt/thn` : "Memuat..." },
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
              { label: "Total Kost Aktif",         val: activeTenants.length.toString(),                       icon: "domain"   },
              { label: "Total Kamar Platform",      val: totalKamar.toString(),                                 icon: "bed"      },
              { label: "Total Penyewa Platform",    val: totalPenyewa.toString(),                               icon: "group"    },
              { label: "Platform Revenue (All)",    val: `Rp ${(totalPendapatan / 1000000).toFixed(2)} Jt`,    icon: "payments" },
              { label: "Avg Okupansi",              val: `${avgOkupansi}%`,                                     icon: "percent"  },
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
      {/* TAB: ACTIVITY LOG                                                     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Activity Log Superadmin</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Log tersimpan permanen di database.</p>
            </div>
            <button
              onClick={() => {
                fetch("/api/superadmin/activity-log")
                  .then((r) => r.ok ? r.json() : null)
                  .then((d) => {
                    if (d?.logs) {
                      setActivityLogs(d.logs.map((l: { id: string; action: string; target: string; detail: string; created_at: string }) => ({
                        id: l.id, action: l.action, target: l.target,
                        detail: l.detail || "", timestamp: l.created_at, by: "superadmin",
                      })));
                    }
                  });
              }}
              className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              Refresh
            </button>
          </div>
          {activityLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              <span className="material-symbols-outlined text-[40px] block mb-2">history</span>
              Belum ada aktivitas.
            </div>
          ) : (
            <div className="skeu-card rounded-2xl overflow-hidden">
              <div className="divide-y divide-white/40">
                {activityLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-4 hover:bg-white/50 transition-colors">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-[11px] ${
                      log.action === "SUSPEND" ? "bg-red-100 text-red-700" :
                      log.action === "AKTIFKAN" ? "bg-emerald-100 text-emerald-700" :
                      log.action === "HAPUS" ? "bg-red-200 text-red-900" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      <span className="material-symbols-outlined text-[16px]">
                        {log.action === "SUSPEND" ? "pause_circle" :
                         log.action === "AKTIFKAN" ? "play_circle" :
                         log.action === "HAPUS" ? "delete" : "edit"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-xs text-slate-900">{log.action}</span>
                        <span className="font-bold text-xs text-primary">{log.target}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{log.detail}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString("id-ID")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: Suspend/Aktifkan                                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {suspendTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="skeu-card p-6 rounded-2xl max-w-md w-full shadow-2xl text-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/60">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${suspendTarget.is_suspended ? "bg-emerald-100" : "bg-red-100"}`}>
                <span className={`material-symbols-outlined text-[22px] ${suspendTarget.is_suspended ? "text-emerald-600" : "text-red-600"}`}>
                  {suspendTarget.is_suspended ? "play_circle" : "pause_circle"}
                </span>
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900">
                  {suspendTarget.is_suspended ? "Aktifkan Kost" : "Suspend Kost"}
                </h3>
                <p className="text-slate-500">{suspendTarget.nama}</p>
              </div>
            </div>

            {!suspendTarget.is_suspended && (
              <div>
                <label className="font-bold text-slate-700 block mb-1">Alasan Suspend</label>
                <textarea rows={3} value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Contoh: Pembayaran bermasalah..."
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none" />
              </div>
            )}

            {suspendTarget.is_suspended && suspendTarget.suspended_reason && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
                <p className="font-bold text-[11px]">Alasan suspend sebelumnya:</p>
                <p className="text-[11px]">{suspendTarget.suspended_reason}</p>
              </div>
            )}

            <div className={`p-3 rounded-xl text-[11px] font-bold flex items-center gap-2 ${
              suspendTarget.is_suspended ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
            }`}>
              <span className="material-symbols-outlined text-[16px]">{suspendTarget.is_suspended ? "check_circle" : "warning"}</span>
              {suspendTarget.is_suspended
                ? `Kost "${suspendTarget.nama}" akan diaktifkan kembali.`
                : `Kost "${suspendTarget.nama}" akan disuspend. Admin tidak dapat mengakses dashboard.`
              }
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setSuspendTarget(null)} className="skeu-button-secondary px-4 py-2 rounded-xl font-bold">Batal</button>
              <button onClick={confirmToggleSuspend} disabled={suspendLoading}
                className={`px-5 py-2 rounded-xl font-bold shadow-md text-white disabled:opacity-70 ${suspendTarget.is_suspended ? "bg-emerald-600" : "bg-red-600"}`}>
                {suspendLoading ? "Memproses..." : suspendTarget.is_suspended ? "Ya, Aktifkan" : "Ya, Suspend"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: Hapus Permanen                                                 */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="skeu-card p-6 rounded-2xl max-w-md w-full shadow-2xl text-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/60">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-red-600 text-[22px]">delete_forever</span>
              </div>
              <div>
                <h3 className="font-black text-sm text-red-900">Hapus Permanen</h3>
                <p className="text-slate-500">{deleteTarget.nama}</p>
              </div>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-[11px] space-y-1">
              <p className="font-bold">⚠️ Tindakan ini TIDAK DAPAT dibatalkan!</p>
              <p>Semua data akan dihapus: kamar, penyewa, invoice, arus kas, booking, foto.</p>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Ketik nama kost untuk konfirmasi: <strong className="text-red-600">{deleteTarget.nama}</strong>
              </label>
              <input type="text" value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={deleteTarget.nama}
                className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-bold" />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setDeleteTarget(null)} className="skeu-button-secondary px-4 py-2 rounded-xl font-bold">Batal</button>
              <button onClick={confirmDeleteTenant}
                disabled={deleteLoading || deleteConfirmText !== deleteTarget.nama}
                className="px-5 py-2 rounded-xl font-bold text-white bg-red-600 disabled:opacity-50 shadow-md">
                {deleteLoading ? "Menghapus..." : "Hapus Permanen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: Edit Tenant                                                    */}
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
                    <option key={p.id} value={p.slug}>{p.name} — Rp {p.price_monthly.toLocaleString("id-ID")}/bln</option>
                  ))}
                  {plans.length === 0 && (
                    <>
                      <option value="starter">Paket Starter</option>
                      <option value="pro">Paket Pro</option>
                      <option value="enterprise">Paket Enterprise</option>
                    </>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Max Kamar Override</label>
                  <input type="number" min="0" placeholder="Kosong = ikuti paket"
                    value={editTenant.max_kamar ?? ""}
                    onChange={(e) => setEditTenant({ ...editTenant, max_kamar: e.target.value === "" ? null : Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-bold" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Platform Fee (%)</label>
                  <input type="number" min="0" max="30" step="0.5"
                    value={editTenant.platform_fee_pct}
                    onChange={(e) => setEditTenant({ ...editTenant, platform_fee_pct: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none" />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tanggal Kadaluarsa Paket</label>
                <input type="date"
                  value={editTenant.expires_at ? editTenant.expires_at.split("T")[0] : ""}
                  onChange={(e) => setEditTenant({ ...editTenant, expires_at: e.target.value || null })}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none" />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">No. WhatsApp Admin</label>
                <input type="text"
                  value={editTenant.telepon}
                  onChange={(e) => setEditTenant({ ...editTenant, telepon: e.target.value })}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none" />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan Internal</label>
                <textarea rows={2}
                  value={editTenant.notes || ""}
                  onChange={(e) => setEditTenant({ ...editTenant, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none" />
              </div>

              <div className="skeu-inset p-3 rounded-xl space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subdomain</span>
                  <span className="font-mono font-bold text-primary text-[11px]">{editTenant.subdomain}.{APP_DOMAIN}</span>
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
                <button onClick={() => setEditTenant(null)} className="skeu-button-secondary px-4 py-2 rounded-xl font-bold">Batal</button>
                <button onClick={saveTenantEdit} className="skeu-button px-5 py-2 rounded-xl font-bold shadow-md">Simpan Perubahan</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: Edit/Tambah Plan                                               */}
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
    setForm({ ...form, features: (form.features || []).filter((_: string, idx: number) => idx !== i) });
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
              {(form.features || []).map((f: string, i: number) => (
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
            <span className="font-bold text-slate-700">Status</span>
            <div className="flex gap-2">
              <button onClick={() => setForm({ ...form, is_active: true })}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold ${form.is_active ? "skeu-button" : "skeu-card text-slate-500"}`}>
                Aktif
              </button>
              <button onClick={() => setForm({ ...form, is_active: false })}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold ${!form.is_active ? "bg-red-100 text-red-700" : "skeu-card text-slate-500"}`}>
                Nonaktif
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="skeu-button-secondary px-4 py-2 rounded-xl font-bold">Batal</button>
            <button onClick={() => onSave(form)} className="skeu-button px-5 py-2 rounded-xl font-bold shadow-md">
              {plan ? "Simpan Perubahan" : "Tambah Paket"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
