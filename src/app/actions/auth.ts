"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { signIn, signOut } from "@/lib/auth";
import {
  MAGIC_LINK_RATE_LIMITED,
  checkMagicLinkRateLimit,
  clientIpFromHeaders,
} from "@/lib/rate-limit";

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

export async function signInWithMagicLink(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const callbackUrl = String(formData.get("callbackUrl") ?? "/account");

  if (!email || !email.includes("@")) {
    return { ok: false, error: "Enter a valid email." };
  }

  const hdrs = await headers();
  const ip = clientIpFromHeaders(hdrs);
  const limited = checkMagicLinkRateLimit(email, ip);
  if (!limited.ok) {
    return { ok: false, error: MAGIC_LINK_RATE_LIMITED };
  }

  try {
    await signIn("resend", {
      email,
      redirectTo: callbackUrl.startsWith("/") ? callbackUrl : "/account",
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        ok: false,
        error: "Could not send the sign-in link. Try again.",
      };
    }
    throw error;
  }
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
