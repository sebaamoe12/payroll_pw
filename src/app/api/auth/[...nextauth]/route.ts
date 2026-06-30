import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createPrismaClient } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" as const },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const prisma = createPrismaClient();
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        await prisma.$disconnect();
        if (!user || !user.password) return null;
        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role as string, companyId: user.companyId };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }: { token: any; user?: any }) {
      if (user) { token.id = user.id; token.role = user.role; token.companyId = user.companyId; }
      return token;
    },
    session({ session, token }: { session: any; token: any }) {
      if (session.user) { session.user.id = token.id; session.user.role = token.role; session.user.companyId = token.companyId; }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
