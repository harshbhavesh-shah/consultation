"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import DoodlePattern from "@/components/DoodlePattern";

// There's no separate lead-capture backend — this hands off straight into
// the app's real self-serve signup flow (app/signup), carrying the clinic
// name and email along so they don't have to be typed twice.
export default function AccessForm() {
  const router = useRouter();
  const [clinicName, setClinicName] = useState("");
  const [email, setEmail] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (clinicName.trim()) params.set("clinicName", clinicName.trim());
    if (email.trim()) params.set("email", email.trim());
    const query = params.toString();
    router.push(query ? `/signup?${query}` : "/signup");
  }

  return (
    <section id="access" className="relative flex items-center justify-center overflow-hidden px-6 py-24 md:px-10">
      <div className="pointer-events-none absolute -left-32 -top-28 h-[500px] w-[500px] rounded-full bg-gold-100 opacity-90 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full bg-orange-100 opacity-80 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-[420px] w-[420px] rounded-full bg-amber-100 opacity-70 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-[460px] w-[460px] rounded-full bg-beige-200 opacity-90 blur-3xl" />
      <DoodlePattern id="access-doodles" opacity={0.5} />

      <div className="relative z-[2] w-full max-w-[480px] rounded-2xl border border-beige-300 bg-surface p-8 shadow-card sm:p-10">
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-4xl font-normal text-brown-900">Bring your clinic on.</h2>
          <p className="text-base leading-relaxed text-brown-600">Tell us about your clinic and we will get in touch.</p>
        </div>
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="access-clinic" className="text-sm font-medium text-brown-900">
              Clinic name
            </label>
            <input
              id="access-clinic"
              type="text"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              className="h-[50px] w-full rounded-[10px] border border-beige-300 bg-canvas px-3.5 text-[15px] text-brown-900 outline-none transition-colors focus:border-gold-500 focus:bg-surface focus:ring-1 focus:ring-gold-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="access-email" className="text-sm font-medium text-brown-900">
              Your email
            </label>
            <input
              id="access-email"
              type="email"
              placeholder="name@clinic.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-[50px] w-full rounded-[10px] border border-beige-300 bg-canvas px-3.5 text-[15px] text-brown-900 outline-none transition-colors focus:border-gold-500 focus:bg-surface focus:ring-1 focus:ring-gold-500"
            />
          </div>
          <button
            type="submit"
            className="mt-1 h-[52px] rounded-[10px] bg-gold-500 text-base font-semibold text-white transition-colors hover:bg-gold-600"
          >
            Request early access
          </button>
        </form>
      </div>
    </section>
  );
}
