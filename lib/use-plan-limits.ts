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
 * - Subscribe Supabase Realtime pada kost_profiles untuk user ini
 *   → ketika superadmin mengubah paket/max_kamar/is_suspended di DB,
 *     hook langsung re-fetch tanpa perlu refresh halaman (realtime)
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
        setStatus((prev) => ({ ...prev, loading: false, error: data.error }));
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

  // ── Realtime subscription ──────────────────────────────────────────────────
  // Listen for ANY UPDATE on kost_profiles for this user's row.
  // When superadmin changes paket, max_kamar, is_suspended, expires_at → re-fetch.
  useEffect(() => {
    // Initial fetch
    check();

    // Set up realtime subscription
    const supabase = createClient();
    let kostProfileId: string | null = null;

    // Get the kost_profile id for the current user to filter the subscription
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;

      supabase
        .from("kost_profiles")
        .select("id")
        .eq("user_id", data.user.id)
        .single()
        .then(({ data: profile }) => {
          if (!profile) return;
          kostProfileId = profile.id;
        });
    });

    // Subscribe to ALL updates on kost_profiles table (filtered by user_id on server via RLS)
    const channel = supabase
      .channel("plan-limits-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "kost_profiles",
        },
        (payload) => {
          // Re-fetch whenever any field on this user's kost_profile changes
          // (paket, max_kamar, is_suspended, expires_at, etc.)
          check();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [check]);

  return { ...status, refresh: check };
}
