"use client";

import { useState, useEffect, useCallback } from "react";
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
 * Hook untuk cek limit paket admin yang sedang login
 * Dipanggil dari komponen UI untuk show/hide fitur & disable tombol
 */
export function usePlanLimits() {
  const [status, setStatus] = useState<PlanStatus>(defaultStatus);

  const check = useCallback(async () => {
    setStatus((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch("/api/plan/check", { cache: "no-store" });
      const data = await res.json();

      if (res.status === 403) {
        setStatus((prev) => ({ ...prev, loading: false, suspended: true, error: data.error }));
        return;
      }
      if (res.status === 402) {
        setStatus((prev) => ({ ...prev, loading: false, expired: true, error: data.error }));
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

  useEffect(() => { check(); }, [check]);

  return { ...status, refresh: check };
}
