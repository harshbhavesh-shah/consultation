import Link from "next/link";
import { EyeOff, ShieldCheck } from "lucide-react";
import DoodlePattern from "@/components/DoodlePattern";
import LandingNav from "./LandingNav";
import ProgressStrip from "./ProgressStrip";
import NextInLineCard from "./NextInLineCard";

export default function Hero() {
  return (
    <header className="relative overflow-hidden">
      <div className="pointer-events-none absolute -left-32 -top-40 h-[500px] w-[500px] rounded-full bg-gold-100 opacity-90 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -top-36 h-[420px] w-[420px] rounded-full bg-[#D8D2F0] opacity-80 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-[420px] w-[420px] rounded-full bg-amber-100 opacity-70 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-[460px] w-[460px] rounded-full bg-beige-200 opacity-90 blur-3xl" />
      {/* Desktop (lg+): doodles are masked clear of the text column in the
          two-column layout, fading in from ~47% width and below the nav. */}
      <div
        className="pointer-events-none absolute inset-0 hidden lg:block"
        style={{
          WebkitMaskImage: "linear-gradient(to right, transparent 0, transparent 47%, #000 70%)",
          maskImage: "linear-gradient(to right, transparent 0, transparent 47%, #000 70%)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0, transparent 88px, #000 200px)",
            maskImage: "linear-gradient(to bottom, transparent 0, transparent 88px, #000 200px)",
          }}
        >
          <DoodlePattern id="hero-doodles" opacity={0.5} variant="violet" />
        </div>
      </div>
      {/* Below lg the hero stacks to one column, so instead of a horizontal
          split the doodles only fade in below the stacked text+card
          content, clearing it vertically instead. */}
      <div
        className="pointer-events-none absolute inset-0 lg:hidden"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0, transparent 900px, #000 1080px)",
          maskImage: "linear-gradient(to bottom, transparent 0, transparent 900px, #000 1080px)",
        }}
      >
        <DoodlePattern id="hero-doodles-mobile" opacity={0.5} variant="violet" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#F1F4EE]" />

      <LandingNav />

      <div className="relative z-[3] flex flex-col items-start gap-14 px-6 pb-20 pt-6 md:px-10 lg:flex-row lg:justify-between lg:px-[120px] lg:pt-8">
        <div className="flex max-w-xl flex-col gap-6 pt-6">
          <span className="text-xs font-medium uppercase tracking-wide text-brown-400">
            For skin, laser and aesthetics clinics
          </span>
          <h1 className="font-display text-6xl font-normal leading-[1] tracking-tight text-brown-900 sm:text-7xl lg:text-[84px]">
            The clinic day, in order.
          </h1>
          <p className="max-w-lg text-lg leading-relaxed text-brown-600 sm:text-xl">
            Appointments, consultations, follow-ups and the day&apos;s cash, in one calm workspace. Reception books
            the day. The doctor closes each record. Everyone works from the same queue.
          </p>
          <div className="flex flex-col gap-3.5 pt-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-7 sm:pt-1.5">
            <Link
              href="/signup"
              className="flex h-[52px] items-center justify-center gap-2 rounded-[10px] bg-gold-500 px-7 text-base font-semibold text-white transition-colors hover:bg-gold-600 sm:inline-flex"
            >
              Request early access
            </Link>
            <a
              href="#day"
              className="self-center text-base font-medium text-brown-900 underline underline-offset-4 sm:self-auto"
            >
              See a day at the clinic
            </a>
          </div>
          <span className="text-center text-sm text-brown-400 sm:text-left">
            Built alongside a working dermatology clinic.
          </span>
        </div>

        <div className="relative w-full max-w-[540px] pt-2 lg:mt-9">
          <div className="flex flex-col gap-4 rounded-xl border border-beige-300 bg-surface p-[26px] shadow-card">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-brown-400">
                Saturday 19 September
              </span>
              <span className="font-display text-3xl text-brown-900">Good morning, Dr. Shah</span>
            </div>
            <ProgressStrip />
            <span className="mt-1.5 text-xs font-medium uppercase tracking-wide text-brown-400">Next in line</span>
            <NextInLineCard />
          </div>

          <div className="absolute -bottom-7 left-1.5 flex items-center gap-3 rounded-[10px] border border-beige-300 bg-surface px-4 py-2.5 shadow-card lg:-left-1.5">
            <span className="text-[13px] text-brown-600">Day revenue</span>
            <span className="text-[15px] font-semibold tracking-[0.1em] text-brown-900">₹ •••••</span>
            <EyeOff size={18} className="text-brown-400" />
          </div>
          <div className="absolute right-1.5 top-[-22px] flex items-center gap-2 rounded-full bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-800 shadow-card lg:-right-7 lg:-top-6">
            <ShieldCheck size={16} /> Marked done and locked
          </div>
        </div>
      </div>
    </header>
  );
}
