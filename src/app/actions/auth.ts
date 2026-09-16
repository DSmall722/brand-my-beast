"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { auth, signIn, signOut } from "@/lib/auth";
import { anonymizeIntentBidsForUser } from "@/lib/intent-store";
import {
  MAGIC_LINK_RATE_LIMITED,
  checkMagicLinkRateLimit,
  clientIpFromHeaders,
} from "@/lib/rate-limit";
import { logMagicLinkRequest } from "@/lib/structured-log";
import { detachWaitlistUserId } from "@/lib/waitlist";

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
    // Slice 13.34 — hashed email only; never log the raw address.
    logMagicLinkRequest(email, "rate_limited");
    return { ok: false, error: MAGIC_LINK_RATE_LIMITED };
  }

  // Slice 13.34 — hashed email only; never log the raw address.
  logMagicLinkRequest(email, "requested");

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

export type DeleteAccountState = {
  ok: boolean;
  error?: string;
};

/**
 * Slice 12.16 — anonymize bid user ids, keep public standing amounts, sign out.
 */
export async function deleteAccountAction(
  _prev: DeleteAccountState,
  _formData: FormData,
): Promise<DeleteAccountState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Sign in required." };
  }

  const userId = session.user.id;
  try {
    await anonymizeIntentBidsForUser(userId);
    await detachWaitlistUserId(userId);
  } catch {
    return { ok: false, error: "Account delete failed. Standing amounts were not cleared." };
  }

  await signOut({ redirectTo: "/" });
  return { ok: true };
}
