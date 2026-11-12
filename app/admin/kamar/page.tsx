"use client";

import { useState } from "react";
import { useKost } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import RoomPhotoUploader from "@/components/admin/RoomPhotoUploader";
import type { Room } from "@/lib/store";

type RoomForm = {
  nomor: string;
  lantai: number;
  tipe: "Standard" | "Deluxe" | "VIP";
  harga: number;
  status: "Terisi" | "Kosong" | "Perawatan";
  fasilitas: string;
};

const emptyForm: RoomForm = {
  nomor: "", lantai: 1, tipe: "Standard", harga: 1500000, status: "Kosong", fasilitas: "AC, WiFi, Kasur",
};

// ── RoomFormFields — HARUS di luar DataKamarPage agar tidak di-recreate saat re-render ──
// Jika didefinisikan di dalam komponen parent, React unmount/remount setiap ketik → fokus hilang
function RoomFormFields({
  form,
  onChange,
  showStatus = false,
}: {
  form: RoomForm;
  onChange: (f: RoomForm) => void;
  showStatus?: boolean;
}) {
  return (
    <div className="space-y-4 text-xs">
      <div>
        <label className="font-bold text-slate-700 block mb-1">Nomor Kamar</label>
        <input
          required
          type="text"
          placeholder="Contoh: A-05"
          value={form.nomor}
          onChange={(e) => onChange({ ...form, nomor: e.target.value })}
          className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-bold"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Lantai</label>
          <input
            type="number" min="1" max="20"
            value={form.lantai}
            onChange={(e) => onChange({ ...form, lantai: Number(e.target.value) })}
            className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">Tipe Kamar</label>
          <select
            value={form.tipe}
            onChange={(e) => onChange({ ...form, tipe: e.target.value as RoomForm["tipe"] })}
            className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-semibold cursor-pointer"
          >
            <option value="Standard">Standard</option>
            <option value="Deluxe">Deluxe</option>
            <option value="VIP">VIP</option>
          </select>
        </div>
      </div>
      <div>
        <label className="font-bold text-slate-700 block mb-1">Harga Sewa / Bulan (Rp)</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">Rp</span>
          <input
            type="number"
            step="1"
            min="0"
            value={form.harga}
            onChange={(e) => onChange({ ...form, harga: Number(e.target.value) })}
            className="w-full pl-9 p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-black text-sm"
          />
        </div>
        <p className="text-[10px] text-slate-500 mt-1">
          = Rp {Number(form.harga).toLocaleString("id-ID")} / bulan
        </p>
      </div>
      {showStatus && (
        <div>
          <label className="font-bold text-slate-700 block mb-1">Status Kamar</label>
          <select
            value={form.status}
            onChange={(e) => onChange({ ...form, status: e.target.value as RoomForm["status"] })}
            className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none font-semibold cursor-pointer"
          >
            <option value="Kosong">Kosong (Tersedia)</option>
            <option value="Terisi">Terisi</option>
            <option value="Perawatan">Perawatan</option>
          </select>
        </div>
      )}
      <div>
        <label className="font-bold text-slate-700 block mb-1">
          Fasilitas <span className="text-slate-400 font-normal">(pisahkan koma)</span>
        </label>
        <input
          type="text"
          placeholder="AC, WiFi, Kasur, K. Mandi Dalam"
          value={form.fasilitas}
          onChange={(e) => onChange({ ...form, fasilitas: e.target.value })}
          className="w-full p-2.5 rounded-xl skeu-inset text-slate-800 outline-none"
        />
        <div className="flex flex-wrap gap-1 mt-1.5">
          {form.fasilitas.split(",").filter((f) => f.trim()).map((f, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-md font-semibold">
              {f.trim()}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DataKamarPage() {
  const { rooms, addRoom, updateRoom, deleteRoom, profile, loading, kostId } = useKost();
  const toast = useToast();

  const [filter, setFilter] = useState<string>("Semua");

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRoom, setNewRoom] = useState<RoomForm>(emptyForm);
  const [addLoading, setAddLoading] = useState(false);

  // Edit modal
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [editForm, setEditForm] = useState<RoomForm>(emptyForm);
  const [editLoading, setEditLoading] = useState(false);

  // Confirm delete modal
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filteredRooms = rooms.filter((r) =>
    filter === "Semua" ? true : r.status === filter
  );

  const terisiCount    = rooms.filter((r) => r.status === "Terisi").length;
  const kosongCount    = rooms.filter((r) => r.status === "Kosong").length;
  const perawatanCount = rooms.filter((r) => r.status === "Perawatan").length;
  const okupansi       = rooms.length > 0 ? Math.round((terisiCount / rooms.length) * 100) : 0;

  // ── Tambah kamar ───────────────────────────────────────────────────────────
  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      await addRoom({
        nomor:     newRoom.nomor,
        lantai:    Number(newRoom.lantai),
        tipe:      newRoom.tipe,
        harga:     Number(newRoom.harga),
        status:    "Kosong",
        fasilitas: newRoom.fasilitas.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setShowAddModal(false);
      setNewRoom(emptyForm);
      toast.success("Kamar berhasil ditambahkan!", `Kamar ${newRoom.nomor} telah tersimpan.`);
    } catch {
      toast.error("Gagal menambahkan kamar", "Coba lagi atau periksa koneksi.");
    } finally {
      setAddLoading(false);
    }
  };

  // ── Buka modal edit ────────────────────────────────────────────────────────
  const openEdit = (room: Room) => {
    setEditRoom(room);
    setEditForm({
      nomor:     room.nomor,
      lantai:    room.lantai,
      tipe:      room.tipe,
      harga:     room.harga,
      status:    room.status,
      fasilitas: room.fasilitas.join(", "),
    });
  };

  // ── Simpan edit kamar ──────────────────────────────────────────────────────
  const handleEditRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRoom || !kostId) return;
    setEditLoading(true);
    try {
      await updateRoom(editRoom.id, {
        nomor:     editForm.nomor,
        lantai:    Number(editForm.lantai),
        tipe:      editForm.tipe,
        harga:     Number(editForm.harga),
        status:    editForm.status,
        fasilitas: editForm.fasilitas.split(",").map((s: string) => s.trim()).filter(Boolean),
      });

      setEditRoom(null);
      toast.success("Kamar berhasil diperbarui!", `${editForm.nomor} telah disimpan.`);
    } catch {
      toast.error("Gagal menyimpan", "Periksa koneksi dan coba lagi.");
    } finally {
      setEditLoading(false);
    }
  };

  // ── Hapus kamar ────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteRoom(deleteTarget.id);
      toast.success("Kamar dihapus", `Kamar ${deleteTarget.nomor} telah dihapus.`);
      setDeleteTarget(null);
    } catch {
      toast.error("Gagal menghapus kamar", "Coba lagi.");
    } finally {
      setDeleteLoading(false);
    }
  };
  return (
    <div className="space-y-6 sm:space-y-8 max-w-full">

      {/* Confirm Delete Modal — TIDAK menggunakan browser confirm() */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title={`Hapus Kamar ${deleteTarget?.nomor || ""}?`}
        message="Tindakan ini tidak dapat dibatalkan. Data kamar akan dihapus permanen dari sistem."
        confirmLabel={deleteLoading ? "Menghapus..." : "Ya, Hapus Kamar"}
        cancelLabel="Batal"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
          <span className="material-symbols-outlined text-[16px] animate-spin text-primary">sync</span>
          <span>Memuat data kamar...</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-primary uppercase">Modul Operasional</span>
            {profile.nama && (
              <>
                <span className="text-slate-400">•</span>
                <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold truncate">{profile.nama}</span>
              </>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Manajemen Data Kamar</h1>
        </div>
        <button
          onClick={() => { setShowAddModal(true); setNewRoom(emptyForm); }}
          className="skeu-button text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md w-full sm:w-auto"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Tambah Kamar Baru</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
        {[
          { label: "Total Unit",  val: rooms.length,     color: "text-slate-900",    sub: "Unit" },
          { label: "Terisi",      val: terisiCount,      color: "text-emerald-700",  sub: "Unit" },
          { label: "Tersedia",    val: kosongCount,      color: "text-blue-700",     sub: "Unit" },
          { label: "Perawatan",   val: perawatanCount,   color: "text-amber-700",    sub: "Unit" },
          { label: "Okupansi",    val: `${okupansi}%`,   color: "text-primary",      sub: "" },
        ].map((s, i) => (
          <div key={i} className={`skeu-card p-3 sm:p-4 rounded-xl flex flex-col justify-between ${i === 4 ? "col-span-2 sm:col-span-1" : ""}`}>
            <span className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase truncate">{s.label}</span>
            <div className={`text-xl sm:text-2xl font-black mt-1 ${s.color}`}>
              {s.val} {s.sub && <span className="text-xs font-normal text-slate-500">{s.sub}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/60">
        {["Semua", "Terisi", "Kosong", "Perawatan"].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              filter === cat ? "skeu-button text-white shadow-sm" : "skeu-card text-slate-600 hover:text-slate-900"
            }`}
          >
            {cat} ({cat === "Semua" ? rooms.length : rooms.filter((r) => r.status === cat).length})
          </button>
        ))}
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {filteredRooms.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <span className="material-symbols-outlined text-slate-300 text-[48px] block mb-3">bed</span>
            <p className="text-slate-400 text-sm font-medium">
              {rooms.length === 0 ? "Belum ada kamar. Klik 'Tambah Kamar Baru' untuk mulai." : "Tidak ada kamar dengan filter ini."}
            </p>
          </div>
        ) : filteredRooms.map((room) => (
          <div key={room.id} className="skeu-card p-4 sm:p-5 rounded-2xl flex flex-col justify-between transition hover:-translate-y-0.5">
            <div>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">Lantai {room.lantai}</span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">{room.nomor}</h3>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  room.status === "Terisi"    ? "bg-emerald-100 text-emerald-800" :
                  room.status === "Kosong"    ? "bg-blue-100 text-blue-800" :
                                               "bg-amber-100 text-amber-800"
                }`}>
                  {room.status}
                </span>
              </div>

              <div className="text-xs text-slate-500 mb-1.5">
                Tipe: <span className="font-bold text-slate-800">{room.tipe}</span>
              </div>
              <div className="text-base font-black text-primary mb-3">
                Rp {room.harga.toLocaleString("id-ID")}
                <span className="text-[10px] text-slate-400 font-normal"> / bln</span>
              </div>

              {room.penyewa ? (
                <div className="skeu-inset p-2.5 rounded-xl mb-3 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-slate-500 shrink-0">person</span>
                  <span className="font-bold text-slate-800 truncate">{room.penyewa}</span>
                </div>
              ) : (
                <div className="skeu-inset p-2.5 rounded-xl mb-3 text-xs text-slate-400 italic">
                  Belum ada penghuni
                </div>
              )}

              <div className="flex flex-wrap gap-1 mb-3">
                {room.fasilitas.map((f, i) => (
                  <span key={i} className="text-[9px] sm:text-[10px] px-2 py-0.5 bg-white/70 rounded-md text-slate-600 border border-slate-200">
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions — Edit + Delete (TANPA confirm() native) */}
            <div className="pt-3 border-t border-white/60 flex items-center gap-2">
              <button
                onClick={() => openEdit(room)}
                className="flex-1 skeu-button-secondary text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">edit</span>
                Edit
              </button>
              <button
                onClick={() => setDeleteTarget(room)}
                className="px-3 py-2 rounded-xl skeu-card text-red-500 hover:text-red-700 transition-colors"
                title="Hapus kamar"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Modal Tambah Kamar ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="skeu-card p-5 sm:p-6 rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto animate-fadeInUp">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/60">
              <h3 className="font-black text-base text-slate-900">Tambah Kamar Baru</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleAddRoom}>
              <RoomFormFields form={newRoom} onChange={setNewRoom} />
              <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-white/60">
                <button type="button" onClick={() => setShowAddModal(false)} className="skeu-button-secondary px-4 py-2 rounded-xl font-bold text-xs">
                  Batal
                </button>
                <button type="submit" disabled={addLoading} className="skeu-button px-5 py-2 rounded-xl font-bold text-xs shadow-md disabled:opacity-60">
                  {addLoading ? "Menyimpan..." : "Simpan Kamar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Edit Kamar ── */}
      {editRoom && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="skeu-card p-5 sm:p-6 rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto animate-fadeInUp">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/60">
              <div>
                <h3 className="font-black text-base text-slate-900">Edit Kamar</h3>
                <p className="text-[11px] text-slate-500">ID: {editRoom.nomor}</p>
              </div>
              <button onClick={() => setEditRoom(null)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleEditRoom}>
              <RoomFormFields form={editForm} onChange={setEditForm} showStatus={true} />

              {/* Upload foto kamar */}
              <div className="mt-4 pt-4 border-t border-white/60">
                <RoomPhotoUploader
                  roomId={editRoom.id}
                  currentPhotos={editRoom.fotoUrls || []}
                  onPhotosChange={(photos) => setEditRoom({ ...editRoom, fotoUrls: photos })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-white/60">
                <button type="button" onClick={() => setEditRoom(null)} className="skeu-button-secondary px-4 py-2 rounded-xl font-bold text-xs">
                  Batal
                </button>
                <button type="submit" disabled={editLoading} className="skeu-button px-5 py-2 rounded-xl font-bold text-xs shadow-md disabled:opacity-60">
                  {editLoading ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
