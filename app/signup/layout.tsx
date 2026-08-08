// Firebase Admin SDK cold starts (creating the Auth user + clinic + staff
// doc) can take longer than Vercel's default serverless function timeout,
// especially on a cold function. Raising it here avoids the request being
// killed mid-flight, which otherwise reads on the client as the button
// getting stuck forever rather than showing an error.
export const maxDuration = 60;

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
