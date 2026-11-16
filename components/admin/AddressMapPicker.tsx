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

/** Ekstrak lat/lon dari berbagai format link Google Maps:
 *  - https://maps.app.goo.gl/...  (short link — perlu resolve, skip)
 *  - https://www.google.com/maps/place/.../@-6.123,106.456,17z/...
 *  - https://www.google.com/maps?q=-6.123,106.456
 *  - https://maps.google.com/maps?q=-6.123,106.456
 *  - https://www.google.com/maps/search/-6.123,106.456
 */
function extractCoordsFromGoogleMaps(text: string): { lat: string; lon: string } | null {
  // Format: @lat,lon,zoom
  const atMatch = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) return { lat: atMatch[1], lon: atMatch[2] };

  // Format: ?q=lat,lon  or  ?q=PlaceName@lat,lon
  const qMatch = text.match(/[?&]q=(?:[^@]*@)?(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) return { lat: qMatch[1], lon: qMatch[2] };

  // Format: /search/lat,lon  or  /place/lat,lon
  const slashMatch = text.match(/\/(?:search|place)\/(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (slashMatch) return { lat: slashMatch[1], lon: slashMatch[2] };

  // Format: ll=lat,lon
  const llMatch = text.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (llMatch) return { lat: llMatch[1], lon: llMatch[2] };

  return null;
}

/** Reverse-geocode koordinat → nama alamat via proxy */
async function reverseGeocode(lat: string, lon: string): Promise<string> {
  try {
    const res = await fetch(`/api/maps/search?q=${lat},${lon}&type=reverse`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    if (Array.isArray(data) && data[0]?.display_name) return data[0].display_name;
  } catch {}
  return `${parseFloat(lat).toFixed(5)}, ${parseFloat(lon).toFixed(5)}`;
}

export default function AddressMapPicker({ value, onChange, placeholder }: AddressMapPickerProps) {
  const [query,       setQuery]       = useState(value);
  const [results,     setResults]     = useState<SearchResult[]>([]);
  const [searching,   setSearching]   = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selected,    setSelected]    = useState<{ lat: string; lon: string; label: string } | null>(null);
  const [gmapsHint,   setGmapsHint]   = useState(false); // hint bahwa input adalah link gmaps
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef    = useRef<HTMLInputElement>(null);

  // Sync value dari parent
  useEffect(() => {
    if (value && value !== query && !selected) setQuery(value);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Search via server-side proxy
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
      setShowResults(data.length > 0);
      if (data.length > 0 && !selected) {
        setSelected({ lat: data[0].lat, lon: data[0].lon, label: q });
      }
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [selected]);

  /** Handle perubahan input — deteksi link Google Maps secara real-time */
  const handleInputChange = async (val: string) => {
    setQuery(val);
    onChange(val);
    setShowResults(false);
    setSelected(null);
    setGmapsHint(false);

    // ── Deteksi link Google Maps ──────────────────────────────────────────
    const isGmapsLink = val.includes("google.com/maps") || val.includes("maps.app.goo.gl") || val.includes("maps.google.com");
    if (isGmapsLink) {
      setGmapsHint(true);
      const coords = extractCoordsFromGoogleMaps(val);
      if (coords) {
        setSearching(true);
        const label = await reverseGeocode(coords.lat, coords.lon);
        setQuery(label);
        onChange(label);
        setSelected({ lat: coords.lat, lon: coords.lon, label });
        setGmapsHint(false);
        setSearching(false);
      }
      // Short links (maps.app.goo.gl) — tidak bisa di-resolve dari browser, tampil hint saja
      return;
    }

    // ── Search teks biasa ─────────────────────────────────────────────────
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAddress(val), 600);
  };

  const handleSelect = (r: SearchResult) => {
    const a = r.address;
    const parts = [a?.road, a?.suburb || a?.city_district, a?.city, a?.state, a?.postcode].filter(Boolean);
    const cleanAddr = parts.length > 0 ? parts.join(", ") : r.display_name;
    setQuery(cleanAddr);
    onChange(cleanAddr);
    setSelected({ lat: r.lat, lon: r.lon, label: cleanAddr });
    setShowResults(false);
  };

  const handleSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSelected(null);
    searchAddress(query);
  };

  const clear = () => {
    setQuery("");
    onChange("");
    setResults([]);
    setSelected(null);
    setShowResults(false);
    setGmapsHint(false);
    inputRef.current?.focus();
  };

  const getGoogleMapsEmbedUrl = (lat: string, lon: string) =>
    `https://maps.google.com/maps?q=${lat},${lon}&z=16&output=embed&hl=id`;

  const getGoogleMapsLink = (lat: string, lon: string, label: string) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`;

  return (
    <div className="space-y-3">
      {/* ── Search input ── */}
      <div className="relative">
        <div className="flex items-center gap-2">
          {/* Input wrapper — ikon di dalam */}
          <div className="relative flex-1">
            {/* Icon — SATU elemen, tidak overlap */}
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] pointer-events-none select-none text-slate-400">
              {searching ? "sync" : "location_on"}
            </span>
            {/* Spin animasi hanya via style, bukan className double */}
            <style>{`
              .maps-spin { animation: spin 0.8s linear infinite; }
              @keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }
            `}</style>
            {searching && (
              <span className="material-symbols-outlined maps-spin absolute left-3 top-1/2 text-[18px] pointer-events-none select-none text-primary">sync</span>
            )}

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => results.length > 0 && setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 220)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}
              placeholder={placeholder || "Ketik alamat / paste link Google Maps..."}
              className="w-full pl-9 pr-8 py-3 rounded-xl skeu-inset text-slate-800 outline-none text-xs"
            />

            {query && (
              <button
                type="button"
                onClick={clear}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Tombol Cari */}
          <button
            type="button"
            onClick={handleSearch}
            disabled={!query || query.length < 2 || searching}
            className="shrink-0 px-3 py-3 rounded-xl skeu-button text-[11px] font-bold flex items-center gap-1 disabled:opacity-50 shadow-sm"
          >
            <span className="material-symbols-outlined text-[15px]">search</span>
            Cari
          </button>
        </div>

        {/* ── Hint: link Google Maps terdeteksi ── */}
        {gmapsHint && (
          <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-primary font-semibold">
            <span className="material-symbols-outlined text-[13px] animate-spin">sync</span>
            Link Google Maps terdeteksi — membaca koordinat lokasi...
          </div>
        )}

        {/* ── Autocomplete dropdown ── */}
        {showResults && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-[60] mt-1.5 skeu-card rounded-2xl shadow-2xl overflow-hidden border border-white/80 max-h-64 overflow-y-auto">
            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[13px] text-slate-400">search</span>
              <span className="text-[10px] text-slate-500 font-semibold">{results.length} lokasi — pilih untuk lihat peta</span>
            </div>
            {results.map((r, i) => {
              const a = r.address;
              const main = a?.road || r.display_name.split(",")[0];
              const sub  = [a?.suburb || a?.city_district, a?.city].filter(Boolean).join(", ");
              return (
                <button
                  key={i}
                  type="button"
                  onMouseDown={() => handleSelect(r)}
                  className="w-full text-left px-3 py-3 hover:bg-primary/5 border-b border-white/40 last:border-0 flex items-start gap-2.5 transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/20">
                    <span className="material-symbols-outlined text-primary text-[15px]">location_on</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-slate-900 truncate">{main}</p>
                    {sub && <p className="text-[10px] text-slate-500 truncate mt-0.5">{sub}</p>}
                  </div>
                  <span className="material-symbols-outlined text-[14px] text-slate-300 group-hover:text-primary shrink-0 mt-1">chevron_right</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Tidak ada hasil */}
        {showResults && results.length === 0 && !searching && query.length >= 2 && (
          <div className="absolute top-full left-0 right-0 z-[60] mt-1.5 skeu-card rounded-xl shadow-lg p-4 text-center">
            <span className="material-symbols-outlined text-slate-300 text-[28px] block mb-1">search_off</span>
            <p className="text-[11px] text-slate-500">Tidak ditemukan. Coba kata kunci lain atau tulis manual.</p>
          </div>
        )}
      </div>

      {/* ── Google Maps Embed — tampil segera setelah ada koordinat ── */}
      {selected && (
        <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md">
          <div className="bg-white px-3 py-2 flex items-center justify-between border-b border-slate-100 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-primary text-[16px] shrink-0">location_on</span>
              <span className="text-[11px] font-semibold text-slate-700 truncate">{selected.label}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[9px] text-slate-400 font-mono hidden sm:block">
                {parseFloat(selected.lat).toFixed(5)}, {parseFloat(selected.lon).toFixed(5)}
              </span>
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
          <iframe
            src={getGoogleMapsEmbedUrl(selected.lat, selected.lon)}
            width="100%"
            height="280"
            className="block border-0"
            title="Lokasi Kost"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}

      {/* ── Hint teks ── */}
      {!selected && (
        <p className="text-[10px] text-slate-400 flex items-center gap-1 flex-wrap">
          <span className="material-symbols-outlined text-[12px]">info</span>
          Ketik alamat lalu tekan <strong>Cari</strong>, atau
          <span className="text-primary font-semibold">paste link Google Maps</span>
          langsung di sini — koordinat terbaca otomatis.
        </p>
      )}
    </div>
  );
}
