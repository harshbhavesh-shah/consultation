"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import LogoMark from "@/components/LogoMark";

const LINKS = [
  { href: "#day", label: "A day at the clinic" },
  { href: "#roles", label: "Roles" },
  { href: "#whatsapp", label: "WhatsApp" },
];

export default function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav aria-label="Main" className="relative z-20">
      <div className="flex h-[72px] items-center justify-between px-6 md:h-[88px] md:px-10 lg:px-[120px]">
        <span className="inline-flex items-center gap-2.5 md:gap-3">
          <LogoMark size={36} />
          <span className="font-display text-xl text-brown-900 md:text-2xl">Loupe</span>
        </span>

        <div className="hidden items-center gap-9 lg:flex">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-[15px] font-medium text-brown-600 hover:text-brown-900">
              {link.label}
            </a>
          ))}
          <Link href="/login" className="text-[15px] font-medium text-brown-900 hover:underline">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-11 items-center rounded-[10px] bg-gold-500 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-gold-600"
          >
            Request early access
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-beige-300 bg-surface text-brown-900 lg:hidden"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="absolute inset-x-0 top-full z-40 flex flex-col gap-1 border-t border-beige-300 bg-surface px-6 py-4 shadow-card lg:hidden">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-3 text-base font-medium text-brown-700 hover:bg-canvas"
            >
              {link.label}
            </a>
          ))}
          <Link href="/login" onClick={() => setOpen(false)} className="rounded-lg px-2 py-3 text-base font-medium text-brown-900 hover:bg-canvas">
            Sign in
          </Link>
          <Link
            href="/signup"
            onClick={() => setOpen(false)}
            className="mt-2 flex h-12 items-center justify-center rounded-[10px] bg-gold-500 text-base font-semibold text-white"
          >
            Request early access
          </Link>
        </div>
      )}
    </nav>
  );
}
