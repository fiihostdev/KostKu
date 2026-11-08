"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface Room {
  id: string;
  nomor: string;
  lantai: number;
  tipe: "Standard" | "Deluxe" | "VIP";
  harga: number;
  status: "Terisi" | "Kosong" | "Perawatan";
  penyewa?: string;
  fasilitas: string[];
}

export interface Tenant {
  id: string;
  nama: string;
  phone: string;
  kamar: string;
  mulaiSewa: string;
  akhirSewa: string;
  statusBayar: "Lunas" | "Jatuh Tempo" | "Tertunggak";
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
}

interface KostContextType {
  profile: KostProfile;
  setProfile: (p: KostProfile) => void;
  rooms: Room[];
  addRoom: (r: Omit<Room, "id">) => void;
  deleteRoom: (id: string) => void;
  tenants: Tenant[];
  addTenant: (t: Omit<Tenant, "id">) => void;
  invoices: Invoice[];
  addInvoice: (inv: Omit<Invoice, "id" | "noInvoice">) => void;
  payInvoice: (id: string) => void;
  cashFlows: CashFlow[];
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

const defaultProfile: KostProfile = {
  nama: "Kost Harmoni Residence",
  subdomain: "harmoni",
  tagline: "Hunian Eksklusif, Bersih, dan Strategis Dekat Kawasan Kampus & Bisnis",
  alamat: "Jl. Kemang Raya No. 18, Jakarta Selatan",
  telepon: "0812-3456-7890",
  paket: "Pro Plan",
  bankPenerima: "BCA",
  noRekening: "8820-192-331",
};

const defaultRooms: Room[] = [
  { id: "1", nomor: "A-01", lantai: 1, tipe: "Deluxe", harga: 1800000, status: "Terisi", penyewa: "Dimas Anggara", fasilitas: ["AC", "K. Mandi Dalam", "WiFi", "Kasur Queen"] },
  { id: "2", nomor: "A-02", lantai: 1, tipe: "Standard", harga: 1500000, status: "Kosong", fasilitas: ["Kipas", "K. Mandi Luar", "WiFi", "Kasur Single"] },
  { id: "3", nomor: "A-03", lantai: 1, tipe: "Deluxe", harga: 1800000, status: "Terisi", penyewa: "Andi Pratama", fasilitas: ["AC", "K. Mandi Dalam", "WiFi"] },
  { id: "4", nomor: "A-04", lantai: 1, tipe: "VIP", harga: 2500000, status: "Terisi", penyewa: "Rian Hidayat", fasilitas: ["AC", "Water Heater", "TV", "Balkon"] },
  { id: "5", nomor: "B-01", lantai: 2, tipe: "Standard", harga: 1500000, status: "Terisi", penyewa: "Fajar Nugraha", fasilitas: ["AC", "K. Mandi Dalam"] },
  { id: "6", nomor: "B-02", lantai: 2, tipe: "Deluxe", harga: 1800000, status: "Terisi", penyewa: "Budi Santoso", fasilitas: ["AC", "K. Mandi Dalam", "WiFi"] },
  { id: "7", nomor: "B-03", lantai: 2, tipe: "Standard", harga: 1500000, status: "Perawatan", fasilitas: ["AC", "K. Mandi Dalam", "Pengecatan Ulang"] },
  { id: "8", nomor: "B-04", lantai: 2, tipe: "VIP", harga: 2600000, status: "Terisi", penyewa: "Siti Rahmawati", fasilitas: ["AC", "Kulkas Mini", "Water Heater", "TV"] },
];

const defaultTenants: Tenant[] = [
  { id: "1", nama: "Dimas Anggara", phone: "0812-3456-7890", kamar: "Kamar A-01", mulaiSewa: "01 Jan 2026", akhirSewa: "31 Des 2026", statusBayar: "Lunas", ktpVerified: true },
  { id: "2", nama: "Andi Pratama", phone: "0813-9876-5432", kamar: "Kamar A-03", mulaiSewa: "15 Feb 2026", akhirSewa: "14 Feb 2027", statusBayar: "Lunas", ktpVerified: true },
  { id: "3", nama: "Rian Hidayat", phone: "0821-1122-3344", kamar: "Kamar A-04", mulaiSewa: "01 Mar 2026", akhirSewa: "01 Mar 2027", statusBayar: "Jatuh Tempo", ktpVerified: true },
  { id: "4", nama: "Fajar Nugraha", phone: "0857-4433-2211", kamar: "Kamar B-01", mulaiSewa: "10 Jun 2026", akhirSewa: "10 Des 2026", statusBayar: "Tertunggak", ktpVerified: false },
  { id: "5", nama: "Budi Santoso", phone: "0819-7788-9900", kamar: "Kamar B-02", mulaiSewa: "01 Jul 2026", akhirSewa: "31 Jul 2027", statusBayar: "Lunas", ktpVerified: true },
  { id: "6", nama: "Siti Rahmawati", phone: "0878-5566-7788", kamar: "Kamar B-04", mulaiSewa: "01 Mei 2026", akhirSewa: "30 Apr 2027", statusBayar: "Lunas", ktpVerified: true },
];

const defaultInvoices: Invoice[] = [
  { id: "1", noInvoice: "INV/2026/11/001", penyewa: "Dimas Anggara", kamar: "Kamar A-01", nominal: 1800000, jatuhTempo: "05 Nov 2026", metode: "Midtrans (QRIS)", status: "Lunas" },
  { id: "2", noInvoice: "INV/2026/11/002", penyewa: "Andi Pratama", kamar: "Kamar A-03", nominal: 1800000, jatuhTempo: "05 Nov 2026", metode: "Midtrans (BCA VA)", status: "Lunas" },
  { id: "3", noInvoice: "INV/2026/11/003", penyewa: "Rian Hidayat", kamar: "Kamar A-04", nominal: 2500000, jatuhTempo: "10 Nov 2026", metode: "Transfer Manual", status: "Menunggu" },
  { id: "4", noInvoice: "INV/2026/11/004", penyewa: "Fajar Nugraha", kamar: "Kamar B-01", nominal: 1500000, jatuhTempo: "01 Nov 2026", metode: "Midtrans Link", status: "Jatuh Tempo" },
  { id: "5", noInvoice: "INV/2026/11/005", penyewa: "Budi Santoso", kamar: "Kamar B-02", nominal: 1800000, jatuhTempo: "05 Nov 2026", metode: "Tunai", status: "Lunas" },
  { id: "6", noInvoice: "INV/2026/11/006", penyewa: "Siti Rahmawati", kamar: "Kamar B-04", nominal: 2600000, jatuhTempo: "05 Nov 2026", metode: "Midtrans (GoPay)", status: "Lunas" },
];

const defaultCashFlows: CashFlow[] = [
  { id: "1", tgl: "07 Nov 2026", ket: "Pembayaran Sewa Kamar A-01 (Dimas Anggara)", kat: "Pendapatan Sewa", tipe: "Masuk", nominal: 1800000, saldo: 34850000 },
  { id: "2", tgl: "06 Nov 2026", ket: "Pembayaran Sewa Kamar B-04 (Siti Rahmawati)", kat: "Pendapatan Sewa", tipe: "Masuk", nominal: 2200000, saldo: 33050000 },
  { id: "3", tgl: "04 Nov 2026", ket: "Tagihan Listrik PLN & Air PAM Kost", kat: "Utilitas", tipe: "Keluar", nominal: 2450000, saldo: 30850000 },
  { id: "4", tgl: "03 Nov 2026", ket: "Langganan Internet IndiHome Biz 100 Mbps", kat: "Internet", tipe: "Keluar", nominal: 750000, saldo: 33300000 },
  { id: "5", tgl: "02 Nov 2026", ket: "Service Rutin AC 4 Unit Lantai 1", kat: "Perawatan", tipe: "Keluar", nominal: 600000, saldo: 34050000 },
  { id: "6", tgl: "01 Nov 2026", ket: "Pembayaran Sewa Kamar VIP-01 (Jessica Mila)", kat: "Pendapatan Sewa", tipe: "Masuk", nominal: 3500000, saldo: 34650000 },
];

const KostContext = createContext<KostContextType | undefined>(undefined);

export function KostProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<KostProfile>(defaultProfile);
  const [rooms, setRooms] = useState<Room[]>(defaultRooms);
  const [tenants, setTenants] = useState<Tenant[]>(defaultTenants);
  const [invoices, setInvoices] = useState<Invoice[]>(defaultInvoices);
  const [cashFlows, setCashFlows] = useState<CashFlow[]>(defaultCashFlows);

