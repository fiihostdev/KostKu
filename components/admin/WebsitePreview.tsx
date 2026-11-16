"use client";

import { useState } from "react";

interface WebsitePreviewProps {
  subdomain: string;
  appDomain: string;
}

export default function WebsitePreview({ subdomain, appDomain }: WebsitePreviewProps) {
  const [view,       setView]       = useState<"mobile" | "desktop">("mobile");
  const [imgLoaded,  setImgLoaded]  = useState(false);
  const [imgError,   setImgError]   = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  // Try multiple screenshot providers in order
  const [providerIdx, setProviderIdx] = useState(0);

  const url = `https://${subdomain}.${appDomain}`;
  const encodedUrl = encodeURIComponent(url);

  // Screenshot providers — tried in order on error
  const providers = [
    // 1. Microlink — free tier, reliable
    view === "mobile"
      ? `https://api.microlink.io/?url=${encodedUrl}&screenshot=true&meta=false&embed=screenshot.url&viewport.width=390&viewport.height=844&viewport.deviceScaleFactor=2`
      : `https://api.microlink.io/?url=${encodedUrl}&screenshot=true&meta=false&embed=screenshot.url&viewport.width=1280&viewport.height=720`,
    // 2. thum.io fallback
    view === "mobile"
      ? `https://image.thum.io/get/width/390/crop/844/noanimate/viewportWidth/390/${url}?${refreshKey}`
      : `https://image.thum.io/get/width/1280/crop/720/noanimate/viewportWidth/1280/${url}?${refreshKey}`,
    // 3. s-shot.ru fallback
    `https://mini.s-shot.ru/1280x720/PNG/1280/Z100/?${encodedUrl}`,
  ];

  const screenshotUrl = providers[Math.min(providerIdx, providers.length - 1)];

  const handleRefresh = () => {
    setImgLoaded(false);
    setImgError(false);
    setProviderIdx(0);
    setRefreshKey((k) => k + 1);
  };

  const handleImgError = () => {
    // Try next provider
    if (providerIdx < providers.length - 1) {
      setProviderIdx((p) => p + 1);
      setImgLoaded(false);
      setImgError(false);
    } else {
      setImgError(true);
      setImgLoaded(true);
    }
  };

  const switchView = (v: "mobile" | "desktop") => {
    setView(v);
    setImgLoaded(false);
    setImgError(false);
    setProviderIdx(0);
  };

  return (
    <div className="skeu-card rounded-2xl overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/60 bg-white/40 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">web</span>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Preview Website Publik</h3>
            <p className="text-[10px] text-slate-500 font-mono">{url}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Mobile/Desktop toggle */}
          <div className="flex skeu-inset rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => switchView("mobile")}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                view === "mobile" ? "skeu-button text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span className="material-symbols-outlined text-[13px]">smartphone</span>
              Mobile
            </button>
            <button
              onClick={() => switchView("desktop")}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                view === "desktop" ? "skeu-button text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span className="material-symbols-outlined text-[13px]">laptop</span>
              Desktop
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            title="Refresh screenshot"
            className="p-1.5 rounded-lg skeu-card text-slate-500 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
          </button>

          {/* Open live */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg skeu-button text-[11px] font-bold shadow-sm"
          >
            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            Buka Live
          </a>
        </div>
      </div>

      {/* ── Preview area ── */}
      <div className="p-4 bg-slate-100">
        <div className={`mx-auto transition-all duration-300 ${view === "mobile" ? "max-w-[300px]" : "max-w-full"}`}>
          {/* Device frame */}
          <div className={`relative bg-white shadow-xl ${
            view === "mobile"
              ? "rounded-[32px] border-[8px] border-slate-800"
              : "rounded-lg border-2 border-slate-300"
          }`}>
            {/* Mobile: notch */}
            {view === "mobile" && (
              <>
                <div className="bg-slate-800 h-7 flex items-center justify-center rounded-t-[22px]">
                  <div className="w-20 h-2.5 rounded-full bg-slate-600"></div>
                </div>
                <div className="absolute -right-[11px] top-20 w-1.5 h-8 bg-slate-700 rounded-r-sm"></div>
                <div className="absolute -left-[11px] top-16 w-1.5 h-6 bg-slate-700 rounded-l-sm"></div>
                <div className="absolute -left-[11px] top-24 w-1.5 h-6 bg-slate-700 rounded-l-sm"></div>
              </>
            )}
            {/* Desktop: browser bar */}
            {view === "desktop" && (
              <div className="bg-slate-50 h-8 flex items-center px-3 gap-2 border-b border-slate-200 rounded-t-lg">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                </div>
                <div className="flex-1 bg-white border border-slate-200 rounded-md h-5 flex items-center px-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[11px] mr-1">lock</span>
                  <span className="text-[9px] text-slate-500 font-mono truncate">{url}</span>
                </div>
              </div>
            )}

            {/* Screenshot area */}
            <div
              className={`relative overflow-hidden ${view === "mobile" ? "rounded-b-[22px]" : "rounded-b-lg"}`}
              style={{ minHeight: view === "mobile" ? "480px" : "320px" }}
            >
              {/* Loading overlay */}
              {!imgLoaded && !imgError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 gap-2 z-10">
                  <span className="material-symbols-outlined text-primary text-[32px] animate-spin">sync</span>
                  <p className="text-[11px] text-slate-500 font-semibold">Memuat screenshot...</p>
                  <p className="text-[9px] text-slate-400 text-center px-4">Ini mungkin memerlukan beberapa detik</p>
                </div>
              )}

              {/* Error / fallback state */}
              {imgError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 gap-3 p-6 z-10">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[24px]">web</span>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-700 mb-1">Screenshot tidak tersedia</p>
                    <p className="text-[10px] text-slate-500 leading-relaxed mb-3">
                      Website mungkin belum dapat di-screenshot. Gunakan tombol <strong>Buka Live</strong> untuk melihat langsung.
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-2 w-full max-w-[180px]">
                    <button
                      onClick={handleRefresh}
                      className="skeu-button text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm w-full justify-center"
                    >
                      <span className="material-symbols-outlined text-[14px]">refresh</span>
                      Coba Lagi
                    </button>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 justify-center"
                    >
                      <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                      Buka di tab baru
                    </a>
                  </div>
                </div>
              )}

              {/* Screenshot image */}
              <img
                key={`${subdomain}-${view}-${providerIdx}-${refreshKey}`}
                src={screenshotUrl}
                alt={`Preview ${subdomain}.${appDomain}`}
                className={`w-full object-cover object-top transition-opacity duration-300 ${
                  imgLoaded && !imgError ? "opacity-100" : "opacity-0 absolute"
                }`}
                style={{ minHeight: view === "mobile" ? "480px" : "320px" }}
                onLoad={() => { setImgLoaded(true); setImgError(false); }}
                onError={handleImgError}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="px-4 py-2.5 bg-white/60 border-t border-white/60 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <span className="material-symbols-outlined text-[13px] text-slate-400">photo_camera</span>
          Screenshot otomatis dari website publik Anda
        </div>
        <div className="flex items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5"
          >
            {url}
            <span className="material-symbols-outlined text-[11px]">open_in_new</span>
          </a>
          <button
            onClick={() => { navigator.clipboard?.writeText(url); }}
            className="text-slate-400 hover:text-primary transition-colors"
            title="Salin link"
          >
            <span className="material-symbols-outlined text-[14px]">content_copy</span>
          </button>
        </div>
      </div>
    </div>
  );
}
