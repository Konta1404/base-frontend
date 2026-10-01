import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";

export default async function Home() {
  const user = await getCurrentUser().catch(() => null);
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Base App</h1>
      <p className="max-w-md text-zinc-500">
        Next.js starter with authentication against your backend API, ready to run in Docker.
      </p>
      <div className="flex gap-3">
        {user ? (
          <Link href="/dashboard" className={buttonClass()}>
            Go to dashboard
          </Link>
        ) : (
          <>
            <Link href="/login" className={buttonClass()}>
              Sign in
            </Link>
            <Link href="/signup" className={buttonClass("secondary")}>
              Create account
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
