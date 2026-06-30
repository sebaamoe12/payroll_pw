import type { NextAuthOptions } from "next-auth";

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" as const },
  pages: { signIn: "/login" },
};
