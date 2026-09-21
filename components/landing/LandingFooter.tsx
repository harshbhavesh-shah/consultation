import Link from "next/link";
import LogoMark from "@/components/LogoMark";

export default function LandingFooter() {
  return (
    <footer className="flex flex-col gap-10 bg-brown-900 px-6 py-14 md:flex-row md:items-end md:justify-between md:px-10 lg:px-[120px]">
      <div className="flex flex-col gap-3">
        <span className="inline-flex items-center gap-3">
          <LogoMark size={40} />
          <span className="font-display text-2xl text-white">Loupe</span>
        </span>
        <span className="text-sm text-beige-300">A Radiance product</span>
      </div>
      <div className="flex flex-col items-start gap-3.5 md:items-end">
        <div className="flex flex-wrap gap-7">
          <Link href="/login" className="text-sm text-beige-200 hover:text-white">
            Sign in
          </Link>
          <span className="text-sm text-beige-300/70">Contact</span>
          <Link href="/privacy-policy" className="text-sm text-beige-200 hover:text-white">
            Privacy
          </Link>
          <span className="text-sm text-beige-300/70">Terms</span>
        </div>
        <span className="text-xs text-beige-300">© 2026 Radiance</span>
      </div>
    </footer>
  );
}
