"use client";

import { useState, useCallback, useRef } from "react";

interface AddressMapPickerProps {
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

export default function AddressMapPicker({ value, onChange, placeholder }: AddressMapPickerProps) {
  const [query,       setQuery]       = useState(value);
  const [results,     setResults]     = useState<NominatimResult[]>([]);
  const [searching,   setSearching]   = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selected,    setSelected]    = useState<{ lat: string; lon: string } | null>(null);
  const [showMap,     setShowMap]     = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // OpenStreetMap Nominatim — free, no API key needed
  const searchAddress = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 3) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&countrycodes=id&accept-language=id`,
        { headers: { "User-Agent": "KOSTKU-Platform/1.0" } }
      );
      const data: NominatimResult[] = await res.json();
      setResults(data);
      setShowResults(true);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleInputChange = (val: string) => {
    setQuery(val);
    onChange(val); // update parent immediately with typed value
    setShowResults(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAddress(val), 600);
  };

  const handleSelect = (result: NominatimResult) => {
    const addr = result.display_name;
    setQuery(addr);
    onChange(addr);
    setSelected({ lat: result.lat, lon: result.lon });
    setShowResults(false);
    setShowMap(true);
  };

  const handleManualSave = () => {
    onChange(query);
    setShowResults(false);
  };

  // Static map thumbnail from OpenStreetMap
  const getMapUrl = (lat: string, lon: string) =>
    `https://www.openstreetmap.org/export/embed.html?bbox=${Number(lon)-0.01},${Number(lat)-0.01},${Number(lon)+0.01},${Number(lat)+0.01}&layer=mapnik&marker=${lat},${lon}`;

  const getMapsLink = (lat: string, lon: string) =>
    `https://maps.google.com/?q=${lat},${lon}`;

  return (
    <div className="space-y-2">
      {/* Search input */}
      <div className="relative">
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-[18px] text-slate-400 pointer-events-none">search</span>
          <input
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={placeholder || "Ketik nama jalan, kelurahan, kota..."}
            className="w-full pl-9 pr-20 p-2.5 rounded-xl skeu-inset text-slate-800 outline-none text-xs"
            onFocus={() => results.length > 0 && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
          />
          <div className="absolute right-2 flex items-center gap-1">
            {searching && (
              <span className="material-symbols-outlined text-[16px] text-slate-400 animate-spin">sync</span>
            )}
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(""); onChange(""); setResults([]); setSelected(null); setShowMap(false); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Search results dropdown */}
        {showResults && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 skeu-card rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={() => handleSelect(r)}
                className="w-full text-left px-3 py-2.5 text-xs hover:bg-primary/5 border-b border-white/40 last:border-0 flex items-start gap-2 transition-colors"
              >
                <span className="material-symbols-outlined text-primary text-[16px] shrink-0 mt-0.5">location_on</span>
                <span className="text-slate-700 leading-relaxed line-clamp-2">{r.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2 text-[11px]">
        <button
          type="button"
          onClick={() => searchAddress(query)}
          disabled={!query || query.length < 3 || searching}
          className="skeu-button-secondary px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[14px]">search</span>
          Cari
        </button>
        {selected && (
          <a
            href={getMapsLink(selected.lat, selected.lon)}
            target="_blank"
            rel="noopener noreferrer"
            className="skeu-button-secondary px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 text-primary"
          >
            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            Buka Google Maps
          </a>
        )}
        {selected && (
          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            className="skeu-button-secondary px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 text-slate-600"
          >
            <span className="material-symbols-outlined text-[14px]">map</span>
            {showMap ? "Sembunyikan Peta" : "Lihat Peta"}
          </button>
        )}
      </div>

      {/* Map preview */}
      {showMap && selected && (
        <div className="rounded-xl overflow-hidden border border-white/60 shadow-sm">
          <div className="bg-slate-50 px-3 py-1.5 flex items-center justify-between border-b border-slate-200">
            <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] text-primary">location_on</span>
              Peta Lokasi — OpenStreetMap
            </span>
            <a
              href={getMapsLink(selected.lat, selected.lon)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5"
            >
              Google Maps
              <span className="material-symbols-outlined text-[11px]">open_in_new</span>
            </a>
          </div>
          <iframe
            src={getMapUrl(selected.lat, selected.lon)}
            width="100%"
            height="220"
            className="block border-0"
            title="Peta Lokasi Kost"
            loading="lazy"
          />
        </div>
      )}

      <p className="text-[10px] text-slate-400">
        Ketik alamat lalu pilih dari hasil pencarian, atau tulis manual. Peta powered by OpenStreetMap.
      </p>
    </div>
  );
}
