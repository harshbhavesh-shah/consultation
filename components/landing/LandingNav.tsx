import Link from "next/link";
import LogoMark from "@/components/LogoMark";

export default function LandingNav() {
  return (
    <nav
      aria-label="Main"
      className="relative z-[3] flex h-[88px] items-center justify-between px-6 md:px-10 lg:px-[120px]"
    >
      <span className="inline-flex items-center gap-3">
        <LogoMark size={40} />
        <span className="font-display text-2xl text-brown-900">Loupe</span>
      </span>
      <div className="hidden items-center gap-9 lg:flex">
        <a href="#day" className="text-[15px] font-medium text-brown-600 hover:text-brown-900">
          A day at the clinic
        </a>
        <a href="#roles" className="text-[15px] font-medium text-brown-600 hover:text-brown-900">
          Roles
        </a>
        <a href="#whatsapp" className="text-[15px] font-medium text-brown-600 hover:text-brown-900">
          WhatsApp
        </a>
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
      <div className="flex items-center gap-4 lg:hidden">
        <Link href="/login" className="text-sm font-medium text-brown-900 hover:underline">
          Sign in
        </Link>
        <Link
          href="/signup"
          className="inline-flex h-10 items-center rounded-lg bg-gold-500 px-4 text-sm font-semibold text-white"
        >
          Get access
        </Link>
      </div>
    </nav>
  );
}
