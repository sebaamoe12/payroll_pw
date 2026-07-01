import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query, queryOne } from "@/server/db";
import type { Company, User } from "@/server/db/types";

export async function POST(request: Request) {
  try {
    const { email, password, name, companyName } = await request.json();

    if (!email || !password || !companyName) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    const existingUser = await queryOne<User>('SELECT id FROM "User" WHERE email = $1', [email]);
    if (existingUser) {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
    }

    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const hashedPassword = await bcrypt.hash(password, 12);

    const companyId = `comp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const company = await queryOne<Company>(
      `INSERT INTO "Company" (id, name, slug) VALUES ($1, $2, $3) RETURNING *`,
      [companyId, companyName, slug]
    );

    const userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const user = await queryOne<User>(
      `INSERT INTO "User" (id, email, name, password, role, "companyId") VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, email, name || email.split("@")[0], hashedPassword, "ADMIN", companyId]
    );

    return NextResponse.json({
      user: { id: user!.id, email: user!.email, name: user!.name },
      company: { id: company!.id, name: company!.name, slug: company!.slug },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Erreur lors de l'inscription" }, { status: 500 });
  }
}
