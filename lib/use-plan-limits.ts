"use client";

import { useState, useEffect, useCallback } from "react";
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
 * Hook untuk cek limit paket admin yang sedang login.
 *
 * - Fetch pertama saat mount via /api/plan/check
 * - Subscribe Supabase Realtime pada baris kost_profiles milik user ini
 *   → ketika superadmin mengubah paket/max_kamar/is_suspended/expires_at,
 *     hook langsung re-fetch tanpa perlu refresh halaman
 *
 * Prasyarat DB (sudah dijalankan):
 *   ALTER TABLE kost_profiles REPLICA IDENTITY FULL;
 *   ALTER PUBLICATION supabase_realtime ADD TABLE kost_profiles;
 */
export function usePlanLimits() {
  const [status, setStatus] = useState<PlanStatus>(defaultStatus);

  const check = useCallback(async () => {
    setStatus((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch("/api/plan/check", { cache: "no-store" });
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
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // 1. Get this user's kost_profile ID, then subscribe filtered to that row only
    supabase.auth.getUser().then(({ data: authData }) => {
      if (!authData.user) return;

      supabase
        .from("kost_profiles")
        .select("id")
        .eq("user_id", authData.user.id)
        .single()
        .then(({ data: profile }) => {
          if (!profile?.id) return;

          // 2. Subscribe only to UPDATE on this specific profile row
          //    filter: id=eq.<profile_id>  — only fires for this user's row
          channel = supabase
            .channel(`plan-limits-${profile.id}`)
            .on(
              "postgres_changes",
              {
                event:  "UPDATE",
                schema: "public",
                table:  "kost_profiles",
                filter: `id=eq.${profile.id}`,
              },
              (_payload) => {
                // Superadmin changed paket, max_kamar, is_suspended, or expires_at
                // Re-fetch immediately so UI updates without page refresh
                check();
              }
            )
            .subscribe();
        });
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [check]);

  return { ...status, refresh: check };
}
