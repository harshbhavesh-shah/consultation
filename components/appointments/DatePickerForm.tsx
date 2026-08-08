"use client";

export default function DatePickerForm({ date }: { date: string }) {
  return (
    <form action="/dashboard/appointments" method="GET">
      <input
        type="date"
        name="date"
        defaultValue={date}
        onChange={(e) => e.currentTarget.form?.submit()}
        className="rounded-md border border-beige-300 bg-surface px-3 py-2 text-sm text-brown-900 outline-none focus:border-gold-500"
      />
    </form>
  );
}
