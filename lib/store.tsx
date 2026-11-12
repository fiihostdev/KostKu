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
}

export interface CashFlow {
  id: string;
  tgl: string;
  ket: string;
  kat: string;
  tipe: "Masuk" | "Keluar";
  nominal: number;
  saldo: number;
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

interface KostContextType {
  kostId: string | null;
  profile: KostProfile;
  setProfile: (p: KostProfile) => Promise<void>;
  rooms: Room[];
  addRoom: (r: Omit<Room, "id">) => Promise<void>;
  updateRoom: (id: string, r: Partial<Omit<Room, "id">>) => Promise<void>;
  deleteRoom: (id: string) => Promise<void>;
  tenants: Tenant[];
  addTenant: (t: Omit<Tenant, "id">) => Promise<void>;
  updateTenant: (id: string, t: Partial<Omit<Tenant, "id">>) => Promise<void>;
  deleteTenant: (id: string) => Promise<void>;
  invoices: Invoice[];
  addInvoice: (inv: Omit<Invoice, "id" | "noInvoice">) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  payInvoice: (id: string) => Promise<void>;
  cashFlows: CashFlow[];
  addCashFlow: (cf: Omit<CashFlow, "id" | "saldo">) => Promise<void>;
  deleteCashFlow: (id: string) => Promise<void>;
  loading: boolean;
  stats: {
    totalKamar: number;
    kamarTerisi: number;
    kamarKosong: number;
    kamarPerawatan: number;
    okupansi: number;
    pendapatanBulanIni: number;
    tagihanTertunda: number;
  };
}

// ─── Default fallback (tampil sebelum data Supabase dimuat) ──────────────────

const defaultProfile: KostProfile = {
  nama: "",
  subdomain: "",
  tagline: "",
  alamat: "",
  telepon: "",
  paket: "",
  bankPenerima: "BCA",
  noRekening: "",
  logoUrl: "",
};

// ─── Context ─────────────────────────────────────────────────────────────────

const KostContext = createContext<KostContextType | undefined>(undefined);

// ─── Helper: map Supabase row → app types ────────────────────────────────────

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
  };
}

function mapInvoice(i: Record<string, unknown>): Invoice {
  return {
    id: i.id as string,
    noInvoice: i.no_invoice as string,
    penyewa: i.penyewa as string,
    kamar: i.kamar as string,
    nominal: Number(i.nominal),
    jatuhTempo: i.jatuh_tempo as string,
    metode: (i.metode as string) || "Midtrans Payment Gateway",
    status: i.status as Invoice["status"],
  };
}

