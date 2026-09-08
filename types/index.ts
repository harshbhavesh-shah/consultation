export type UserRole = "reception" | "doctor";

export interface Session {
  uid: string;
  email: string | null;
  clinicId: string;
  role: UserRole;
}

export interface Clinic {
  id: string;
  name: string;
  createdAt: number;
}

export interface Staff {
  uid: string;
  clinicId: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: number;
}

export type AppointmentStatus = "Booked" | "Visited" | "Cancelled";
export type EntrySource = "online" | "walkin";
export type PaymentType = "Cash" | "Online" | "";
export type AgeUnit = "years" | "months";
export type Gender = "Male" | "Female" | "Other" | "";
export type Shift = "morning" | "afternoon";

export interface Appointment {
  id: string;
  clinicId: string;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:MM 24h
  status: AppointmentStatus;
  entry_source: EntrySource;
  token_number: number;
  shift: Shift;

  patientId: string | null;
  patient_name: string;
  patient_phone: string;
  patient_address: string;
  age: number | "";
  age_unit: AgeUnit;
  gender: Gender;

  payment: number | "";
  payment_type: PaymentType;
  reference: string;

  diagnosis: string;
  follow_up: number | "";
  follow_up_sent: boolean;
  follow_up_day_before_sent: boolean;

  call_back: number | "";
  call_back_due_date: string | null;
  call_back_completed_at: string | null;

  // Guards for the automated WhatsApp sends in
  // app/api/cron/send-scheduled-messages — each fires at most once per
  // appointment. See lib/whatsapp/automatedSends.ts for what triggers them.
  receipt_sent: boolean;
  no_show_sent: boolean;
  feedback_sent: boolean;

  createdAt: number;
  createdBy: string;
}

export interface Patient {
  id: string;
  clinicId: string;
  patient_id: string; // PT-XXXXXX
  name: string;
  phone: string;
  address: string;
  age: number | "";
  age_unit: AgeUnit;
  gender: Gender;
  createdAt: number;
}

// Clock-in only — no clock-out. One entry per staff member per day.
export interface AttendanceEntry {
  id: string;
  clinicId: string;
  staffUid: string;
  staffName: string;
  date: string; // YYYY-MM-DD
  clockIn: number;
}

// One per clinic per month — how much of that month's cash revenue has
// been deposited to the bank so far. "Cash on hand" is derived
// (monthly cashRevenue - amount), not stored, so it always stays correct
// if the month's revenue changes later.
export interface CashDeposit {
  clinicId: string;
  period: string; // YYYY-MM
  amount: number;
  updatedAt: number;
  updatedBy: string;
}

// --- WhatsApp (Meta Cloud API) ---
// See lib/whatsapp/ for the provider abstraction and lib/firestore/whatsapp*
// for the Firestore-backed data layer.

export type WhatsAppConnectionStatus = "connected" | "error";

// One per clinic (doc id == clinicId). accessToken/appSecret are Meta
// credentials — never sent to a client component, only used server-side.
export interface WhatsAppConnection {
  clinicId: string;
  status: WhatsAppConnectionStatus;
  phoneNumberId: string;
  accessToken: string;
  appSecret: string;
  wabaId: string;
  phoneNumber: string;
  connectedAt: number;
  updatedAt: number;
  lastError: string | null;
}

// Fixed categories matching what's registered in Meta's Template Library —
// this app never controls the approved wording, only name + language +
// ordered {{n}} parameters. "custom" lets staff define their own label set.
export type MessageTemplateCategory =
  | "appointment_confirmation"
  | "appointment_reminder"
  | "receipt_sent"
  | "no_show_followup"
  | "visit_feedback"
  | "custom";

export const TEMPLATE_VARIABLE_LABELS: Record<MessageTemplateCategory, string[]> = {
  appointment_confirmation: ["Patient name", "Date", "Time"],
  appointment_reminder: ["Patient name", "Clinic name", "Date", "Time"],
  receipt_sent: ["Patient name", "Amount", "Reference"],
  no_show_followup: ["Patient name", "Offer, link, or blank"],
  visit_feedback: ["Patient name", "Feedback link"],
  custom: [],
};

export interface MessageTemplate {
  id: string;
  clinicId: string;
  name: string; // must exactly match the template name approved in Meta
  category: MessageTemplateCategory;
  language: string; // Meta language code, e.g. "en", "en_US"
  variableLabels: string[]; // for "custom"; fixed categories use TEMPLATE_VARIABLE_LABELS
  bodyPreview: string;
  createdAt: number;
  updatedAt: number;
}

export type MessageDirection = "inbound" | "outbound";
export type MessageDeliveryStatus = "queued" | "sent" | "delivered" | "read" | "failed";

// One per (clinicId, phone number) — doc id is a deterministic
// `${clinicId}_${normalizedPhone}` so recordInboundMessage can upsert
// without a transaction or a uniqueness query.
export interface WhatsAppConversation {
  id: string;
  clinicId: string;
  patientId: string | null; // best-effort link by phone, not required
  patientName: string | null; // denormalized snapshot for display
  phoneNumber: string;
  lastMessagePreview: string;
  lastMessageAt: number;
  unreadCount: number;
  updatedAt: number;
}

// Stored in the `messages` subcollection of its conversation doc.
export interface WhatsAppMessage {
  id: string;
  clinicId: string;
  conversationId: string;
  direction: MessageDirection;
  body: string;
  status: MessageDeliveryStatus;
  templateId: string | null;
  providerMessageId: string | null;
  createdAt: number;
}
