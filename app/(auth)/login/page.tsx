import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { safeRedirect } from "@/lib/auth/constants";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  const nextPath = typeof next === "string" ? safeRedirect(next) : undefined;
  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back."
      next={nextPath}
      error={typeof error === "string" ? error : undefined}
      footer={{ text: "No account?", href: "/signup", label: "Create one" }}
    >
      <LoginForm next={nextPath} />
    </AuthCard>
  );
}
