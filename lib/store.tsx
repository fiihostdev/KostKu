"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "./supabase-browser";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Room {
  id: string;
  nomor: string;
  lantai: number;
  tipe: "Standard" | "Deluxe" | "VIP";
  harga: number;
  status: "Terisi" | "Kosong" | "Perawatan";
  penyewa?: string;
  fasilitas: string[];
  fotoUrls?: string[];
  deskripsi?: string;
  luasM2?: number;
  branchId?: string | null;
}

export interface Tenant {
  id: string;
  nama: string;
  phone: string;
  email?: string;
  noKtp?: string;
  pekerjaan?: string;
  alamatAsal?: string;
  kamar: string;
  mulaiSewa: string;
  akhirSewa: string;
  statusBayar: "Belum Bayar" | "Lunas" | "Jatuh Tempo" | "Tertunggak";
  ktpVerified: boolean;
  branchId?: string | null;
}

export interface Invoice {
  id: string;
  noInvoice: string;
  penyewa: string;
  kamar: string;
  nominal: number;
  jatuhTempo: string;
  metode: string;
  status: "Lunas" | "Menunggu" | "Jatuh Tempo";
  branchId?: string | null;
}

export interface CashFlow {
  id: string;
  tgl: string;
  ket: string;
  kat: string;
  tipe: "Masuk" | "Keluar";
  nominal: number;
  saldo: number;
  branchId?: string | null;
}

export interface KostProfile {
  nama: string;
  subdomain: string;
  tagline: string;
  alamat: string;
  telepon: string;
  paket: string;
  bankPenerima: string;
  noRekening: string;
  logoUrl: string;
}

export interface Branch {
  id: string;
  nama: string;
  subdomain: string;
  alamat: string | null;
  telepon: string | null;
  tagline: string | null;
  is_active: boolean;
  logo_url: string | null;
}

interface KostContextType {
  kostId:            string | null;
  profile:           KostProfile;
  setProfile:        (p: KostProfile) => Promise<void>;

  // ── Multi-branch: cabang switcher ──────────────────────────────────────
  branches:          Branch[];
  activeBranchId:    string | null;             // null = kost utama
  activeBranch:      Branch | null;             // objek cabang aktif
  setActiveBranch:   (branchId: string | null) => void;
  activeNama:        string;                    // nama yg ditampilkan di header
  activeSubdomain:   string;                    // subdomain aktif

  rooms:         Room[];
  addRoom:       (r: Omit<Room, "id" | "branchId">) => Promise<void>;
  updateRoom:    (id: string, r: Partial<Omit<Room, "id">>) => Promise<void>;
  deleteRoom:    (id: string) => Promise<void>;

  tenants:       Tenant[];
  addTenant:     (t: Omit<Tenant, "id" | "branchId">) => Promise<void>;
  updateTenant:  (id: string, t: Partial<Omit<Tenant, "id">>) => Promise<void>;
  deleteTenant:  (id: string) => Promise<void>;

  invoices:      Invoice[];
  addInvoice:    (inv: Omit<Invoice, "id" | "noInvoice" | "branchId">) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  payInvoice:    (id: string) => Promise<void>;

  cashFlows:     CashFlow[];
  addCashFlow:   (cf: Omit<CashFlow, "id" | "saldo" | "branchId">) => Promise<void>;
  deleteCashFlow:(id: string) => Promise<void>;

