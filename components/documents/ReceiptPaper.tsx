import { Letterhead, Paper, PatientStrip, formatDocDate } from "./Paper";
import type { Appointment, Clinic } from "@/types";

function formatRupees(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default function ReceiptPaper({
  clinic,
  appointment,
  patientCode,
  number,
  issuedAt,
}: {
  clinic: Clinic;
  appointment: Appointment;
  patientCode?: string;
  number: number;
  issuedAt: number;
}) {
  const amount = typeof appointment.payment === "number" ? appointment.payment : 0;
  const issued = new Date(issuedAt).toISOString().slice(0, 10);
  return (
    <Paper>
      <Letterhead clinic={clinic} />
      <p className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-brown-400">Payment receipt</p>
      <PatientStrip
        appointment={appointment}
        patientCode={patientCode}
        right={[
          { label: "Receipt no.", value: String(number).padStart(5, "0") },
          { label: "Date", value: formatDocDate(issued) },
        ]}
      />

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-beige-300 text-left text-xs uppercase tracking-wide text-brown-400">
            <th className="py-2 font-medium">Description</th>
            <th className="py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-beige-200">
            <td className="py-3">
              Consultation
              <span className="block text-xs text-brown-400">Visit on {formatDocDate(appointment.appointment_date)}</span>
            </td>
            <td className="py-3 text-right tabular-nums">{formatRupees(amount)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td className="pt-3 font-semibold">Total paid</td>
            <td className="pt-3 text-right text-lg font-semibold tabular-nums">{formatRupees(amount)}</td>
          </tr>
        </tfoot>
      </table>

      <dl className="mt-5 space-y-1 text-sm">
        <div className="flex gap-2">
          <dt className="w-28 flex-none text-brown-400">Paid by</dt>
          <dd className="font-medium">{appointment.payment_type || "Not recorded"}</dd>
        </div>
        {appointment.reference && (
          <div className="flex gap-2">
            <dt className="w-28 flex-none text-brown-400">Reference</dt>
            <dd className="font-medium">{appointment.reference}</dd>
          </div>
        )}
      </dl>

      <p className="mt-12 text-center text-xs text-brown-400">
        Computer-generated receipt. Thank you for visiting {clinic.name}.
      </p>
    </Paper>
  );
}
