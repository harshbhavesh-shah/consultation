"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Users,
  BarChart3,
  Clock,
  Settings,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import { useSidebarCollapse } from "@/components/SidebarContext";
import type { Session, UserRole } from "@/types";

const NAV_ITEMS: {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles?: UserRole[]; // omit = visible to everyone
}[] = [
  { label: "Today", href: "/dashboard", icon: LayoutDashboard },
  { label: "Appointments", href: "/dashboard/appointments", icon: Calendar },
  { label: "Patients", href: "/dashboard/patients", icon: Users },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3, roles: ["doctor"] },
  { label: "Attendance", href: "/dashboard/attendance", icon: Clock },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

function Mark({ size = 32 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="flex flex-shrink-0 items-center justify-center rounded-full bg-gold-100 font-display text-gold-600"
    >
      <span style={{ fontSize: size * 0.5 }}>A</span>
    </div>
  );
}

export default function Sidebar({ clinicName, session }: { clinicName: string; session: Session }) {
  const pathname = usePathname();
  const { collapsed, toggleUserPreference } = useSidebarCollapse();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function NavLinks({ showLabels }: { showLabels: boolean }) {
    const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(session.role));
    return (
      <nav className="flex-1 space-y-0.5 px-3">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              // Every nav item is always on screen in the sidebar, so
              // Next.js's default link prefetching would otherwise
              // server-render (and re-run every data fetch for) every page
              // in the app on every render of the sidebar itself — for
              // Patients that meant reading the whole patients collection
              // in the background just from sitting on any other page.
              prefetch={false}
              title={showLabels ? undefined : item.label}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                showLabels ? "" : "justify-center"
              } ${
                isActive
                  ? "bg-brown-700/60 text-white"
                  : "text-beige-200 hover:bg-brown-700/60 hover:text-white"
              }`}
            >
              <Icon size={18} className="flex-shrink-0" />
              {showLabels && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-beige-300 bg-surface px-4 py-3 md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-1.5 text-brown-700 hover:bg-beige-200"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <Mark size={28} />
          <span className="font-display text-lg font-medium text-brown-900">{clinicName}</span>
        </div>
        <div className="w-[34px]" />
      </div>

      {/* Mobile drawer + backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-brown-900/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-72 flex-col bg-brown-900 text-beige-200 shadow-2xl">
            <div className="flex items-center justify-between px-6 pt-6 pb-6">
              <div className="flex items-center gap-3">
                <Mark size={36} />
                <div>
                  <div className="font-display text-xl font-medium text-white">{clinicName}</div>
                  <div className="mt-2 h-[2px] w-8 bg-gold-500" />
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1 text-beige-200 hover:text-white"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>
            <NavLinks showLabels={true} />
            <div className="border-t border-brown-700/60 px-6 py-4">
              <div className="truncate text-sm text-beige-200">{session.email}</div>
              <div className="mb-3 text-xs uppercase tracking-wide text-brown-400">{session.role}</div>
              <LogoutButton />
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className="hidden h-full flex-shrink-0 flex-col overflow-y-auto bg-brown-900 text-beige-200 md:flex"
        style={{ width: collapsed ? 64 : 240, transition: "width 300ms ease-in-out" }}
      >
        <div className={`flex items-center pt-7 pb-6 ${collapsed ? "justify-center px-2" : "gap-3 px-6"}`}>
          {collapsed ? (
            <Mark size={32} />
          ) : (
            <>
              <Mark size={40} />
              <div>
                <div className="font-display text-xl font-medium text-white">{clinicName}</div>
                <div className="mt-2 h-[2px] w-8 bg-gold-500" />
              </div>
            </>
          )}
        </div>

        <NavLinks showLabels={!collapsed} />

        <div className="px-3 pb-2">
          <button
            onClick={toggleUserPreference}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-brown-400 transition-colors hover:bg-brown-700/60 hover:text-white ${
              collapsed ? "justify-center" : ""
            }`}
          >
            {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>

        <div className={`border-t border-brown-700/60 py-4 ${collapsed ? "px-2" : "px-6"}`}>
          {!collapsed && (
            <>
              <div className="truncate text-sm text-beige-200">{session.email}</div>
              <div className="mb-3 text-xs uppercase tracking-wide text-brown-400">{session.role}</div>
            </>
          )}
          <div className={collapsed ? "flex justify-center" : ""}>
            <LogoutButton />
          </div>
        </div>
      </aside>
    </>
  );
}
