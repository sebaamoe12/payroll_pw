import { getServerSession } from "next-auth";
import { authOptions } from "./config";

export { authOptions } from "./config";
export type AuthSession = {
  user?: { id: string; email: string; name?: string; role: string; companyId: string };
};

export async function getAuth(): Promise<AuthSession | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return {
    user: {
      id: (session.user as { id: string }).id,
      email: (session.user as { email: string }).email,
      name: session.user.name ?? undefined,
      role: (session.user as { role: string }).role,
      companyId: (session.user as { companyId: string }).companyId,
    },
  };
}
