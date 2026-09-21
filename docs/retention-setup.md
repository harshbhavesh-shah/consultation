# Patient retention: no-shows and follow-ups

## What it does

- **No-show detection.** Every run, any still-"Booked" appointment from a
  *past date* becomes **No-show** — the next-morning rule, so a patient
  waiting in the queue is never flagged. An appointment with a payment or a
  diagnosis recorded is left alone (someone forgot to press "Mark as done").
  Staff can also flag a no-show by hand from the appointment panel, and undo
  a wrong flag with "They did attend".
- **Automatic follow-ups** (Retention → No-shows). Each follow-up sends a
  WhatsApp template a set number of hours after the appointment's scheduled
  time, once per appointment: ask why they missed (a link to a short survey),
  an offer, a reschedule nudge, or custom text. Turning one on only affects
  appointments scheduled *after* that moment — never a backlog.
- **Follow-up reminders** (Retention → Follow-ups). Patients with a follow-up
  due today/tomorrow, with "Send reminder now" and "Dismiss". They also get
  the automatic day-before and on-the-day reminder.
- Messages only go out between **9 am and 8 pm** clinic time; anything due
  outside that waits for the first poll inside it.

## Required setup

### 1. Run the migration
```bash
npx prisma migrate deploy
```

### 2. Poll the cron URL every 15 minutes
Follow-ups are timed in hours, and Vercel's free plan only runs a cron once a
day, so use a free external scheduler such as [cron-job.org](https://cron-job.org):

1. Create a job: URL `https://<your app>/api/cron/send-scheduled-messages`,
   schedule **every 15 minutes**.
2. Under advanced settings add a header
   `Authorization: Bearer <your CRON_SECRET>` (the same value as the
   `CRON_SECRET` env var in Vercel).
3. Save. A healthy response looks like
   `{"clinics":1,"noShowsDetected":0,"reminders":0,"feedback":0,"noShowFollowUps":0}`,
   or `{"…","messages":"skipped — outside the 9am-8pm send window"}` at night.

`vercel.json` keeps a once-a-day run (10:00 IST) as a safety net. Every job is
idempotent, so extra runs never double-send.

### 3. Set the environment variables
- `CRON_SECRET` — already used by the cron route.
- `NEXT_PUBLIC_SITE_URL` — your public URL; the survey link sent to patients
  is built from it.
- `CLINIC_TIME_ZONE` — optional, defaults to `Asia/Kolkata`.

### 4. WhatsApp templates
A follow-up sends one of your **no-show follow-up** templates (Communication →
Templates), which take two variables: the patient's name, then the survey
link / offer text / blank depending on the follow-up's kind. Meta must
approve the wording first.

## Behaviour change from before

The old system sent one fixed no-show message the day after, using the
newest no-show template. That is replaced: **nothing is sent until you add a
follow-up** on the Retention page.

## Notes
- The scheduler counts hours from the *scheduled slot time*, in the clinic's
  timezone (one timezone for the whole deployment for now).
- Survey answers (including free-text comments) are patient data: they belong
  to the appointment and are deleted with it, including on patient erasure.
