"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase-browser";
import type { PlanLimits } from "./plan-limits";

interface PlanStatus {
  paket:          string;
  limits:         PlanLimits | null;
  usage:          { rooms: number };
  canAddRoom:     boolean;
  roomsRemaining: number;
  suspended:      boolean;
  expired:        boolean;
  loading:        boolean;
  error:          string | null;
}

const defaultStatus: PlanStatus = {
  paket:          "",
  limits:         null,
  usage:          { rooms: 0 },
  canAddRoom:     true,
  roomsRemaining: 999,
  suspended:      false,
  expired:        false,
  loading:        true,
  error:          null,
};

/**
 * usePlanLimits — hook untuk cek limit paket admin yang sedang login.
 *
 * Realtime: subscribe ke UPDATE pada baris kost_profiles milik user ini.
 * Ketika superadmin mengubah paket/max_kamar/is_suspended/expires_at di DB,
 * hook langsung re-fetch tanpa perlu refresh halaman.
 *
 * Prasyarat DB:
 *   ALTER TABLE kost_profiles REPLICA IDENTITY FULL;
 *   ALTER PUBLICATION supabase_realtime ADD TABLE kost_profiles;
 */
export function usePlanLimits() {
  const [status, setStatus] = useState<PlanStatus>(defaultStatus);

  // useRef agar cleanup selalu bisa akses channel yang sebenarnya
  // (menghindari race condition antara async .then() dan cleanup sync)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  const check = useCallback(async () => {
    setStatus((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res  = await fetch("/api/plan/check", { cache: "no-store" });
      const data = await res.json();

      if (res.status === 403) {
        setStatus({ ...defaultStatus, loading: false, suspended: true, error: data.error });
        return;
      }
      if (res.status === 402) {
        setStatus({ ...defaultStatus, loading: false, expired: true, error: data.error });
        return;
      }
      if (!res.ok) {
        setStatus((prev) => ({ ...prev, loading: false, error: data.error ?? "Gagal cek paket" }));
        return;
      }

      setStatus({
        paket:          data.paket,
        limits:         data.limits,
        usage:          data.usage,
        canAddRoom:     data.canAddRoom,
        roomsRemaining: data.roomsRemaining,
        suspended:      false,
        expired:        false,
        loading:        false,
        error:          null,
      });
    } catch {
      setStatus((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    check();

    const supabase = createClient();
    supabaseRef.current = supabase;

    // Get this user's profile ID, then subscribe to realtime updates on that row only
    supabase.auth.getUser().then(({ data: authData }) => {
      if (!authData.user) return;

      supabase
        .from("kost_profiles")
        .select("id")
        .eq("user_id", authData.user.id)
        .single()
        .then(({ data: profile }) => {
          if (!profile?.id) return;

          // Store channel in ref so cleanup can always access it
          channelRef.current = supabase
            .channel(`plan-limits-${profile.id}`)
            .on(
              "postgres_changes",
              {
                event:  "UPDATE",
                schema: "public",
                table:  "kost_profiles",
                filter: `id=eq.${profile.id}`,
              },
              () => {
                // DB row changed — re-fetch plan status immediately
                check();
              }
            )
            .subscribe();
        });
    });

    // Cleanup: remove channel on unmount
    return () => {
      if (channelRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [check]);

  return { ...status, refresh: check };
}
