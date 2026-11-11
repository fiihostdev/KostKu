"use client";

import { useState, useEffect, useCallback } from "react";
import { useKost } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { createClient } from "@/lib/supabase-browser";

interface Booking {
  id:           string;
  kamar:        string;
  nama:         string;
  phone:        string;
  email:        string | null;
  no_ktp:       string | null;
  nominal:      number;
  nominal_asli: number;
  ref_code:     string;
  metode:       string;
  status:       "Menunggu" | "Dikonfirmasi" | "Ditolak" | "Kadaluarsa";
  catatan_admin: string | null;
  created_at:   string;
}

export default function BookingPage() {
  const { kostId, addTenant, addInvoice } = useKost();
  const toast = useToast();

  const [bookings,    setBookings]    = useState<Booking[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState("Menunggu");
  const [processing,  setProcessing]  = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Booking | null>(null);
  const [catatanAdmin, setCatatanAdmin] = useState("");

  const supabase = createClient();

  const loadBookings = useCallback(async () => {
    if (!kostId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("bookings")
        .select("*")
        .eq("kost_id", kostId)
        .order("created_at", { ascending: false });
      setBookings((data || []) as Booking[]);
    } finally {
      setLoading(false);
    }
  }, [kostId, supabase]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  // Realtime subscription
  useEffect(() => {
    if (!kostId) return;
    const channel = supabase
      .channel(`bookings_${kostId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `kost_id=eq.${kostId}` },
        () => loadBookings())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [kostId, supabase, loadBookings]);

  // Konfirmasi booking → buat penyewa + invoice otomatis
  const handleConfirm = async (b: Booking) => {
    setProcessing(b.id);
    try {
      // Update status booking
      const { error } = await supabase
        .from("bookings")
        .update({ status: "Dikonfirmasi", updated_at: new Date().toISOString() })
        .eq("id", b.id);
      if (error) throw error;

      // Buat penyewa otomatis
      const mulaiSewa = new Date().toISOString().split("T")[0];
      const akhirSewa = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      await addTenant({
        nama:        b.nama,
        phone:       b.phone,
        email:       b.email || undefined,
        noKtp:       b.no_ktp || undefined,
        kamar:       `Kamar ${b.kamar}`,
        mulaiSewa,
        akhirSewa,
        statusBayar: b.metode === "QRIS" ? "Belum Bayar" : "Belum Bayar",
        ktpVerified: false,
      });

      // Buat invoice otomatis dengan nominal unik untuk tracking
      const jatuhTempo = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

      await addInvoice({
        penyewa:    b.nama,
        kamar:      `Kamar ${b.kamar}`,
        nominal:    b.nominal_asli,
        jatuhTempo,
        metode:     b.metode,
        status:     "Menunggu",
      });

      toast.success("Booking dikonfirmasi!", `${b.nama} · Kamar ${b.kamar} · Penyewa & invoice dibuat otomatis.`);
      await loadBookings();
    } catch (err) {
      toast.error("Gagal konfirmasi", String(err));
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setProcessing(rejectTarget.id);
    try {
      await supabase
        .from("bookings")
        .update({ status: "Ditolak", catatan_admin: catatanAdmin || null, updated_at: new Date().toISOString() })
        .eq("id", rejectTarget.id);
      toast.success("Booking ditolak", `Booking ${rejectTarget.ref_code} ditolak.`);
      setRejectTarget(null);
      setCatatanAdmin("");
      await loadBookings();
    } finally {
      setProcessing(null);
    }
  };

  const filtered = bookings.filter((b) => filter === "Semua" || b.status === filter);
  const counts = {
    Menunggu:    bookings.filter(b => b.status === "Menunggu").length,
    Dikonfirmasi: bookings.filter(b => b.status === "Dikonfirmasi").length,
    Ditolak:     bookings.filter(b => b.status === "Ditolak").length,
  };

  const statusColor = (s: Booking["status"]) => ({
    Menunggu:    "bg-amber-100 text-amber-800",
    Dikonfirmasi: "bg-emerald-100 text-emerald-800",
    Ditolak:     "bg-red-100 text-red-800",
    Kadaluarsa:  "bg-slate-100 text-slate-600",
  }[s]);

  return (
    <div className="space-y-6 max-w-full">

      <ConfirmModal
        isOpen={!!rejectTarget}
        title="Tolak Booking?"
        message={`Booking dari ${rejectTarget?.nama} (${rejectTarget?.ref_code}) akan ditolak.`}
        confirmLabel="Ya, Tolak"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={handleReject}
        onCancel={() => { setRejectTarget(null); setCatatanAdmin(""); }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-primary uppercase">Modul Booking</span>
            {counts.Menunggu > 0 && (
              <span className="text-[9px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">
                {counts.Menunggu} baru
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Kelola Booking Masuk</h1>
          <p className="text-xs text-slate-500 mt-0.5">Konfirmasi atau tolak booking dari calon penyewa. Validasi nominal transfer unik.</p>
        </div>
        <button onClick={loadBookings} className="skeu-button-secondary text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 w-full sm:w-auto justify-center">
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Menunggu",    val: counts.Menunggu,     color: "text-amber-700",   bg: "bg-amber-50" },
          { label: "Dikonfirmasi", val: counts.Dikonfirmasi, color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "Ditolak",    val: counts.Ditolak,      color: "text-red-700",     bg: "bg-red-50" },
        ].map((s) => (
          <div key={s.label} className={`skeu-card p-3 sm:p-4 rounded-xl ${s.bg}`}>
            <span className="text-[10px] text-slate-500 font-semibold uppercase">{s.label}</span>
            <div className={`text-2xl font-black mt-1 ${s.color}`}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {["Semua", "Menunggu", "Dikonfirmasi", "Ditolak"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filter === f ? "skeu-button shadow-sm" : "skeu-card text-slate-600"}`}>
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-500 py-6 justify-center">
          <span className="material-symbols-outlined text-[20px] animate-spin text-primary">sync</span>
          Memuat data booking...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          {filter === "Menunggu" ? "Tidak ada booking baru." : "Tidak ada data."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <div key={b.id} className="skeu-card p-4 sm:p-5 rounded-2xl">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">

                {/* Info utama */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-black text-sm text-slate-900">{b.nama}</p>
                      <p className="text-[11px] text-slate-500">{b.phone}{b.email ? ` · ${b.email}` : ""}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${statusColor(b.status)}`}>
                      {b.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="skeu-inset p-2 rounded-lg">
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Kamar</span>
                      <span className="font-black text-slate-900">{b.kamar}</span>
                    </div>
                    <div className="skeu-inset p-2 rounded-lg">
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Metode</span>
                      <span className="font-bold text-slate-800">{b.metode}</span>
                    </div>
                    <div className="skeu-inset p-2 rounded-lg col-span-2">
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Nominal Transfer Unik</span>
                      <span className="font-black text-primary">Rp {b.nominal.toLocaleString("id-ID")}</span>
                      <span className="text-slate-400 text-[9px] ml-1">(asli: Rp {b.nominal_asli.toLocaleString("id-ID")})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{b.ref_code}</span>
                    <span>·</span>
                    <span>{new Date(b.created_at).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    {b.no_ktp && <><span>·</span><span>KTP: {b.no_ktp}</span></>}
                  </div>

                  {b.catatan_admin && (
                    <div className="text-[11px] text-slate-600 italic p-2 bg-slate-50 rounded-lg border border-slate-200">
                      Catatan: {b.catatan_admin}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {b.status === "Menunggu" && (
                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <button
                      onClick={() => handleConfirm(b)}
                      disabled={!!processing}
                      className="flex-1 sm:flex-none skeu-button text-xs font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-60"
                    >
                      <span className={`material-symbols-outlined text-[14px] ${processing===b.id?"animate-spin":""}`}>
                        {processing===b.id ? "sync" : "check_circle"}
                      </span>
                      Konfirmasi
                    </button>
                    <button
                      onClick={() => setRejectTarget(b)}
                      disabled={!!processing}
                      className="flex-1 sm:flex-none skeu-button-secondary text-xs font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 text-red-600 disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined text-[14px]">cancel</span>
                      Tolak
                    </button>
                    <a
                      href={`https://wa.me/${b.phone.replace(/[^0-9]/g,"").replace(/^0/,"62")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex-1 sm:flex-none skeu-button-secondary text-xs font-bold px-3 py-2 rounded-xl flex items-center justify-center gap-1 text-emerald-700"
                    >
                      <span className="material-symbols-outlined text-[14px]">chat</span>
                      WA
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info validasi nominal */}
      <div className="skeu-card p-4 rounded-2xl text-xs space-y-2">
        <p className="font-bold text-slate-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-primary">help_center</span>
          Cara Verifikasi Pembayaran QRIS
        </p>
        <p className="text-slate-600">Setiap booking QRIS mendapat nominal unik (harga + 3 digit acak). Contoh: harga Rp 1.500.000 → penyewa A transfer Rp 1.500.347, penyewa B transfer Rp 1.500.219.</p>
        <p className="text-slate-600">Cocokkan nominal di mutasi rekening/QRIS dengan kolom <strong>"Nominal Transfer Unik"</strong> di tabel di atas. Jika cocok → klik Konfirmasi.</p>
      </div>
    </div>
  );
}
