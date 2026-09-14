import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import type { Provider } from "next-auth/providers";
import {
  authSecretOrThrow,
  enabledAuthProviders,
  resolveAuthMode,
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: buildProviders(),
  secret: authSecretOrThrow(),
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
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