  loading: boolean;
  stats: {
    totalKamar: number;
    kamarTerisi: number;
    kamarKosong: number;
    kamarPerawatan: number;
    okupansi: number;
    pendapatanBulanIni: number;
    tagihanTertunda: number;
    totalPenyewa: number;
  };
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const defaultProfile: KostProfile = {
  nama: "", subdomain: "", tagline: "", alamat: "", telepon: "",
  paket: "", bankPenerima: "BCA", noRekening: "", logoUrl: "",
};

const KostContext = createContext<KostContextType | undefined>(undefined);

// ─── Map helpers ─────────────────────────────────────────────────────────────

function mapRoom(r: Record<string, unknown>): Room {
  return {
    id:        r.id as string,
    nomor:     r.nomor as string,
    lantai:    r.lantai as number,
    tipe:      r.tipe as Room["tipe"],
    harga:     Number(r.harga),
    status:    r.status as Room["status"],
    penyewa:   (r.penyewa as string) || undefined,
    fasilitas: (r.fasilitas as string[]) || [],
    fotoUrls:  (r.foto_urls as string[]) || [],
    deskripsi: (r.deskripsi as string) || undefined,
    luasM2:    r.luas_m2 ? Number(r.luas_m2) : undefined,
    branchId:  (r.branch_id as string) || null,
  };
}

function mapTenant(t: Record<string, unknown>): Tenant {
  return {
    id:          t.id as string,
    nama:        t.nama as string,
    phone:       t.phone as string,
    email:       (t.email as string) || undefined,
    noKtp:       (t.no_ktp as string) || undefined,
    pekerjaan:   (t.pekerjaan as string) || undefined,
    alamatAsal:  (t.alamat_asal as string) || undefined,
    kamar:       t.kamar as string,
    mulaiSewa:   t.mulai_sewa as string,
    akhirSewa:   t.akhir_sewa as string,
    statusBayar: (t.status_bayar as Tenant["statusBayar"]) || "Belum Bayar",
    ktpVerified: Boolean(t.ktp_verified),
    branchId:    (t.branch_id as string) || null,
  };
}

function mapInvoice(i: Record<string, unknown>): Invoice {
  return {
    id:         i.id as string,
    noInvoice:  i.no_invoice as string,
    penyewa:    i.penyewa as string,
    kamar:      i.kamar as string,
    nominal:    Number(i.nominal),
    jatuhTempo: i.jatuh_tempo as string,
    metode:     (i.metode as string) || "Midtrans Payment Gateway",
    status:     i.status as Invoice["status"],
    branchId:   (i.branch_id as string) || null,
  };
}

function mapCashFlow(c: Record<string, unknown>): CashFlow {
  return {
    id:       c.id as string,
    tgl:      c.tgl as string,
    ket:      c.ket as string,
    kat:      c.kat as string,
    tipe:     c.tipe as CashFlow["tipe"],
    nominal:  Number(c.nominal),
    saldo:    Number(c.saldo),
    branchId: (c.branch_id as string) || null,
  };
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function KostProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);

  const [kostId,         setKostId]         = useState<string | null>(null);
  const [profile,        setProfileState]   = useState<KostProfile>(defaultProfile);
  const [branches,       setBranches]       = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(() => {
    // U1 FIX: Persist across page refreshes via localStorage
    if (typeof window !== "undefined") {
      return localStorage.getItem("kostku_active_branch") || null;
    }
    return null;
  });

  // useRef agar loadData bisa baca nilai terkini tanpa perlu masuk ke deps
  const activeBranchIdRef = React.useRef<string | null>(null);
  activeBranchIdRef.current = activeBranchId;

  // ── Operational data — filtered by active branch ──────────────────────────
  const [rooms,      setRooms]      = useState<Room[]>([]);
  const [tenants,    setTenants]    = useState<Tenant[]>([]);
  const [invoices,   setInvoices]   = useState<Invoice[]>([]);
  const [cashFlows,  setCashFlows]  = useState<CashFlow[]>([]);
  const [loading,    setLoading]    = useState(true);

