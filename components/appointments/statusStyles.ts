import { minutesPastSlot } from "@/lib/slots";
import type { Appointment, AppointmentStatus } from "@/types";

export const STATUS_STYLES: Record<AppointmentStatus, { bg: string; text: string; dot: string }> = {
  Booked: { bg: "bg-gold-100", text: "text-gold-600", dot: "bg-gold-500" },
  Visited: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-600" },
  Cancelled: { bg: "bg-beige-300", text: "text-brown-500", dot: "bg-brown-400" },
};

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  Booked: "Booked",
  Visited: "Visited",
  Cancelled: "Cancelled",
};

// A Booked appointment reads as "Waiting" once its slot time has passed,
// same heuristic used across the dashboard and appointments list (there's
// no real arrival timestamp to key off, just the booked slot itself).
export function statusLabel(appointment: Appointment, dateStr: string): string {
  if (appointment.status === "Booked") {
    const late = minutesPastSlot(appointment.appointment_time, dateStr);
    return late > 0 ? `Waiting ${late} min` : "Booked";
  }
  const labels: Record<AppointmentStatus, string> = { Booked: "Booked", Visited: "Seen", Cancelled: "Cancelled" };
  return labels[appointment.status];
}
