import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  // Re-checking here is cheap (deduped per request) and keeps the page safe
  // even if it's ever moved out of the protected layout.
  const user = await requireUser();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hi, {user.name || user.email}</h1>
        <p className="text-sm text-zinc-500">You&apos;re signed in. Build your app from here.</p>
      </div>
      <pre className="overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs dark:border-zinc-800 dark:bg-zinc-900">
        {JSON.stringify(user, null, 2)}
      </pre>
    </div>
  );
}