  // Initialize from LocalStorage if available
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem("kostku_profile");
      if (savedProfile) setProfileState(JSON.parse(savedProfile));

      const savedRooms = localStorage.getItem("kostku_rooms");
      if (savedRooms) setRooms(JSON.parse(savedRooms));

      const savedTenants = localStorage.getItem("kostku_tenants");
      if (savedTenants) setTenants(JSON.parse(savedTenants));

      const savedInvoices = localStorage.getItem("kostku_invoices");
      if (savedInvoices) setInvoices(JSON.parse(savedInvoices));
    } catch {
      // Ignore on server
    }
  }, []);

  const setProfile = (newProfile: KostProfile) => {
    setProfileState(newProfile);
    try {
      localStorage.setItem("kostku_profile", JSON.stringify(newProfile));
    } catch {}
  };

  const addRoom = (roomData: Omit<Room, "id">) => {
    const newRoom: Room = {
      ...roomData,
      id: Date.now().toString(),
    };
    const updated = [newRoom, ...rooms];
    setRooms(updated);
    try {
      localStorage.setItem("kostku_rooms", JSON.stringify(updated));
    } catch {}
  };

  const deleteRoom = (id: string) => {
    const updated = rooms.filter((r) => r.id !== id);
    setRooms(updated);
    try {
      localStorage.setItem("kostku_rooms", JSON.stringify(updated));
    } catch {}
  };

  const addTenant = (tenantData: Omit<Tenant, "id">) => {
    const newTenant: Tenant = {
      ...tenantData,
      id: Date.now().toString(),
    };
    const updatedTenants = [newTenant, ...tenants];
    setTenants(updatedTenants);

    // Also mark room as occupied if matches room number
    const updatedRooms = rooms.map((r) => {
      if (tenantData.kamar.includes(r.nomor) || r.nomor === tenantData.kamar) {
        return { ...r, status: "Terisi" as const, penyewa: tenantData.nama };
      }
      return r;
    });
    setRooms(updatedRooms);

    try {
      localStorage.setItem("kostku_tenants", JSON.stringify(updatedTenants));
      localStorage.setItem("kostku_rooms", JSON.stringify(updatedRooms));
    } catch {}
  };

  const addInvoice = (invData: Omit<Invoice, "id" | "noInvoice">) => {
    const count = invoices.length + 1;
    const newInv: Invoice = {
      ...invData,
      id: Date.now().toString(),
      noInvoice: `INV/2026/11/00${count}`,
    };
    const updatedInvoices = [newInv, ...invoices];
    setInvoices(updatedInvoices);
    try {
      localStorage.setItem("kostku_invoices", JSON.stringify(updatedInvoices));
    } catch {}
  };

  const payInvoice = (id: string) => {
    let paidAmount = 0;
    let invDesc = "";
    const updated = invoices.map((inv) => {
      if (inv.id === id) {
        paidAmount = inv.nominal;
        invDesc = `Pembayaran ${inv.kamar} (${inv.penyewa})`;
        return { ...inv, status: "Lunas" as const };
      }
      return inv;
    });
    setInvoices(updated);

    if (paidAmount > 0) {
      const currentSaldo = cashFlows.length > 0 ? cashFlows[0].saldo : 30000000;
      const newCashFlow: CashFlow = {
        id: Date.now().toString(),
        tgl: "Hari Ini",
        ket: invDesc,
        kat: "Pendapatan Sewa",
        tipe: "Masuk",
        nominal: paidAmount,
        saldo: currentSaldo + paidAmount,
      };
      setCashFlows([newCashFlow, ...cashFlows]);
    }

    try {
      localStorage.setItem("kostku_invoices", JSON.stringify(updated));
    } catch {}
  };

  // Derived stats
  const totalKamar = rooms.length;
  const kamarTerisi = rooms.filter((r) => r.status === "Terisi").length;
  const kamarKosong = rooms.filter((r) => r.status === "Kosong").length;
  const kamarPerawatan = rooms.filter((r) => r.status === "Perawatan").length;
  const okupansi = totalKamar > 0 ? Math.round((kamarTerisi / totalKamar) * 100) : 0;

  const pendapatanBulanIni = invoices
    .filter((inv) => inv.status === "Lunas")
    .reduce((sum, inv) => sum + inv.nominal, 0);

  const tagihanTertunda = invoices
    .filter((inv) => inv.status !== "Lunas")
    .reduce((sum, inv) => sum + inv.nominal, 0);

  return (
    <KostContext.Provider
      value={{
        profile,
        setProfile,
        rooms,
        addRoom,
        deleteRoom,
        tenants,
        addTenant,
        invoices,
        addInvoice,
        payInvoice,
        cashFlows,
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
  if (!context) {
    throw new Error("useKost must be used within a KostProvider");
  }
  return context;
}
