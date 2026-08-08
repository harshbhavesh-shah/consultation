"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "sidebar-collapsed";
const SESSION_AUTO_COLLAPSE_KEY = "sidebar-auto-collapsed";

interface SidebarContextValue {
  collapsed: boolean; // the effective state to render
  toggleUserPreference: () => void; // called by the sidebar's own collapse button
  setTemporaryOverride: (value: boolean | null) => void; // null = no override, defer to preference
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [userPreferred, setUserPreferred] = useState(false);
  const [override, setOverride] = useState<boolean | null>(null);

  useEffect(() => {
    // Collapse automatically the first time the dashboard is entered each
    // browser session, freeing up table width right away — the manual
    // toggle below still works normally afterward, this only nudges the
    // starting state once per session rather than locking it collapsed.
    if (sessionStorage.getItem(SESSION_AUTO_COLLAPSE_KEY)) {
      if (localStorage.getItem(STORAGE_KEY) === "true") setUserPreferred(true);
      return;
    }
    sessionStorage.setItem(SESSION_AUTO_COLLAPSE_KEY, "true");
    setUserPreferred(true);
    localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  function toggleUserPreference() {
    setUserPreferred((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  const collapsed = override !== null ? override : userPreferred;

  return (
    <SidebarContext.Provider
      value={{ collapsed, toggleUserPreference, setTemporaryOverride: setOverride }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarCollapse(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebarCollapse must be used within a SidebarProvider");
  return ctx;
}
