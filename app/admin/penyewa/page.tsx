"use client";

import { useState } from "react";
import { useKost } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import PaymentModal from "@/components/payment/PaymentModal";
import type { Tenant } from "@/lib/store";

// ── Stepper untuk form tambah penyewa baru ────────────────────────────────────
// Step 1: Data Pribadi (nama, email, phone, KTP, pekerjaan, alamat asal)
// Step 2: Data Sewa (pilih kamar, tanggal mulai/akhir)
// Step 3: Konfirmasi & Pembayaran

type FormData = {
  // Step 1 — Data Pribadi
  nama:        string;
  phone:       string;
  email:       string;
  noKtp:       string;
  pekerjaan:   string;
  alamatAsal:  string;
  // Step 2 — Data Sewa
  kamarNomor:  string;
  mulaiSewa:   string;
  akhirSewa:   string;
  // Step 3
  metodeBayar: string;
};

const emptyForm: FormData = {
  nama: "", phone: "", email: "", noKtp: "", pekerjaan: "", alamatAsal: "",
  kamarNomor: "", mulaiSewa: "", akhirSewa: "", metodeBayar: "QRIS",
};

export default function DataPenyewaPage() {
  const { tenants, addTenant, updateTenant, deleteTenant, rooms, invoices, addInvoice, payInvoice, loading } = useKost();
  const toast = useToast();

  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("Semua");

  // Add flow — stepper
  const [showAdd,  setShowAdd]  = useState(false);
  const [step,     setStep]     = useState(1);
  const [form,     setForm]     = useState<FormData>(emptyForm);
  const [addLoading, setAddLoading] = useState(false);

  // Edit state
  const [editTarget,  setEditTarget]  = useState<Tenant | null>(null);
  const [editForm,    setEditForm]    = useState<Partial<Omit<Tenant, "id">>>({});
  const [editLoading, setEditLoading] = useState(false);

  // Delete state
  const [deleteTarget,  setDeleteTarget]  = useState<Tenant | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Payment state
  const [payTarget,  setPayTarget]  = useState<Tenant | null>(null);
  const [payInvId,   setPayInvId]   = useState<string | null>(null);
  const [payInvNo,   setPayInvNo]   = useState("");
  const [payNominal, setPayNominal] = useState(0);

  const availableRooms = rooms.filter((r) => r.status === "Kosong");
  const selectedRoom   = rooms.find((r) => r.nomor === form.kamarNomor);

  const filteredTenants = tenants.filter((t) => {
    const matchSearch =
      t.nama.toLowerCase().includes(search.toLowerCase()) ||
      t.kamar.toLowerCase().includes(search.toLowerCase()) ||
      t.phone.includes(search) ||
      (t.email || "").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "Semua" || t.statusBayar === filter;
    return matchSearch && matchFilter;
  });

  const counts = {
    lunas:      tenants.filter((t) => t.statusBayar === "Lunas").length,
    belumBayar: tenants.filter((t) => t.statusBayar === "Belum Bayar").length,
    jatuhTempo: tenants.filter((t) => t.statusBayar === "Jatuh Tempo").length,
    tertunggak: tenants.filter((t) => t.statusBayar === "Tertunggak").length,
  };

  // ── Validasi per step ────────────────────────────────────────────────────────
  const step1Valid = form.nama.trim() && form.phone.trim() && form.noKtp.trim();
  const step2Valid = form.kamarNomor && form.mulaiSewa && form.akhirSewa;

  // ── Simpan penyewa (step 3 confirm) ──────────────────────────────────────────
  const handleSaveTenant = async () => {
    if (!selectedRoom) return;
    setAddLoading(true);
    try {
      await addTenant({
        nama:        form.nama.trim(),
        phone:       form.phone.trim(),
        email:       form.email.trim() || undefined,
        noKtp:       form.noKtp.trim() || undefined,
        pekerjaan:   form.pekerjaan.trim() || undefined,
        alamatAsal:  form.alamatAsal.trim() || undefined,
        kamar:       `Kamar ${form.kamarNomor}`,
        mulaiSewa:   form.mulaiSewa,
        akhirSewa:   form.akhirSewa,
        statusBayar: "Belum Bayar",
        ktpVerified: false,
      });

      // Buat invoice otomatis
      const d = new Date(form.akhirSewa || Date.now());
      const jatuhTempo = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
      await addInvoice({
        penyewa:    form.nama.trim(),
        kamar:      `Kamar ${form.kamarNomor}`,
        nominal:    selectedRoom.harga,
        jatuhTempo,
        metode:     form.metodeBayar,
        status:     "Menunggu",
      });

      toast.success("Penyewa berhasil didaftarkan!", `${form.nama} · Kamar ${form.kamarNomor} · Invoice dibuat otomatis.`);
      setShowAdd(false);
      setStep(1);
      setForm(emptyForm);
    } catch {
      toast.error("Gagal menyimpan", "Periksa koneksi dan coba lagi.");
    } finally {
      setAddLoading(false);
    }
  };

  // ── Edit ─────────────────────────────────────────────────────────────────────
  const openEdit = (t: Tenant) => {
    setEditTarget(t);
    setEditForm({
      nama:        t.nama,
      phone:       t.phone,
      email:       t.email       || "",
      noKtp:       t.noKtp       || "",
      pekerjaan:   t.pekerjaan   || "",
      alamatAsal:  t.alamatAsal  || "",
      kamar:       t.kamar,
      mulaiSewa:   t.mulaiSewa,
      akhirSewa:   t.akhirSewa,
      statusBayar: t.statusBayar,
      ktpVerified: t.ktpVerified,
    });
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditLoading(true);
    try {
      await updateTenant(editTarget.id, editForm);
      toast.success("Data diperbarui!", `${editForm.nama} berhasil diupdate.`);
      setEditTarget(null);
    } catch {
      toast.error("Gagal menyimpan", "Periksa koneksi dan coba lagi.");
    } finally {
      setEditLoading(false);
    }
  };

  // ── Hapus ─────────────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteTenant(deleteTarget.id);
      toast.success("Penyewa dihapus", `${deleteTarget.nama} dihapus. Kamar dibebaskan.`);
      setDeleteTarget(null);
    } catch {
      toast.error("Gagal menghapus", "Coba lagi.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Bayar tagihan dari kartu penyewa ─────────────────────────────────────────
  const handleOpenPayment = async (t: Tenant) => {
    const unpaidInv = invoices.find((i) => i.penyewa === t.nama && i.status !== "Lunas");
    if (unpaidInv) {
      setPayTarget(t);
      setPayInvId(unpaidInv.id);
      setPayInvNo(unpaidInv.noInvoice);
      setPayNominal(unpaidInv.nominal);
    } else {
      const room = rooms.find((r) => r.nomor === t.kamar.replace(/^kamar\s*/i, "").trim());
      const nominal = room?.harga || 0;
      if (!nominal) { toast.error("Nominal tidak diketahui", "Tambahkan kamar dengan harga."); return; }
      const d = new Date(); d.setDate(d.getDate() + 7);
      const jatuhTempo = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
      await addInvoice({ penyewa: t.nama, kamar: t.kamar, nominal, jatuhTempo, metode: "QRIS / Online", status: "Menunggu" });
      const newInv = [...invoices].reverse().find((i) => i.penyewa === t.nama && i.status !== "Lunas");
      if (newInv) { setPayTarget(t); setPayInvId(newInv.id); setPayInvNo(newInv.noInvoice); setPayNominal(newInv.nominal); }
      else toast.info("Invoice dibuat", "Buka Tagihan untuk memproses pembayaran.");
    }
  };

  const handlePaymentSuccess = (invoiceId: string) => {
    payInvoice(invoiceId);
    updateTenant(payTarget!.id, { statusBayar: "Lunas" });
    setPayTarget(null); setPayInvId(null);
    toast.success("Pembayaran berhasil!", "Invoice Lunas. Status penyewa diperbarui.");
  };

  const statusColor = (s: Tenant["statusBayar"]) => ({
    "Lunas":       "bg-emerald-100 text-emerald-800",
    "Belum Bayar": "bg-blue-100 text-blue-800",
    "Jatuh Tempo": "bg-amber-100 text-amber-800",
    "Tertunggak":  "bg-red-100 text-red-800",
  }[s] || "bg-slate-100 text-slate-600");

  return (
    <div className="space-y-6 sm:space-y-8 max-w-full">

      {/* Modals */}
      <ConfirmModal isOpen={!!deleteTarget}
        title={`Hapus Penyewa ${deleteTarget?.nama || ""}?`}
        message="Penyewa dihapus permanen dan kamarnya dibebaskan."
        confirmLabel={deleteLoading ? "Menghapus..." : "Ya, Hapus"}
        cancelLabel="Batal" variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)} />

      {payTarget && payInvId && (
        <PaymentModal isOpen={!!payTarget}
          onClose={() => { setPayTarget(null); setPayInvId(null); }}
          onSuccess={handlePaymentSuccess}
          invoiceId={payInvId} invoiceNo={payInvNo}
          penyewa={payTarget.nama} kamar={payTarget.kamar} nominal={payNominal} />
      )}

      {loading && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="material-symbols-outlined text-[16px] animate-spin text-primary">sync</span>
          Memuat data penyewa...
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-primary uppercase">Modul Penyewa</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Data Penyewa & Kontrak Sewa</h1>
          <p className="text-xs text-slate-500 mt-0.5">Kelola registrasi, data pribadi, kontrak, dan pembayaran penyewa.</p>
        </div>
        <button onClick={() => { setShowAdd(true); setStep(1); setForm(emptyForm); }}
          className="skeu-button text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-md w-full sm:w-auto">
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Daftarkan Penyewa Baru
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",       val: tenants.length,     color: "text-slate-900" },
          { label: "Lunas",       val: counts.lunas,        color: "text-emerald-700" },
          { label: "Belum Bayar", val: counts.belumBayar,   color: "text-blue-700" },
          { label: "Tertunggak",  val: counts.tertunggak,   color: "text-red-700" },
        ].map((s) => (
          <div key={s.label} className="skeu-card p-3 sm:p-4 rounded-xl">
            <span className="text-[10px] text-slate-500 font-semibold uppercase">{s.label}</span>
            <div className={`text-xl font-black mt-1 ${s.color}`}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
          <input type="text" placeholder="Cari nama, kamar, email, HP..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl skeu-inset text-slate-800 outline-none" />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          {["Semua", "Lunas", "Belum Bayar", "Jatuh Tempo", "Tertunggak"].map((tab) => (
            <button key={tab} onClick={() => setFilter(tab)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filter === tab ? "skeu-button shadow-sm" : "skeu-card text-slate-600"}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredTenants.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400 text-sm">
            {search ? "Penyewa tidak ditemukan." : "Belum ada data penyewa."}
          </div>
        ) : filteredTenants.map((t) => (
          <div key={t.id} className="skeu-card p-4 rounded-2xl flex flex-col gap-3">
            {/* Top */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-black text-sm">
                  {t.nama.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-sm text-slate-900 truncate">{t.nama}</h3>
                  <p className="text-[11px] text-slate-500">{t.kamar} · {t.phone}</p>
                  {t.email && <p className="text-[10px] text-slate-400 truncate">{t.email}</p>}
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${statusColor(t.statusBayar)}`}>
                {t.statusBayar}
              </span>
            </div>

            {/* Detail grid */}
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div className="skeu-inset p-2 rounded-lg">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Mulai</span>
                <span className="font-bold text-slate-800">{t.mulaiSewa}</span>
              </div>
              <div className="skeu-inset p-2 rounded-lg">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Akhir</span>
                <span className="font-bold text-slate-800">{t.akhirSewa}</span>
              </div>
              {t.pekerjaan && (
                <div className="skeu-inset p-2 rounded-lg col-span-2">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Pekerjaan</span>
                  <span className="font-semibold text-slate-700">{t.pekerjaan}</span>
                </div>
              )}
            </div>

            {/* KTP + actions */}
            <div className="flex items-center gap-1.5 pt-2 border-t border-white/60">
              {/* Bayar — hanya jika belum lunas */}
              {t.statusBayar !== "Lunas" && (
                <button onClick={() => handleOpenPayment(t)}
                  className="flex-1 skeu-button text-[10px] font-bold py-2 rounded-xl flex items-center justify-center gap-1 shadow-sm">
                  <span className="material-symbols-outlined text-[13px]">payments</span>
                  Bayar
                </button>
              )}

              {/* WA */}
              <a href={`https://wa.me/${t.phone.replace(/[^0-9]/g, "").replace(/^0/, "62")}`}
                target="_blank" rel="noopener noreferrer"
                className="flex-1 skeu-button-secondary text-[10px] font-bold py-2 rounded-xl flex items-center justify-center gap-1 text-emerald-800">
                <span className="material-symbols-outlined text-[13px] text-emerald-600">chat</span>
                WA
              </a>

              {/* Edit */}
              <button onClick={() => openEdit(t)}
                className="px-2.5 py-2 rounded-xl skeu-card text-slate-600 hover:text-primary transition-colors" title="Edit">
                <span className="material-symbols-outlined text-[16px]">edit</span>
              </button>

              {/* Hapus */}
              <button onClick={() => setDeleteTarget(t)}
                className="px-2.5 py-2 rounded-xl skeu-card text-red-500 hover:text-red-700 transition-colors" title="Hapus">
                <span className="material-symbols-outlined text-[16px]">delete</span>
              </button>
            </div>

            {/* KTP badge */}
            <div className={`text-[10px] font-bold flex items-center gap-1 ${t.ktpVerified ? "text-emerald-600" : "text-amber-600"}`}>
              <span className="material-symbols-outlined text-[13px]">{t.ktpVerified ? "verified" : "pending"}</span>
              {t.ktpVerified ? "KTP Terverifikasi" : "KTP Pending"}
              {t.noKtp && <span className="text-slate-400 font-normal ml-1">· {t.noKtp}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* ── MODAL DAFTAR PENYEWA — STEPPER ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">

            {/* Stepper Header */}
            <div className="bg-gradient-to-r from-primary to-indigo-700 px-6 py-4 text-white shrink-0">
              <div className="flex items-center justify-between mb-3">
                <p className="font-black text-sm">Pendaftaran Penyewa Baru</p>
                <button onClick={() => setShowAdd(false)} className="opacity-80 hover:opacity-100">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              {/* Step indicators */}
              <div className="flex items-center gap-2">
                {[
                  { n: 1, label: "Data Pribadi" },
                  { n: 2, label: "Data Sewa" },
                  { n: 3, label: "Konfirmasi" },
                ].map((s, idx) => (
                  <div key={s.n} className="flex items-center gap-2 flex-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] shrink-0 transition-all ${
                      step > s.n ? "bg-emerald-400 text-white" :
                      step === s.n ? "bg-white text-primary" :
                      "bg-white/20 text-white/60"
                    }`}>
                      {step > s.n ? <span className="material-symbols-outlined text-[14px]">check</span> : s.n}
                    </div>
                    <span className={`text-[10px] font-bold hidden sm:block ${step === s.n ? "text-white" : "text-white/60"}`}>
                      {s.label}
                    </span>
                    {idx < 2 && <div className={`flex-1 h-0.5 rounded-full ${step > s.n ? "bg-emerald-400" : "bg-white/20"}`} />}
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-5 text-xs space-y-4">

              {/* ── STEP 1: Data Pribadi ── */}
              {step === 1 && (
                <>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-800 flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-blue-600 shrink-0">info</span>
                    Data ini diperlukan untuk kontrak sewa dan tagihan otomatis. Lengkapi semua field yang bertanda *.
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nama Lengkap *</label>
                    <input required type="text" placeholder="Sesuai KTP" value={form.nama}
                      onChange={(e) => setForm({ ...form, nama: e.target.value })}
                      className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-bold" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">No. WhatsApp *</label>
                      <input required type="tel" placeholder="081234567890" value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-mono" />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Email</label>
                      <input type="email" placeholder="email@contoh.com" value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">No. KTP *</label>
                      <input required type="text" placeholder="16 digit NIK" maxLength={16} value={form.noKtp}
                        onChange={(e) => setForm({ ...form, noKtp: e.target.value.replace(/\D/g, "") })}
                        className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-mono" />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Pekerjaan</label>
                      <input type="text" placeholder="Mahasiswa / Karyawan" value={form.pekerjaan}
                        onChange={(e) => setForm({ ...form, pekerjaan: e.target.value })}
                        className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Alamat Asal</label>
                    <textarea rows={2} placeholder="Alamat sesuai KTP / domisili asal" value={form.alamatAsal}
                      onChange={(e) => setForm({ ...form, alamatAsal: e.target.value })}
                      className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none leading-relaxed" />
                  </div>
                </>
              )}

              {/* ── STEP 2: Data Sewa ── */}
              {step === 2 && (
                <>
                  <div>
                    <label className="font-bold text-slate-700 block mb-2">Pilih Kamar *</label>
                    {availableRooms.length === 0 ? (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 font-bold">
                        ⚠️ Semua kamar terisi. Tambahkan kamar kosong terlebih dahulu.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {availableRooms.map((r) => (
                          <label key={r.id}
                            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border-2 transition-all ${
                              form.kamarNomor === r.nomor
                                ? "border-primary bg-primary/5"
                                : "border-transparent skeu-card hover:border-primary/30"
                            }`}>
                            <div className="flex items-center gap-3">
                              <input type="radio" name="kamar" value={r.nomor} checked={form.kamarNomor === r.nomor}
                                onChange={() => setForm({ ...form, kamarNomor: r.nomor })} className="text-primary" />
                              <div>
                                <p className="font-black text-slate-900">{r.nomor}</p>
                                <p className="text-[10px] text-slate-500">{r.tipe} · Lantai {r.lantai}</p>
                              </div>
                            </div>
                            <span className="font-black text-primary text-xs">Rp {r.harga.toLocaleString("id-ID")}<span className="text-slate-400 font-normal">/bln</span></span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {form.kamarNomor && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Tanggal Mulai Sewa *</label>
                        <input required type="date" value={form.mulaiSewa}
                          onChange={(e) => setForm({ ...form, mulaiSewa: e.target.value })}
                          className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Tanggal Akhir Sewa *</label>
                        <input required type="date" value={form.akhirSewa} min={form.mulaiSewa}
                          onChange={(e) => setForm({ ...form, akhirSewa: e.target.value })}
                          className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none" />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── STEP 3: Konfirmasi ── */}
              {step === 3 && selectedRoom && (
                <>
                  <p className="font-bold text-slate-700">Konfirmasi Data Penyewa</p>

                  {/* Summary */}
                  <div className="skeu-inset p-4 rounded-2xl space-y-3">
                    <div className="flex items-center gap-3 pb-3 border-b border-white/60">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary text-sm shrink-0">
                        {form.nama.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-slate-900">{form.nama}</p>
                        <p className="text-[11px] text-slate-500">{form.phone} · {form.email || "-"}</p>
                      </div>
                    </div>
                    {[
                      { label: "No. KTP",   val: form.noKtp      || "-" },
                      { label: "Pekerjaan", val: form.pekerjaan  || "-" },
                      { label: "Kamar",     val: `${form.kamarNomor} · ${selectedRoom.tipe} · Lantai ${selectedRoom.lantai}` },
                      { label: "Harga",     val: `Rp ${selectedRoom.harga.toLocaleString("id-ID")} / bulan` },
                      { label: "Periode",   val: `${form.mulaiSewa} → ${form.akhirSewa}` },
                    ].map((r) => (
                      <div key={r.label} className="flex justify-between text-[11px]">
                        <span className="text-slate-500">{r.label}</span>
                        <span className="font-bold text-slate-800 text-right max-w-[55%]">{r.val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Invoice otomatis info */}
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-[11px] text-emerald-800">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600 shrink-0">receipt_long</span>
                    <span>Invoice tagihan <strong>Rp {selectedRoom.harga.toLocaleString("id-ID")}</strong> akan dibuat otomatis setelah penyewa terdaftar.</span>
                  </div>

                  {/* Metode bayar */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-2">Metode Pembayaran Invoice</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["QRIS", "Transfer", "Tunai"].map((m) => (
                        <button key={m} type="button"
                          onClick={() => setForm({ ...form, metodeBayar: m })}
                          className={`p-2.5 rounded-xl text-xs font-bold text-center transition-all ${
                            form.metodeBayar === m ? "skeu-button shadow-sm" : "skeu-card text-slate-600"
                          }`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer nav */}
            <div className="p-4 border-t border-slate-100 flex justify-between gap-3 shrink-0">
              <button onClick={() => step === 1 ? setShowAdd(false) : setStep(step - 1)}
                className="skeu-button-secondary px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">{step === 1 ? "close" : "arrow_back"}</span>
                {step === 1 ? "Batal" : "Kembali"}
              </button>

              {step < 3 ? (
                <button
                  disabled={step === 1 ? !step1Valid : !step2Valid || availableRooms.length === 0}
                  onClick={() => setStep(step + 1)}
                  className="skeu-button px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1 shadow-md disabled:opacity-50">
                  Lanjut
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              ) : (
                <button onClick={handleSaveTenant} disabled={addLoading}
                  className="skeu-button px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md disabled:opacity-70 bg-emerald-600">
                  <span className={`material-symbols-outlined text-[16px] ${addLoading ? "animate-spin" : ""}`}>
                    {addLoading ? "sync" : "person_check"}
                  </span>
                  {addLoading ? "Mendaftarkan..." : "Daftarkan & Buat Invoice"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Edit Penyewa ── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="skeu-card p-5 sm:p-6 rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/60">
              <h3 className="font-black text-base text-slate-900">Edit Data Penyewa</h3>
              <button onClick={() => setEditTarget(null)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleEditSave} className="space-y-3 text-xs">
              {[
                { key: "nama",       label: "Nama Lengkap",  type: "text", required: true },
                { key: "phone",      label: "No. WhatsApp",  type: "tel",  required: true },
                { key: "email",      label: "Email",         type: "email" },
                { key: "noKtp",      label: "No. KTP",       type: "text" },
                { key: "pekerjaan",  label: "Pekerjaan",     type: "text" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="font-bold text-slate-700 block mb-1">{f.label}{f.required ? " *" : ""}</label>
                  <input type={f.type} required={f.required}
                    value={(editForm as Record<string, unknown>)[f.key] as string || ""}
                    onChange={(e) => setEditForm({ ...editForm, [f.key]: e.target.value })}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none" />
                </div>
              ))}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Alamat Asal</label>
                <textarea rows={2} value={(editForm.alamatAsal as string) || ""}
                  onChange={(e) => setEditForm({ ...editForm, alamatAsal: e.target.value })}
                  className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Status Bayar</label>
                  <select value={editForm.statusBayar as string || ""}
                    onChange={(e) => setEditForm({ ...editForm, statusBayar: e.target.value as Tenant["statusBayar"] })}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none cursor-pointer">
                    <option value="Belum Bayar">Belum Bayar</option>
                    <option value="Lunas">Lunas</option>
                    <option value="Jatuh Tempo">Jatuh Tempo</option>
                    <option value="Tertunggak">Tertunggak</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Verifikasi KTP</label>
                  <select value={editForm.ktpVerified ? "ya" : "tidak"}
                    onChange={(e) => setEditForm({ ...editForm, ktpVerified: e.target.value === "ya" })}
                    className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none cursor-pointer">
                    <option value="ya">Terverifikasi ✓</option>
                    <option value="tidak">Belum Verifikasi</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setEditTarget(null)} className="skeu-button-secondary px-4 py-2 rounded-xl font-bold">Batal</button>
                <button type="submit" disabled={editLoading} className="skeu-button px-5 py-2 rounded-xl font-bold shadow-md disabled:opacity-60">
                  {editLoading ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
