"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface AddressMapPickerProps {
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    suburb?: string;
    city_district?: string;
    city?: string;
    state?: string;
    postcode?: string;
  };
}

export default function AddressMapPicker({ value, onChange, placeholder }: AddressMapPickerProps) {
  const [query,       setQuery]       = useState(value);
  const [results,     setResults]     = useState<SearchResult[]>([]);
  const [searching,   setSearching]   = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selected,    setSelected]    = useState<{ lat: string; lon: string; label: string } | null>(null);
  const [showMap,     setShowMap]     = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef    = useRef<HTMLInputElement>(null);

  // Sync value from parent if changed externally
  useEffect(() => {
    if (value && value !== query && !selected) setQuery(value);
  }, [value]);

  // Search via our server-side proxy (avoids CORS)
  const searchAddress = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }
    setSearching(true);
    try {
      const res  = await fetch(`/api/maps/search?q=${encodeURIComponent(q)}`);
      const data: SearchResult[] = await res.json();
      setResults(data);
      if (data.length > 0) setShowResults(true);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleInputChange = (val: string) => {
    setQuery(val);
    onChange(val);
    setShowResults(false);
    setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAddress(val), 500);
  };

  const handleSelect = (r: SearchResult) => {
    // Build a clean address string
    const a = r.address;
    const parts = [
      a?.road,
      a?.suburb || a?.city_district,
      a?.city,
      a?.state,
      a?.postcode,
    ].filter(Boolean);
    const cleanAddr = parts.length > 0 ? parts.join(", ") : r.display_name;

    setQuery(cleanAddr);
    onChange(cleanAddr);
    setSelected({ lat: r.lat, lon: r.lon, label: cleanAddr });
    setShowResults(false);
    setShowMap(true);
  };

  const clear = () => {
    setQuery("");
    onChange("");
    setResults([]);
    setSelected(null);
    setShowMap(false);
    inputRef.current?.focus();
  };

  // Google Maps Embed URL — no API key required for search embed
  const getGoogleMapsEmbedUrl = (lat: string, lon: string) =>
    `https://maps.google.com/maps?q=${lat},${lon}&z=16&output=embed&hl=id`;

  const getGoogleMapsLink = (lat: string, lon: string, label: string) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`;

  return (
    <div className="space-y-3">
      {/* ── Search input ── */}
      <div className="relative">
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400 pointer-events-none shrink-0">
            {searching ? "sync" : "location_on"}
          </span>
          {searching && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-primary animate-spin">sync</span>
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 220)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); searchAddress(query); } }}
            placeholder={placeholder || "Ketik nama jalan, kelurahan, kota... lalu tekan Enter"}
            className="w-full pl-9 pr-20 py-3 rounded-xl skeu-inset text-slate-800 outline-none text-xs"
          />
          <div className="absolute right-2 flex items-center gap-1 shrink-0">
            {query && (
              <button type="button" onClick={clear} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => searchAddress(query)}
              disabled={!query || query.length < 2 || searching}
              className="px-2.5 py-1.5 rounded-lg skeu-button text-[10px] font-bold flex items-center gap-0.5 disabled:opacity-50 shadow-sm"
            >
              <span className="material-symbols-outlined text-[13px]">search</span>
              Cari
            </button>
          </div>
        </div>

        {/* ── Autocomplete dropdown ── */}
        {showResults && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-[60] mt-1.5 skeu-card rounded-2xl shadow-2xl overflow-hidden border border-white/80 max-h-64 overflow-y-auto">
            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[13px] text-slate-400">search</span>
              <span className="text-[10px] text-slate-500 font-semibold">{results.length} lokasi ditemukan</span>
            </div>
            {results.map((r, i) => {
              const a = r.address;
              const main  = a?.road || r.display_name.split(",")[0];
              const sub   = [a?.suburb || a?.city_district, a?.city].filter(Boolean).join(", ");
              return (
                <button
                  key={i}
                  type="button"
                  onMouseDown={() => handleSelect(r)}
                  className="w-full text-left px-3 py-3 hover:bg-primary/5 border-b border-white/40 last:border-0 flex items-start gap-2.5 transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/20 transition-colors">
                    <span className="material-symbols-outlined text-primary text-[15px]">location_on</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-slate-900 truncate">{main}</p>
                    {sub && <p className="text-[10px] text-slate-500 truncate mt-0.5">{sub}</p>}
                  </div>
                  <span className="material-symbols-outlined text-[14px] text-slate-300 group-hover:text-primary transition-colors shrink-0 mt-1">chevron_right</span>
                </button>
              );
            })}
          </div>
        )}

        {/* No results */}
        {showResults && results.length === 0 && !searching && query.length >= 2 && (
          <div className="absolute top-full left-0 right-0 z-[60] mt-1.5 skeu-card rounded-xl shadow-lg p-4 text-center">
            <span className="material-symbols-outlined text-slate-300 text-[28px] block mb-1">search_off</span>
            <p className="text-[11px] text-slate-500">Tidak ditemukan. Coba kata kunci lain atau tulis manual.</p>
          </div>
        )}
      </div>

      {/* ── Selected location actions ── */}
      {selected && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            Lokasi dipilih
          </div>
          <a
            href={getGoogleMapsLink(selected.lat, selected.lon, selected.label)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] font-bold text-primary skeu-button-secondary px-2.5 py-1.5 rounded-lg"
          >
            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            Buka Google Maps
          </a>
          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 skeu-button-secondary px-2.5 py-1.5 rounded-lg"
          >
            <span className="material-symbols-outlined text-[14px]">{showMap ? "map" : "map"}</span>
            {showMap ? "Sembunyikan Peta" : "Tampilkan di Maps"}
          </button>
        </div>
      )}

      {/* ── Google Maps Embed ── */}
      {showMap && selected && (
        <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md">
          {/* Header bar */}
          <div className="bg-white px-3 py-2 flex items-center justify-between border-b border-slate-100 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-primary text-[16px] shrink-0">location_on</span>
              <span className="text-[11px] font-semibold text-slate-700 truncate">{selected.label}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={getGoogleMapsLink(selected.lat, selected.lon, selected.label)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                Google Maps
              </a>
            </div>
          </div>
          {/* Google Maps Embed — no API key needed */}
          <iframe
            src={getGoogleMapsEmbedUrl(selected.lat, selected.lon)}
            width="100%"
            height="260"
            className="block border-0"
            title="Lokasi Kost di Google Maps"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div className="bg-slate-50 px-3 py-1.5 text-[9px] text-slate-400 text-center">
            Peta dari Google Maps · Koordinat: {parseFloat(selected.lat).toFixed(5)}, {parseFloat(selected.lon).toFixed(5)}
          </div>
        </div>
      )}

      <p className="text-[10px] text-slate-400 flex items-center gap-1">
        <span className="material-symbols-outlined text-[12px]">info</span>
        Ketik alamat lalu pilih dari hasil — atau tulis manual dan tekan Enter untuk cari.
      </p>
    </div>
  );
}