function mapCashFlow(c: Record<string, unknown>): CashFlow {
  return {
    id: c.id as string,
    tgl: c.tgl as string,
    ket: c.ket as string,
    kat: c.kat as string,
    tipe: c.tipe as CashFlow["tipe"],
    nominal: Number(c.nominal),
    saldo: Number(c.saldo),
  };
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function KostProvider({ children }: { children: React.ReactNode }) {
  // ── KRITIS: useMemo agar instance Supabase stabil — tidak baru setiap render ──
  // Tanpa ini: supabase baru → loadData baru → useEffect loop → infinite re-render
  const supabase = useMemo(() => createClient(), []);

  const [kostId, setKostId] = useState<string | null>(null);
  const [profile, setProfileState] = useState<KostProfile>(defaultProfile);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [cashFlows, setCashFlows] = useState<CashFlow[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Load semua data milik user yang login ──────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // 1. Ambil profil kost
      const { data: profileData } = await supabase
        .from("kost_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!profileData) {
        setLoading(false);
        return;
      }

      const kId = profileData.id as string;
      setKostId(kId);
      setProfileState({
        nama: profileData.nama,
        subdomain: profileData.subdomain,
        tagline: profileData.tagline || "",
        alamat: profileData.alamat || "",
        telepon: profileData.telepon || "",
        paket: profileData.paket || "Pro Plan",
        bankPenerima: profileData.bank_penerima || "BCA",
        noRekening: profileData.no_rekening || "",
        logoUrl: profileData.logo_url || "",
      });

      // 2. Ambil kamar
      const { data: roomsData } = await supabase
        .from("rooms")
        .select("*")
        .eq("kost_id", kId)
        .order("nomor", { ascending: true });
      setRooms((roomsData || []).map(mapRoom));

      // 3. Ambil penyewa
      const { data: tenantsData } = await supabase
        .from("tenants")
        .select("*")
        .eq("kost_id", kId)
        .order("created_at", { ascending: false });
      setTenants((tenantsData || []).map(mapTenant));

      // 4. Ambil invoice
      const { data: invoicesData } = await supabase
        .from("invoices")
        .select("*")
        .eq("kost_id", kId)
        .order("created_at", { ascending: false });
      setInvoices((invoicesData || []).map(mapInvoice));

      // 5. Ambil arus kas
      const { data: cashData } = await supabase
        .from("cash_flows")
        .select("*")
        .eq("kost_id", kId)
        .order("created_at", { ascending: false });
      setCashFlows((cashData || []).map(mapCashFlow));

    } catch (err) {
      console.error("[KostProvider] loadData error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]); // supabase stabil via useMemo — tidak akan trigger ulang

  // Load saat mount + saat auth state berubah
  useEffect(() => {
    loadData();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      // TOKEN_REFRESHED TIDAK trigger loadData — hanya update session di background
      // Hanya SIGNED_IN (login baru) yang perlu load ulang
      if (event === "SIGNED_IN") {
        loadData();
      }
      if (event === "SIGNED_OUT") {
        setKostId(null);
        setProfileState(defaultProfile);
        setRooms([]);
        setTenants([]);
        setInvoices([]);
        setCashFlows([]);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [loadData]); // supabase.auth stabil — tidak perlu di deps

  // ── Realtime subscriptions ─────────────────────────────────────────────────
  useEffect(() => {
    if (!kostId) return;

    const channel = supabase
      .channel(`kost_${kostId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `kost_id=eq.${kostId}` },
        () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "tenants", filter: `kost_id=eq.${kostId}` },
        () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices", filter: `kost_id=eq.${kostId}` },
        () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "cash_flows", filter: `kost_id=eq.${kostId}` },
        () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [kostId]); // supabase & loadData stabil via useMemo/useCallback — tidak perlu di deps

  // ── setProfile → upsert ke Supabase ───────────────────────────────────────
  const setProfile = async (newProfile: KostProfile) => {
    setProfileState(newProfile);
    if (!kostId) return;
    await supabase
      .from("kost_profiles")
      .update({
        nama: newProfile.nama,
        subdomain: newProfile.subdomain,
        tagline: newProfile.tagline,
        alamat: newProfile.alamat,
        telepon: newProfile.telepon,
        paket: newProfile.paket,
        bank_penerima: newProfile.bankPenerima,
        no_rekening: newProfile.noRekening,
        logo_url: newProfile.logoUrl || null,
      })
      .eq("id", kostId);

    // Profil berubah → update halaman publik
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

  // ── Helper: trigger revalidate halaman publik kost ────────────────────────
  const triggerRevalidate = useCallback(async () => {
    if (!profile.subdomain) return;
    try {
      await fetch("/api/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subdomain: profile.subdomain }),
      });
    } catch {
      // silent fail — revalidate bukan critical path
    }
  }, [profile.subdomain]);

  // ── addRoom ────────────────────────────────────────────────────────────────
  const addRoom = async (roomData: Omit<Room, "id">) => {
    if (!kostId) return;
    const { data, error } = await supabase
      .from("rooms")
      .insert({
        kost_id: kostId,
        nomor: roomData.nomor,
        lantai: roomData.lantai,
        tipe: roomData.tipe,
        harga: roomData.harga,
        status: roomData.status,
        penyewa: roomData.penyewa || null,
        fasilitas: roomData.fasilitas,
      })
      .select()
      .single();

    if (!error && data) {
      setRooms((prev) => [mapRoom(data as Record<string, unknown>), ...prev]);
      triggerRevalidate(); // Invalidate cache halaman publik
    }
  };

  // ── deleteRoom ─────────────────────────────────────────────────────────────
  const deleteRoom = async (id: string) => {
    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (!error) {
      setRooms((prev) => prev.filter((r) => r.id !== id));
      triggerRevalidate();
    }
  };

  // ── updateRoom ─────────────────────────────────────────────────────────────
  const updateRoom = async (id: string, roomData: Partial<Omit<Room, "id">>) => {
    const updatePayload: Record<string, unknown> = {};
    if (roomData.nomor     !== undefined) updatePayload.nomor      = roomData.nomor;
    if (roomData.lantai    !== undefined) updatePayload.lantai     = roomData.lantai;
    if (roomData.tipe      !== undefined) updatePayload.tipe       = roomData.tipe;
    if (roomData.harga     !== undefined) updatePayload.harga      = roomData.harga;
    if (roomData.status    !== undefined) updatePayload.status     = roomData.status;
    if (roomData.penyewa   !== undefined) updatePayload.penyewa    = roomData.penyewa || null;
    if (roomData.fasilitas !== undefined) updatePayload.fasilitas  = roomData.fasilitas;
    if (roomData.fotoUrls  !== undefined) updatePayload.foto_urls  = roomData.fotoUrls;
    if (roomData.deskripsi !== undefined) updatePayload.deskripsi  = roomData.deskripsi || null;
    if (roomData.luasM2    !== undefined) updatePayload.luas_m2    = roomData.luasM2 || null;

    const { error } = await supabase.from("rooms").update(updatePayload).eq("id", id);
    if (!error) {
      setRooms((prev) => prev.map((r) => r.id === id ? { ...r, ...roomData } : r));
      triggerRevalidate();
    }
  };

  // ── addTenant ──────────────────────────────────────────────────────────────
  const addTenant = async (tenantData: Omit<Tenant, "id">) => {    if (!kostId) return;
    const { data, error } = await supabase
      .from("tenants")
      .insert({
        kost_id:      kostId,
        nama:         tenantData.nama,
        phone:        tenantData.phone,
        email:        tenantData.email        || null,
        no_ktp:       tenantData.noKtp        || null,
        pekerjaan:    tenantData.pekerjaan    || null,
        alamat_asal:  tenantData.alamatAsal   || null,
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

      // Update status kamar → Terisi
      const roomNomor = tenantData.kamar.replace(/^kamar\s*/i, "").trim();
      const room = rooms.find(
        (r) => r.nomor.toLowerCase() === roomNomor.toLowerCase()
      );
      if (room) {
        await supabase
          .from("rooms")
          .update({ status: "Terisi", penyewa: tenantData.nama })
          .eq("id", room.id);
        setRooms((prev) =>
          prev.map((r) =>
            r.id === room.id ? { ...r, status: "Terisi", penyewa: tenantData.nama } : r
          )
        );
        triggerRevalidate(); // Kamar status berubah → update halaman publik
      }
    }
  };

  // ── updateTenant ───────────────────────────────────────────────────────────
  const updateTenant = async (id: string, tenantData: Partial<Omit<Tenant, "id">>) => {
    const updatePayload: Record<string, unknown> = {};
    if (tenantData.nama        !== undefined) updatePayload.nama         = tenantData.nama;
    if (tenantData.phone       !== undefined) updatePayload.phone        = tenantData.phone;
    if (tenantData.email       !== undefined) updatePayload.email        = tenantData.email || null;
    if (tenantData.noKtp       !== undefined) updatePayload.no_ktp       = tenantData.noKtp || null;
    if (tenantData.pekerjaan   !== undefined) updatePayload.pekerjaan    = tenantData.pekerjaan || null;
    if (tenantData.alamatAsal  !== undefined) updatePayload.alamat_asal  = tenantData.alamatAsal || null;
    if (tenantData.kamar       !== undefined) updatePayload.kamar        = tenantData.kamar;
    if (tenantData.mulaiSewa   !== undefined) updatePayload.mulai_sewa   = tenantData.mulaiSewa;
    if (tenantData.akhirSewa   !== undefined) updatePayload.akhir_sewa   = tenantData.akhirSewa;
    if (tenantData.statusBayar !== undefined) updatePayload.status_bayar = tenantData.statusBayar;
    if (tenantData.ktpVerified !== undefined) updatePayload.ktp_verified = tenantData.ktpVerified;

    const { error } = await supabase.from("tenants").update(updatePayload).eq("id", id);
    if (!error) {
      setTenants((prev) => prev.map((t) => t.id === id ? { ...t, ...tenantData } : t));
    }
  };

  // ── deleteTenant ───────────────────────────────────────────────────────────
  const deleteTenant = async (id: string) => {
    const tenant = tenants.find((t) => t.id === id);
    const { error } = await supabase.from("tenants").delete().eq("id", id);
    if (!error) {
      setTenants((prev) => prev.filter((t) => t.id !== id));

      // Bebaskan kamar jika penyewa dihapus
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

  // ── addInvoice ─────────────────────────────────────────────────────────────
  const addInvoice = async (invData: Omit<Invoice, "id" | "noInvoice">) => {    if (!kostId) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const seq = String(invoices.length + 1).padStart(3, "0");
    const noInvoice = `INV/${year}/${month}/${seq}`;

    const { data, error } = await supabase
      .from("invoices")
      .insert({
        kost_id: kostId,
        no_invoice: noInvoice,
        penyewa: invData.penyewa,
        kamar: invData.kamar,
        nominal: invData.nominal,
        jatuh_tempo: invData.jatuhTempo,
        metode: invData.metode,
        status: invData.status,
      })
      .select()
      .single();

    if (!error && data) {
      setInvoices((prev) => [mapInvoice(data as Record<string, unknown>), ...prev]);
    }
  };

  // ── addCashFlow manual (catat pengeluaran/pemasukan manual) ──────────────
  const addCashFlow = async (cfData: Omit<CashFlow, "id" | "saldo">) => {
    if (!kostId) return;
    const currentSaldo = cashFlows.length > 0 ? cashFlows[0].saldo : 0;
    const newSaldo = cfData.tipe === "Masuk"
      ? currentSaldo + cfData.nominal
      : currentSaldo - cfData.nominal;

    const { data, error } = await supabase
      .from("cash_flows")
      .insert({
        kost_id: kostId,
        tgl:     cfData.tgl,
        ket:     cfData.ket,
        kat:     cfData.kat,
        tipe:    cfData.tipe,
        nominal: cfData.nominal,
        saldo:   newSaldo,
      })
      .select()
      .single();

    if (!error && data) {
      setCashFlows((prev) => [mapCashFlow(data as Record<string, unknown>), ...prev]);
    }
  };

  // ── deleteCashFlow ──────────────────────────────────────────────────────────
  const deleteCashFlow = async (id: string) => {
    const { error } = await supabase.from("cash_flows").delete().eq("id", id);
    if (!error) {
      setCashFlows((prev) => prev.filter((c) => c.id !== id));
    }
  };

  // ── deleteInvoice ──────────────────────────────────────────────────────────
  const deleteInvoice = async (id: string) => {
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (!error) {
      setInvoices((prev) => prev.filter((i) => i.id !== id));
    }
  };

  // ── payInvoice ─────────────────────────────────────────────────────────────
  const payInvoice = async (id: string) => {    const inv = invoices.find((i) => i.id === id);
    if (!inv || !kostId) return;

    // Update invoice → Lunas
    const { error } = await supabase
      .from("invoices")
      .update({ status: "Lunas", paid_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return;

    setInvoices((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "Lunas" as const } : i))
    );

    // Tambah entri arus kas
    const currentSaldo = cashFlows.length > 0 ? cashFlows[0].saldo : 0;
    const tgl = new Date().toLocaleDateString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
    });
    const { data: cfData } = await supabase
      .from("cash_flows")
      .insert({
        kost_id: kostId,
        tgl,
        ket: `Pembayaran ${inv.kamar} (${inv.penyewa})`,
        kat: "Pendapatan Sewa",
        tipe: "Masuk",
        nominal: inv.nominal,
        saldo: currentSaldo + inv.nominal,
      })
      .select()
      .single();

    if (cfData) {
      setCashFlows((prev) => [mapCashFlow(cfData as Record<string, unknown>), ...prev]);
    }
  };

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalKamar = rooms.length;
  const kamarTerisi = rooms.filter((r) => r.status === "Terisi").length;
  const kamarKosong = rooms.filter((r) => r.status === "Kosong").length;
  const kamarPerawatan = rooms.filter((r) => r.status === "Perawatan").length;
  const okupansi = totalKamar > 0 ? Math.round((kamarTerisi / totalKamar) * 100) : 0;
  const pendapatanBulanIni = invoices
    .filter((i) => i.status === "Lunas")
    .reduce((s, i) => s + i.nominal, 0);
  const tagihanTertunda = invoices
    .filter((i) => i.status !== "Lunas")
    .reduce((s, i) => s + i.nominal, 0);

  return (
    <KostContext.Provider
      value={{
        kostId,
        profile,
        setProfile,
        rooms,
        addRoom,
        updateRoom,
        deleteRoom,
        tenants,
        addTenant,
        updateTenant,
        deleteTenant,
        invoices,
        addInvoice,
        deleteInvoice,
        payInvoice,
        cashFlows,
        addCashFlow,
        deleteCashFlow,
        loading,
        stats: {
          totalKamar,
          kamarTerisi,
          kamarKosong,
          kamarPerawatan,
          okupansi,
          pendapatanBulanIni,
          tagihanTertunda,
        },
      }}
    >
      {children}
    </KostContext.Provider>
  );
}

export function useKost() {
  const context = useContext(KostContext);
  if (!context) throw new Error("useKost must be used within a KostProvider");
  return context;
}
