import type { Appointment } from "@/types";

/** Waiting patients (still "Booked"), earliest slot first. The dashboard's
 * "Next in line" card and the call-in action both use this so the button
 * and the server always agree on who is next. */
export function waitingInOrder(appointments: Appointment[]): Appointment[] {
  return appointments
    .filter((a) => a.status === "Booked")
    .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
}

export function getNextInLine(appointments: Appointment[]): Appointment | null {
  return waitingInOrder(appointments)[0] ?? null;
}
