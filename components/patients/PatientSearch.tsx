"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { searchPatientsAction } from "@/app/dashboard/patients/actions";
import type { Patient } from "@/types";

export default function PatientSearch({ initialPatients }: { initialPatients: Patient[] }) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Patient[]>(initialPatients);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    const handle = setTimeout(async () => {
      const found = await searchPatientsAction(term);
      if (id === requestId.current) setResults(found);
    }, 300);
    return () => clearTimeout(handle);
  }, [term]);

  return (
    <div>
      <div className="flex items-center gap-2 rounded-md border border-beige-300 bg-surface px-3 py-2.5 shadow-soft">
        <Search size={16} className="text-brown-400" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search by name, phone, or patient ID…"
          className="w-full bg-transparent text-sm text-brown-900 outline-none placeholder:text-brown-400"
        />
      </div>

      {results.length === 0 ? (
        <div className="mt-6 rounded-xl bg-surface p-6 text-center text-sm text-brown-400 shadow-soft ring-1 ring-beige-300">
          {term ? "No patients match your search." : "No patients yet."}
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl bg-surface shadow-soft ring-1 ring-beige-300">
          {results.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/patients/${p.id}`}
              className="flex items-center justify-between border-b border-beige-300 px-4 py-3 text-sm last:border-0 hover:bg-canvas"
            >
              <div>
                <div className="font-medium text-brown-900">{p.name}</div>
                <div className="text-xs text-brown-400">{p.phone}</div>
              </div>
              <span className="text-xs text-brown-400">{p.patient_id}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
