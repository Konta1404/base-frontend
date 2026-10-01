import Link from "next/link";
import { env } from "@/lib/env";
import { GoogleButton } from "./google-button";

const ERRORS: Record<string, string> = {
  google_not_configured: "Google sign-in isn't configured on this server.",
  google_denied: "Google sign-in was cancelled.",
  google_failed: "Google sign-in failed. Please try again.",
  invalid_state: "Your sign-in session expired. Please try again.",
};

export function AuthCard({
  title,
  subtitle,
  next,
  error,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  next?: string;
  error?: string;
  footer: { text: string; href: string; label: string };
  children: React.ReactNode;
}) {
  const footerHref = next ? `${footer.href}?next=${encodeURIComponent(next)}` : footer.href;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-zinc-500">{subtitle}</p>
      </div>
      {error && ERRORS[error] ? (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {ERRORS[error]}
        </p>
      ) : null}
      {env.googleEnabled ? (
        <>
          <GoogleButton next={next} />
          <div className="flex items-center gap-3 text-xs text-zinc-400 uppercase">
            <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            or
            <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </>
      ) : null}
      {children}
      <p className="text-center text-sm text-zinc-500">
        {footer.text}{" "}
        <Link
          href={footerHref}
          className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
        >
          {footer.label}
        </Link>
      </p>
    </div>
  );
}
