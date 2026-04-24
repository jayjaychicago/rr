import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import { createHash } from "crypto";

// UUID v5 (SHA-1) with fixed namespace — never change this namespace
const DINER_NS = Buffer.from("e3d2c1b0a9f84e7d8c6b5a4f3e2d1c0b", "hex");

function makeDinerId(provider: string, providerAccountId: string): string {
  const hash = createHash("sha1")
    .update(DINER_NS)
    .update(`${provider}:${providerAccountId}`)
    .digest();
  hash[6] = (hash[6] & 0x0f) | 0x50; // version 5
  hash[8] = (hash[8] & 0x3f) | 0x80; // variant
  const h = hash.toString("hex");
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
        token.dinerId = makeDinerId(account.provider, account.providerAccountId);
      }
      if (profile) {
        token.email = (profile as { email?: string }).email ?? token.email;
        token.name = (profile as { name?: string }).name ?? token.name;
        token.picture = (profile as { picture?: string }).picture ?? token.picture;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
      }
      const s = session as unknown as Record<string, unknown>;
      s.accessToken = token.accessToken;
      s.provider = token.provider;
      s.dinerId = token.dinerId;
      return session;
    },
  },
};
