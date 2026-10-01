import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";
import { safeRedirect } from "@/lib/auth/constants";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { next, error } = await searchParams;
  const nextPath = typeof next === "string" ? safeRedirect(next) : undefined;
  return (
    <AuthCard
      title="Create account"
      subtitle="Get started in seconds."
      next={nextPath}
      error={typeof error === "string" ? error : undefined}
      footer={{ text: "Already have an account?", href: "/login", label: "Sign in" }}
    >
      <SignupForm next={nextPath} />
    </AuthCard>
  );
}
