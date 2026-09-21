"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const SCHEDULE_PATH = "/dashboard/appointments";

interface SidebarContextValue {
  collapsed: boolean; // the effective state to render
  toggleUserPreference: () => void; // called by the sidebar's own collapse button
  setTemporaryOverride: (value: boolean | null) => void; // null = no override, defer to preference
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [manual, setManual] = useState<boolean | null>(null);
  const [override, setOverride] = useState<boolean | null>(null);

  // Open by default everywhere except the schedule page. A manual toggle
  // only sticks for the current page, so each page starts from its default.
  useEffect(() => {
    setManual(null);
  }, [pathname]);

  const isSchedule = pathname === SCHEDULE_PATH;
  const base = manual !== null ? manual : isSchedule;

  function toggleUserPreference() {
    setManual(!base);
  }

  const collapsed = override !== null ? override : base;

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