  // ── Load data: branchId param opsional, fallback ke ref ──────────────────
  // Tidak ada activeBranchId di deps → loadData stabil, tidak loop
  const loadData = useCallback(async (branchId?: string | null) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // 1. Profil kost utama
      const { data: profileData } = await supabase
        .from("kost_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!profileData) { setLoading(false); return; }

      const kId = profileData.id as string;
      setKostId(kId);
      setProfileState({
        nama:         profileData.nama,
        subdomain:    profileData.subdomain,
        tagline:      profileData.tagline || "",
        alamat:       profileData.alamat || "",
        telepon:      profileData.telepon || "",
        paket:        profileData.paket ? profileData.paket.toLowerCase().trim().replace("paket ", "") : "starter",
        bankPenerima: profileData.bank_penerima || "BCA",
        noRekening:   profileData.no_rekening || "",
        logoUrl:      profileData.logo_url || "",
      });

      // 2. Daftar semua cabang milik kost ini (hanya yang aktif)
      const { data: branchesData } = await supabase
        .from("kost_branches")
        .select("id, nama, subdomain, alamat, telepon, tagline, is_active, logo_url")
        .eq("kost_id", kId)
        .eq("is_active", true)
        .order("created_at", { ascending: true });
      setBranches((branchesData || []) as Branch[]);

      // 3. Tentukan filter branch:
      //    - Jika param branchId diberikan eksplisit → gunakan itu
      //    - Jika tidak → baca dari ref (nilai terkini activeBranchId)
      //    - null  → load data kost UTAMA (branch_id IS NULL)
      //    - uuid  → load data CABANG (branch_id = uuid)
      const targetBranchId = branchId !== undefined ? branchId : activeBranchIdRef.current;

      // 4–7. Load semua data operasional
      const baseRooms = supabase.from("rooms").select("*").eq("kost_id", kId);
      const { data: roomsData } = await (targetBranchId
        ? baseRooms.eq("branch_id", targetBranchId)
        : baseRooms.is("branch_id", null)).order("nomor", { ascending: true });
      setRooms((roomsData || []).map(mapRoom));

      const baseTenants = supabase.from("tenants").select("*").eq("kost_id", kId);
      const { data: tenantsData } = await (targetBranchId
        ? baseTenants.eq("branch_id", targetBranchId)
        : baseTenants.is("branch_id", null)).order("created_at", { ascending: false });
      setTenants((tenantsData || []).map(mapTenant));

      const baseInvoices = supabase.from("invoices").select("*").eq("kost_id", kId);
      const { data: invoicesData } = await (targetBranchId
        ? baseInvoices.eq("branch_id", targetBranchId)
        : baseInvoices.is("branch_id", null)).order("created_at", { ascending: false });
      setInvoices((invoicesData || []).map(mapInvoice));

      const baseCash = supabase.from("cash_flows").select("*").eq("kost_id", kId);
      const { data: cashData } = await (targetBranchId
        ? baseCash.eq("branch_id", targetBranchId)
        : baseCash.is("branch_id", null)).order("created_at", { ascending: false });
      setCashFlows((cashData || []).map(mapCashFlow));

    } catch (err) {
      console.error("[KostProvider] loadData error:", err);
    } finally {
      setLoading(false);
    }
  // PENTING: activeBranchId TIDAK masuk deps — dibaca via ref.
  // Ini mencegah loadData berubah setiap branch switch → mencegah loop.
  }, [supabase]);

  // ── Initial load + auth listener ──────────────────────────────────────────
  useEffect(() => {
    loadData();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") loadData();
      if (event === "SIGNED_OUT") {
        setKostId(null);
        setProfileState(defaultProfile);
        setBranches([]);
        setActiveBranchId(null);
        // Clear persisted branch on logout
        if (typeof window !== "undefined") localStorage.removeItem("kostku_active_branch");
        setRooms([]); setTenants([]); setInvoices([]); setCashFlows([]);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [loadData]);

  // ── Realtime — fires on any change to this kost's data ───────────────────
  // loadData akan membaca activeBranchIdRef.current → selalu filter yang benar
  useEffect(() => {
    if (!kostId) return;
    const channel = supabase
      .channel(`kost_${kostId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms",      filter: `kost_id=eq.${kostId}` }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "tenants",    filter: `kost_id=eq.${kostId}` }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices",   filter: `kost_id=eq.${kostId}` }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "cash_flows", filter: `kost_id=eq.${kostId}` }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [kostId, loadData]); // activeBranchId TIDAK di deps — loadData baca via ref

  // ── Branch switcher — reload data when user switches branch ──────────────
  const handleSetActiveBranch = useCallback((branchId: string | null) => {
    setActiveBranchId(branchId);
    // U1 FIX: Persist to localStorage so refresh restores the correct branch
    if (typeof window !== "undefined") {
      if (branchId) {
        localStorage.setItem("kostku_active_branch", branchId);
      } else {
        localStorage.removeItem("kostku_active_branch");
      }
    }
    loadData(branchId);
  }, [loadData]);

  // ── Computed: nama dan subdomain aktif ────────────────────────────────────
  const activeBranch = branches.find((b) => b.id === activeBranchId) || null;
  const activeNama      = activeBranch ? activeBranch.nama      : profile.nama;
  const activeSubdomain = activeBranch ? activeBranch.subdomain : profile.subdomain;

  // ── revalidate halaman publik ─────────────────────────────────────────────
  const triggerRevalidate = useCallback(async () => {
    const sub = activeBranch ? activeBranch.subdomain : profile.subdomain;
    if (!sub) return;
    try {
      await fetch("/api/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subdomain: sub }),
      });
    } catch {}
  }, [activeBranch, profile.subdomain]);

  // ── setProfile ────────────────────────────────────────────────────────────
  const setProfile = async (newProfile: KostProfile) => {
    setProfileState(newProfile);
    if (!kostId) return;
    await supabase
      .from("kost_profiles")
      .update({
        nama:         newProfile.nama,
        subdomain:    newProfile.subdomain,
        tagline:      newProfile.tagline,
        alamat:       newProfile.alamat,
        telepon:      newProfile.telepon,
        paket:        newProfile.paket,
        bank_penerima:newProfile.bankPenerima,
        no_rekening:  newProfile.noRekening,
        logo_url:     newProfile.logoUrl || null,
      })
      .eq("id", kostId);
    if (newProfile.subdomain) {
      try {
        await fetch("/api/revalidate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subdomain: newProfile.subdomain }),
        });
      } catch {}
    }
  };

  // ── addRoom ───────────────────────────────────────────────────────────────
  const addRoom = async (roomData: Omit<Room, "id" | "branchId">) => {
    if (!kostId) return;
    const res = await fetch("/api/rooms/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nomor:     roomData.nomor,
        lantai:    roomData.lantai,
        tipe:      roomData.tipe,
        harga:     roomData.harga,
        status:    roomData.status,
        penyewa:   roomData.penyewa || null,
        fasilitas: roomData.fasilitas,
        branch_id: activeBranchId || null,   // ← inject branch context
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal menambahkan kamar");
    if (data.room) {
      setRooms((prev) => [mapRoom(data.room as Record<string, unknown>), ...prev]);
      triggerRevalidate();
    }
  };

  // ── deleteRoom ────────────────────────────────────────────────────────────
  const deleteRoom = async (id: string) => {
    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (!error) { setRooms((prev) => prev.filter((r) => r.id !== id)); triggerRevalidate(); }
  };

  // ── updateRoom ────────────────────────────────────────────────────────────
  const updateRoom = async (id: string, roomData: Partial<Omit<Room, "id">>) => {
    const p: Record<string, unknown> = {};
    if (roomData.nomor     !== undefined) p.nomor     = roomData.nomor;
    if (roomData.lantai    !== undefined) p.lantai    = roomData.lantai;
    if (roomData.tipe      !== undefined) p.tipe      = roomData.tipe;
    if (roomData.harga     !== undefined) p.harga     = roomData.harga;
    if (roomData.status    !== undefined) p.status    = roomData.status;
    if (roomData.penyewa   !== undefined) p.penyewa   = roomData.penyewa || null;
    if (roomData.fasilitas !== undefined) p.fasilitas = roomData.fasilitas;
    if (roomData.fotoUrls  !== undefined) p.foto_urls = roomData.fotoUrls;
    if (roomData.deskripsi !== undefined) p.deskripsi = roomData.deskripsi || null;
    if (roomData.luasM2    !== undefined) p.luas_m2   = roomData.luasM2 || null;
    const { error } = await supabase.from("rooms").update(p).eq("id", id);
    if (!error) { setRooms((prev) => prev.map((r) => r.id === id ? { ...r, ...roomData } : r)); triggerRevalidate(); }
  };

  // ── addTenant ─────────────────────────────────────────────────────────────
  const addTenant = async (tenantData: Omit<Tenant, "id" | "branchId">) => {
    if (!kostId) return;
    const { data, error } = await supabase
      .from("tenants")
      .insert({
        kost_id:      kostId,
        branch_id:    activeBranchId || null,   // ← inject branch context
        nama:         tenantData.nama,
        phone:        tenantData.phone,
        email:        tenantData.email       || null,
        no_ktp:       tenantData.noKtp       || null,
        pekerjaan:    tenantData.pekerjaan   || null,
        alamat_asal:  tenantData.alamatAsal  || null,
        kamar:        tenantData.kamar,
        mulai_sewa:   tenantData.mulaiSewa,
        akhir_sewa:   tenantData.akhirSewa,
        status_bayar: tenantData.statusBayar,
        ktp_verified: tenantData.ktpVerified,
      })
      .select()
      .single();

    if (!error && data) {
      setTenants((prev) => [mapTenant(data as Record<string, unknown>), ...prev]);
      // Update kamar → Terisi
      const roomNomor = tenantData.kamar.replace(/^kamar\s*/i, "").trim();
      const room = rooms.find((r) => r.nomor.toLowerCase() === roomNomor.toLowerCase());
      if (room) {
        await supabase.from("rooms").update({ status: "Terisi", penyewa: tenantData.nama }).eq("id", room.id);
        setRooms((prev) => prev.map((r) => r.id === room.id ? { ...r, status: "Terisi", penyewa: tenantData.nama } : r));
        triggerRevalidate();
      }
    }
  };

  // ── updateTenant ──────────────────────────────────────────────────────────
  const updateTenant = async (id: string, tenantData: Partial<Omit<Tenant, "id">>) => {
    const p: Record<string, unknown> = {};
    if (tenantData.nama        !== undefined) p.nama         = tenantData.nama;
    if (tenantData.phone       !== undefined) p.phone        = tenantData.phone;
    if (tenantData.email       !== undefined) p.email        = tenantData.email || null;
    if (tenantData.noKtp       !== undefined) p.no_ktp       = tenantData.noKtp || null;
    if (tenantData.pekerjaan   !== undefined) p.pekerjaan    = tenantData.pekerjaan || null;
    if (tenantData.alamatAsal  !== undefined) p.alamat_asal  = tenantData.alamatAsal || null;
    if (tenantData.kamar       !== undefined) p.kamar        = tenantData.kamar;
    if (tenantData.mulaiSewa   !== undefined) p.mulai_sewa   = tenantData.mulaiSewa;
    if (tenantData.akhirSewa   !== undefined) p.akhir_sewa   = tenantData.akhirSewa;
    if (tenantData.statusBayar !== undefined) p.status_bayar = tenantData.statusBayar;
    if (tenantData.ktpVerified !== undefined) p.ktp_verified = tenantData.ktpVerified;
    const { error } = await supabase.from("tenants").update(p).eq("id", id);
    if (!error) setTenants((prev) => prev.map((t) => t.id === id ? { ...t, ...tenantData } : t));
  };

  // ── deleteTenant ──────────────────────────────────────────────────────────
  const deleteTenant = async (id: string) => {
    const tenant = tenants.find((t) => t.id === id);
    const { error } = await supabase.from("tenants").delete().eq("id", id);
    if (!error) {
      setTenants((prev) => prev.filter((t) => t.id !== id));
      if (tenant?.kamar) {
        const roomNomor = tenant.kamar.replace(/^kamar\s*/i, "").trim();
        const room = rooms.find((r) => r.nomor.toLowerCase() === roomNomor.toLowerCase());
        if (room && room.status === "Terisi") {
          await supabase.from("rooms").update({ status: "Kosong", penyewa: null }).eq("id", room.id);
          setRooms((prev) => prev.map((r) => r.id === room.id ? { ...r, status: "Kosong", penyewa: undefined } : r));
          triggerRevalidate();
        }
      }
    }
  };

  // ── addInvoice ────────────────────────────────────────────────────────────
  const addInvoice = async (invData: Omit<Invoice, "id" | "noInvoice" | "branchId">) => {
    if (!kostId) return;
    const now = new Date();
    const year  = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    // Nomor invoice per-cabang: INV/YYYY/MM/BRANCHPREFIX/SEQ
    const prefix = activeBranchId ? `C${activeBranchId.slice(-4).toUpperCase()}` : "M";
    const seq = String(invoices.length + 1).padStart(3, "0");
    const noInvoice = `INV/${year}/${month}/${prefix}/${seq}`;

    const { data, error } = await supabase
      .from("invoices")
      .insert({
        kost_id:    kostId,
        branch_id:  activeBranchId || null,   // ← inject branch context
        no_invoice: noInvoice,
        penyewa:    invData.penyewa,
        kamar:      invData.kamar,
        nominal:    invData.nominal,
        jatuh_tempo:invData.jatuhTempo,
        metode:     invData.metode,
        status:     invData.status,
      })
      .select()
      .single();

    if (!error && data) setInvoices((prev) => [mapInvoice(data as Record<string, unknown>), ...prev]);
  };

  // ── deleteInvoice ─────────────────────────────────────────────────────────
  const deleteInvoice = async (id: string) => {
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (!error) setInvoices((prev) => prev.filter((i) => i.id !== id));
  };

  // ── payInvoice ────────────────────────────────────────────────────────────
  const payInvoice = async (id: string) => {
    const inv = invoices.find((i) => i.id === id);
    if (!inv || !kostId) return;
    const { error } = await supabase.from("invoices").update({ status: "Lunas", paid_at: new Date().toISOString() }).eq("id", id);
    if (error) return;
    setInvoices((prev) => prev.map((i) => i.id === id ? { ...i, status: "Lunas" as const } : i));
    const currentSaldo = cashFlows.length > 0 ? cashFlows[0].saldo : 0;
    const tgl = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
    const { data: cfData } = await supabase
      .from("cash_flows")
      .insert({
        kost_id:   kostId,
        branch_id: activeBranchId || null,   // ← inject branch context
        tgl,
        ket:       `Pembayaran ${inv.kamar} (${inv.penyewa})`,
        kat:       "Pendapatan Sewa",
        tipe:      "Masuk",
        nominal:   inv.nominal,
        saldo:     currentSaldo + inv.nominal,
      })
      .select()
      .single();
    if (cfData) setCashFlows((prev) => [mapCashFlow(cfData as Record<string, unknown>), ...prev]);
  };

  // ── addCashFlow ───────────────────────────────────────────────────────────
  const addCashFlow = async (cfData: Omit<CashFlow, "id" | "saldo" | "branchId">) => {
    if (!kostId) return;
    const currentSaldo = cashFlows.length > 0 ? cashFlows[0].saldo : 0;
    const newSaldo = cfData.tipe === "Masuk" ? currentSaldo + cfData.nominal : currentSaldo - cfData.nominal;
    const { data, error } = await supabase
      .from("cash_flows")
      .insert({
        kost_id:   kostId,
        branch_id: activeBranchId || null,   // ← inject branch context
        tgl: cfData.tgl, ket: cfData.ket, kat: cfData.kat,
        tipe: cfData.tipe, nominal: cfData.nominal, saldo: newSaldo,
      })
      .select()
      .single();
    if (!error && data) setCashFlows((prev) => [mapCashFlow(data as Record<string, unknown>), ...prev]);
  };

  // ── deleteCashFlow ────────────────────────────────────────────────────────
  const deleteCashFlow = async (id: string) => {
    const { error } = await supabase.from("cash_flows").delete().eq("id", id);
    if (!error) setCashFlows((prev) => prev.filter((c) => c.id !== id));
  };

  // ── Derived stats (scoped ke active branch/main) ──────────────────────────
  const totalKamar          = rooms.length;
  const kamarTerisi         = rooms.filter((r) => r.status === "Terisi").length;
  const kamarKosong         = rooms.filter((r) => r.status === "Kosong").length;
  const kamarPerawatan      = rooms.filter((r) => r.status === "Perawatan").length;
  const okupansi            = totalKamar > 0 ? Math.round((kamarTerisi / totalKamar) * 100) : 0;

  // Pendapatan BULAN INI — filter invoice Lunas yang dibuat bulan ini
  const now = new Date();
  const thisYear  = now.getFullYear();
  const thisMonth = now.getMonth(); // 0-indexed
  const pendapatanBulanIni = invoices
    .filter((i) => {
      if (i.status !== "Lunas") return false;
      try {
        const d = new Date(i.jatuhTempo || "");
        return d.getFullYear() === thisYear && d.getMonth() === thisMonth;
      } catch {
        return true; // fallback: include all if date invalid
      }
    })
    .reduce((s, i) => s + i.nominal, 0);

  const tagihanTertunda     = invoices.filter((i) => i.status !== "Lunas").reduce((s, i) => s + i.nominal, 0);
  const totalPenyewa        = tenants.length;

  return (
    <KostContext.Provider value={{
      kostId, profile, setProfile,
      branches, activeBranchId, activeBranch, setActiveBranch: handleSetActiveBranch,
      activeNama, activeSubdomain,
      rooms, addRoom, updateRoom, deleteRoom,
      tenants, addTenant, updateTenant, deleteTenant,
      invoices, addInvoice, deleteInvoice, payInvoice,
      cashFlows, addCashFlow, deleteCashFlow,
      loading,
      stats: { totalKamar, kamarTerisi, kamarKosong, kamarPerawatan, okupansi, pendapatanBulanIni, tagihanTertunda, totalPenyewa },
    }}>
      {children}
    </KostContext.Provider>
  );
}

export function useKost() {
  const context = useContext(KostContext);
  if (!context) throw new Error("useKost must be used within a KostProvider");
  return context;
}
