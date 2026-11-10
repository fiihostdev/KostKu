"use client";

import { useState, useRef, useCallback } from "react";

interface LogoUploaderProps {
  currentLogoUrl: string;
  onUploadSuccess: (logoUrl: string) => void;
}

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"];

export default function LogoUploader({ currentLogoUrl, onUploadSuccess }: LogoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentLogoUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Format tidak didukung. Gunakan JPG, PNG, WebP, atau SVG.";
    }
    if (file.size > MAX_SIZE) {
      return `Ukuran terlalu besar. Maksimal 2MB (saat ini ${(file.size / 1024 / 1024).toFixed(1)}MB).`;
    }
    return null;
  };

  const uploadFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    try {
      const formData = new FormData();
      formData.append("logo", file);

      const res = await fetch("/api/upload-logo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Upload gagal");
        setPreview(currentLogoUrl || null);
        URL.revokeObjectURL(localUrl);
        return;
      }

      // Revoke local preview, pakai URL dari server
      URL.revokeObjectURL(localUrl);
      setPreview(data.logoUrl);
      onUploadSuccess(data.logoUrl);

    } catch {
      setError("Gagal menghubungi server. Coba lagi.");
      setPreview(currentLogoUrl || null);
      URL.revokeObjectURL(localUrl);
    } finally {
      setUploading(false);
    }
  }, [currentLogoUrl, onUploadSuccess]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    // Reset input agar bisa upload file yang sama lagi
    e.target.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/upload-logo", { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setPreview(null);
        onUploadSuccess("");
      } else {
        setError(data.error || "Gagal menghapus logo");
      }
    } catch {
      setError("Gagal menghubungi server");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="font-bold text-slate-700 block text-xs">Logo Kost</label>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all p-5 flex items-center gap-4 ${
          dragOver
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-slate-300 hover:border-primary hover:bg-primary/3 bg-white/40"
        } ${uploading ? "pointer-events-none opacity-70" : ""}`}
      >
        {/* Preview / placeholder */}
        <div className="w-16 h-16 rounded-xl skeu-inset flex items-center justify-center shrink-0 overflow-hidden bg-white">
          {preview ? (
            <img
              src={preview}
              alt="Logo Kost"
              className="w-full h-full object-contain p-1"
              onError={() => setPreview(null)}
            />
          ) : (
            <span className="material-symbols-outlined text-slate-300 text-[32px]">add_photo_alternate</span>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          {uploading ? (
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px] animate-spin">sync</span>
              <span className="text-xs font-bold text-primary">Mengupload logo...</span>
            </div>
          ) : preview ? (
            <>
              <p className="text-xs font-bold text-slate-800">Logo sudah terpasang</p>
              <p className="text-[11px] text-slate-500">Klik atau drag file baru untuk mengganti</p>
            </>
          ) : (
            <>
              <p className="text-xs font-bold text-slate-800">Upload Logo Kost</p>
              <p className="text-[11px] text-slate-500">
                Drag & drop atau klik untuk pilih file
              </p>
            </>
          )}
          <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WebP, SVG · Maks. 2MB · Rekomendasi 400×400px</p>
        </div>

        {/* Upload icon */}
        {!uploading && (
          <span className="material-symbols-outlined text-slate-400 text-[22px] shrink-0">
            {preview ? "edit" : "upload"}
          </span>
        )}

        {/* Input hidden */}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-1.5 text-red-700 text-[11px] font-bold">
          <span className="material-symbols-outlined text-[14px] shrink-0 mt-0.5">error</span>
          {error}
        </div>
      )}

      {/* Delete button */}
      {preview && !uploading && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleDelete(); }}
          disabled={deleting}
          className="flex items-center gap-1 text-red-600 hover:text-red-800 text-[11px] font-bold transition-colors"
        >
          <span className={`material-symbols-outlined text-[14px] ${deleting ? "animate-spin" : ""}`}>
            {deleting ? "sync" : "delete"}
          </span>
          {deleting ? "Menghapus..." : "Hapus Logo"}
        </button>
      )}
    </div>
  );
}
