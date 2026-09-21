"use client";

import { useRouter } from "next/navigation";
import { signOutAction } from "@/lib/auth/actions";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await signOutAction();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="text-xs font-medium text-brown-400 transition-colors hover:text-gold-500"
    >
      Log Out
    </button>
  );
}
