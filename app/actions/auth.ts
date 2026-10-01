"use server";

import { redirect } from "next/navigation";
import * as z from "zod";
import { authApi, BackendError } from "@/lib/auth/backend";
import { LOGIN_PATH, safeRedirect } from "@/lib/auth/constants";
import { LoginSchema, SignupSchema } from "@/lib/auth/definitions";
import { createSession, deleteSession, getTokens } from "@/lib/auth/session";
import type { FormState } from "@/lib/auth/types";

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof BackendError) {
    if (err.status === 401) return "Invalid email or password.";
    return err.message || fallback;
  }
  console.error(err);
  return fallback;
}

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const raw = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  const parsed = LoginSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values: { email: raw.email } };
  }

  try {
    const auth = await authApi.login(parsed.data.email, parsed.data.password);
    await createSession(auth);
  } catch (err) {
    return { message: errorMessage(err, "Could not sign in."), values: { email: raw.email } };
  }
  redirect(safeRedirect(formData.get("next") as string | null));
}

export async function signup(_: FormState, formData: FormData): Promise<FormState> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  const values = { name: raw.name, email: raw.email };
  const parsed = SignupSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values };
  }

  try {
    const auth = await authApi.register(parsed.data.name, parsed.data.email, parsed.data.password);
    await createSession(auth);
  } catch (err) {
    if (err instanceof BackendError && err.status === 409) {
      return { errors: { email: ["An account with this email already exists."] }, values };
    }
    return { message: errorMessage(err, "Could not create account."), values };
  }
  redirect(safeRedirect(formData.get("next") as string | null));
}

export async function logout() {
  const { accessToken, refreshToken } = await getTokens();
  try {
    await authApi.logout(accessToken, refreshToken);
  } catch {
    // Best effort — always clear local session.
  }
  await deleteSession();
  redirect(LOGIN_PATH);
}
