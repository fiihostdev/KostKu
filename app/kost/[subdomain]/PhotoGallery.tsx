"use client";

import { useState } from "react";

interface PhotoGalleryProps {
  photos: string[];
  alt: string;
}

export default function PhotoGallery({ photos, alt }: PhotoGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIdx, setCurrentIdx]     = useState(0);

  if (!photos || photos.length === 0) {
    return (
      <div className="rounded-xl bg-slate-100 mb-3 aspect-video flex items-center justify-center">
        <span className="material-symbols-outlined text-slate-300 text-[36px]">bedroom_parent</span>
      </div>
    );
  }

  const prev = () => setCurrentIdx((i) => (i - 1 + photos.length) % photos.length);
  const next = () => setCurrentIdx((i) => (i + 1) % photos.length);

  return (
    <>
      {/* Thumbnail grid */}
      <div className="mb-3 space-y-1.5">
        {/* Main photo */}
        <div
          className="rounded-xl overflow-hidden aspect-video bg-slate-100 cursor-pointer relative group"
          onClick={() => { setCurrentIdx(0); setLightboxOpen(true); }}
        >
          <img
            src={photos[0]}
            alt={`${alt} - Foto 1`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {photos.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              +{photos.length - 1} foto
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[28px] opacity-0 group-hover:opacity-100 transition-opacity drop-shadow">zoom_in</span>
          </div>
        </div>

        {/* Thumbnail strip */}
        {photos.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {photos.map((p, i) => (
              <button
                key={i}
                onClick={() => { setCurrentIdx(i); setLightboxOpen(true); }}
                className={`w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                  i === 0 ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <img src={p} alt={`${alt} ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            {/* Close */}
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white"
            >
              <span className="material-symbols-outlined text-[28px]">close</span>
            </button>

            {/* Main image */}
            <img
              src={photos[currentIdx]}
              alt={`${alt} - Foto ${currentIdx + 1}`}
              className="w-full max-h-[70vh] object-contain rounded-xl"
            />

            {/* Nav */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button
                  onClick={next}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </>
            )}

            {/* Counter */}
            <div className="text-center text-white/70 text-xs mt-3 font-semibold">
              {currentIdx + 1} / {photos.length}
            </div>

            {/* Thumbnail strip */}
            {photos.length > 1 && (
              <div className="flex gap-2 justify-center mt-3">
                {photos.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIdx(i)}
                    className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                      i === currentIdx ? "border-primary scale-110" : "border-transparent opacity-50"
                    }`}
                  >
                    <img src={p} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
