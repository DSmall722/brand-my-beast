import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Resend from "next-auth/providers/resend";
import type { Provider } from "next-auth/providers";
import { getDb } from "@/lib/db";
import {
  authAccounts,
  authSessions,
  authUsers,
  authVerificationTokens,
} from "@/lib/db/schema";
import {
  authSecretOrThrow,
  enabledAuthProviders,
  resolveAuthMode,
  resolveMagicLinkFrom,
} from "./mode";

function buildProviders(): Provider[] {
  const providers: Provider[] = [];
  const enabled = new Set(enabledAuthProviders());

  if (enabled.has("test-login")) {
    providers.push(
      Credentials({
        id: "test-login",
        name: "Test login",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        authorize(credentials) {
          const email = String(credentials?.email ?? "")
            .trim()
            .toLowerCase();
          const password = String(credentials?.password ?? "");
          const expected = process.env.AUTH_TEST_PASSWORD ?? "test";
          if (!email.endsWith("@example.com")) return null;
          if (password !== expected) return null;
          return {
            id: `test:${email}`,
            email,
            name: email.split("@")[0] ?? "bidder",
          };
        },
      }),
    );
  }

  if (enabled.has("resend")) {
    providers.push(
      Resend({
        apiKey: process.env.RESEND_API_KEY!,
        from: resolveMagicLinkFrom(),
      }),
    );
  }

  if (enabled.has("github")) {
    providers.push(
      GitHub({
        clientId: process.env.AUTH_GITHUB_ID!,
        clientSecret: process.env.AUTH_GITHUB_SECRET!,
      }),
    );
  }

  if (providers.length === 0) {
    providers.push(
      Credentials({
        id: "unconfigured",
        name: "Unconfigured",
        credentials: {},
        authorize() {
          return null;
        },
      }),
    );
  }

  return providers;
}

function buildAdapter() {
  const enabled = enabledAuthProviders();
  if (!enabled.includes("resend")) return undefined;
  const db = getDb();
  if (!db) return undefined;
  return DrizzleAdapter(db, {
    usersTable: authUsers,
    accountsTable: authAccounts,
    sessionsTable: authSessions,
    verificationTokensTable: authVerificationTokens,
  });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: buildAdapter(),
  providers: buildProviders(),
  secret: authSecretOrThrow(),
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
    verifyRequest: "/signin/check-email",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  debug: resolveAuthMode() === "test" && process.env.AUTH_DEBUG === "1",
});
