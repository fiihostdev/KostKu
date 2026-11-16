"use client";

import { useState } from "react";

interface WebsitePreviewProps {
  subdomain: string;
  appDomain: string;
}

export default function WebsitePreview({ subdomain, appDomain }: WebsitePreviewProps) {
  const [view, setView] = useState<"desktop" | "mobile">("mobile");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const url = `https://${subdomain}.${appDomain}`;

  return (
    <div className="skeu-card p-4 rounded-2xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">preview</span>
          <h3 className="font-bold text-slate-900 text-sm">Preview Website Publik</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {/* View toggle */}
          <div className="flex skeu-inset rounded-lg p-0.5">
            <button
              onClick={() => setView("mobile")}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${view === "mobile" ? "skeu-button text-white shadow-sm" : "text-slate-500"}`}
            >
              <span className="material-symbols-outlined text-[13px]">smartphone</span>
              Mobile
            </button>
            <button
              onClick={() => setView("desktop")}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${view === "desktop" ? "skeu-button text-white shadow-sm" : "text-slate-500"}`}
            >
              <span className="material-symbols-outlined text-[13px]">laptop</span>
              Desktop
            </button>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="skeu-button-secondary text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-primary"
          >
            <span className="material-symbols-outlined text-[13px]">open_in_new</span>
            Live
          </a>
        </div>
      </div>

      {/* Preview frame */}
      <div className={`mx-auto transition-all duration-300 ${view === "mobile" ? "max-w-[320px]" : "max-w-full"}`}>
        <div className={`relative overflow-hidden bg-slate-100 rounded-2xl shadow-inner ${view === "mobile" ? "border-4 border-slate-700 rounded-[24px]" : "border border-slate-300"}`}>
          {/* Mobile notch bar */}
          {view === "mobile" && (
            <div className="bg-slate-700 h-6 flex items-center justify-center">
              <div className="w-16 h-2 rounded-full bg-slate-500"></div>
            </div>
          )}

          {/* Loading indicator */}
          {!loaded && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-10">
              <div className="text-center space-y-2">
                <span className="material-symbols-outlined text-primary text-[32px] animate-spin block">sync</span>
                <p className="text-[11px] text-slate-500 font-semibold">Memuat preview...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-48 bg-slate-50">
              <div className="text-center space-y-2">
                <span className="material-symbols-outlined text-slate-300 text-[32px] block">web_asset_off</span>
                <p className="text-[11px] text-slate-500">Preview tidak tersedia</p>
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-primary hover:underline">
                  Buka di tab baru →
                </a>
              </div>
            </div>
          )}

          <iframe
            key={`${subdomain}-${view}`}
            src={url}
            className={`w-full border-0 transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
            style={{ height: view === "mobile" ? "520px" : "400px" }}
            title={`Preview ${subdomain}.${appDomain}`}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => { setError(true); setLoaded(true); }}
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      </div>

      {/* URL bar */}
      <div className="flex items-center gap-2 skeu-inset px-3 py-2 rounded-xl">
        <span className="material-symbols-outlined text-emerald-600 text-[14px] shrink-0">lock</span>
        <span className="text-[11px] font-mono text-slate-700 truncate flex-1">{url}</span>
        <button
          onClick={() => { navigator.clipboard?.writeText(url); }}
          className="text-slate-400 hover:text-primary shrink-0"
          title="Salin link"
        >
          <span className="material-symbols-outlined text-[14px]">content_copy</span>
        </button>
      </div>
    </div>
  );
}
