import Link from "next/link";
import { UserMenu } from "@/components/auth/user-menu";
import { requireUser } from "@/lib/auth/session";

/** Everything under app/(protected) requires a signed-in user. */
export default async function ProtectedLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
            Base App
          </Link>
          <UserMenu user={user} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">{children}</main>
    </div>
  );
}
