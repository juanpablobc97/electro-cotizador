"use client";

import { useEffect, useState } from "react";
import type { AppPermissions } from "@/lib/auth/permissions";
import type { User, UserRole } from "@/lib/types";

type SessionState = {
  user: User | null;
  role: UserRole | null;
  permissions: AppPermissions | null;
  loading: boolean;
};

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    user: null,
    role: null,
    permissions: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const user = (data?.user as User | undefined) ?? null;
        const role = user?.role ?? null;
        setState({
          user,
          role,
          permissions: (data?.permissions as AppPermissions | undefined) ?? null,
          loading: false,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setState({ user: null, role: null, permissions: null, loading: false });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
