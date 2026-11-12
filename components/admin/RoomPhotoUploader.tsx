"use client";

import { useState, useRef, useCallback } from "react";

interface RoomPhotoUploaderProps {
  roomId: string;
  currentPhotos: string[];
  onPhotosChange: (photos: string[]) => void;
}

export default function RoomPhotoUploader({ roomId, currentPhotos, onPhotosChange }: RoomPhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (currentPhotos.length >= 5) {
      setError("Maksimal 5 foto per kamar");
      return;
    }

    setUploading(true);
    setError(null);

    const uploadedUrls: string[] = [];
    for (const file of Array.from(files)) {
      if (currentPhotos.length + uploadedUrls.length >= 5) break;

      const fd = new FormData();
      fd.append("roomId", roomId);
      fd.append("photo", file);

      const res = await fetch("/api/rooms/photos", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Upload gagal");
        break;
      }
      uploadedUrls.push(data.photoUrl);
    }

    if (uploadedUrls.length > 0) {
      onPhotosChange([...currentPhotos, ...uploadedUrls]);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }, [roomId, currentPhotos, onPhotosChange]);

  const handleDelete = useCallback(async (photoUrl: string) => {
    setDeleting(photoUrl);
    setError(null);
    try {
      const res = await fetch("/api/rooms/photos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, photoUrl }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onPhotosChange(currentPhotos.filter((p) => p !== photoUrl));
      } else {
        setError(data.error || "Gagal hapus foto");
      }
    } catch {
      setError("Gagal menghubungi server");
    } finally {
      setDeleting(null);
    }
  }, [roomId, currentPhotos, onPhotosChange]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="font-bold text-slate-700 text-xs">Foto Kamar <span className="text-slate-400 font-normal">({currentPhotos.length}/5)</span></label>
        {currentPhotos.length < 5 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-[11px] text-primary font-bold hover:underline flex items-center gap-1 disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[14px] ${uploading ? "animate-spin" : ""}`}>
              {uploading ? "sync" : "add_photo_alternate"}
            </span>
            {uploading ? "Mengupload..." : "Tambah Foto"}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          onChange={(e) => handleUpload(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Grid foto */}
      {currentPhotos.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {currentPhotos.map((url, i) => (
            <div key={url} className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
              <img
                src={url}
                alt={`Foto ${i + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = ""; }}
              />
              {/* Overlay hapus */}
              <button
                type="button"
                onClick={() => handleDelete(url)}
                disabled={deleting === url}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              >
                {deleting === url
                  ? <span className="material-symbols-outlined text-white text-[20px] animate-spin">sync</span>
                  : <span className="material-symbols-outlined text-white text-[20px]">delete</span>
                }
              </button>
              {i === 0 && (
                <span className="absolute top-1 left-1 text-[9px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-md">
                  Utama
                </span>
              )}
            </div>
          ))}
          {/* Placeholder tambah */}
          {currentPhotos.length < 5 && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-primary flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-slate-400 text-[24px]">add_photo_alternate</span>
            </button>
          )}
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-primary rounded-xl p-4 text-center cursor-pointer transition-colors"
        >
          <span className="material-symbols-outlined text-slate-400 text-[32px] block mb-1">add_photo_alternate</span>
          <p className="text-[11px] text-slate-500">Klik untuk upload foto kamar</p>
          <p className="text-[10px] text-slate-400">JPG, PNG, WebP · Max 5MB · Max 5 foto</p>
        </div>
      )}

      {error && (
        <p className="text-[11px] text-red-700 font-bold flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px]">error</span>
          {error}
        </p>
      )}
    </div>
  );
}
