import type { AppointmentStatus } from "@/types";

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
