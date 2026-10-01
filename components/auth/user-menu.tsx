import { logout } from "@/app/actions/auth";
import type { User } from "@/lib/auth/types";

export function UserMenu({ user }: { user: User }) {
  const label = user.name || user.email;
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold uppercase dark:bg-zinc-800">
        {label.slice(0, 1)}
      </span>
      <span className="hidden text-sm sm:inline">{label}</span>
      <form action={logout}>
        <button
          type="submit"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
