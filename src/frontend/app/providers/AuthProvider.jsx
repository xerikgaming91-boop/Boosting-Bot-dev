// src/frontend/app/providers/AuthProvider.jsx
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null); // { discordId, username, displayName, avatarUrl, isOwner, isAdmin, isRaidlead, highestRole, roleLevel }

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/session", {
        credentials: "include",
        headers: { "Accept": "application/json" },
      });
      const json = await res.json().catch(() => ({}));
      if (json?.ok) setUser(json.user || null);
      else setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(() => {
    // Volle Seite weiterleiten, damit OAuth sauber läuft
    window.location.href = "/api/auth/discord/login";
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: { "Accept": "application/json" },
      });
    } catch {}
    setUser(null);
  }, []);

  // Role-Helpers
  const roleLevel = user?.roleLevel ?? 0;
  const isOwner = !!user?.isOwner || roleLevel >= 3;
  const isAdmin = !!user?.isAdmin || roleLevel >= 2;
  const isRaidlead = !!user?.isRaidlead || roleLevel >= 1;

  const value = useMemo(
    () => ({
      loading,
      user,
      roleLevel,
      isOwner,
      isAdmin,
      isRaidlead,
      login,
      logout,
      refresh,
      // Guard-Helfer
      hasAnyRole: (minLevel = 1) => roleLevel >= minLevel,
    }),
    [loading, user, roleLevel, isOwner, isAdmin, isRaidlead, login, logout, refresh]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

// Optionaler Route-Guard (Wrapper-Komponente)
export function RequireAuth({ roles, children, fallback = null }) {
  const { loading, user, roleLevel } = useAuth();

  if (loading) return null; // oder ein Skeleton/Spinner
  if (!user) return fallback ?? null;

  if (Array.isArray(roles) && roles.length) {
    // Mapping: 'raidlead' -> 1, 'admin' -> 2, 'owner' -> 3
    const map = { raidlead: 1, admin: 2, owner: 3 };
    const needed = Math.max(...roles.map(r => map[String(r).toLowerCase()] || 0));
    if (roleLevel < needed) return fallback ?? null;
  }

  return children;
}
