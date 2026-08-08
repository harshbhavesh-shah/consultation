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
