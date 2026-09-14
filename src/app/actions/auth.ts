"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";

export type SignInState = {
  ok: boolean;
  error?: string;
};

export async function signInWithTestCredentials(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/account");

  try {
    await signIn("test-login", {
      email,
      password,
      redirectTo: callbackUrl.startsWith("/") ? callbackUrl : "/account",
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "Sign-in failed. Use an @example.com email." };
    }
    throw error;
  }
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
