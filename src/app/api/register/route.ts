import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/server/db";

export async function POST(request: Request) {
  try {
    const { email, password, name, companyName } = await request.json();

    if (!email || !password || !companyName) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
    }

    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const hashedPassword = await bcrypt.hash(password, 12);

    const company = await prisma.company.create({
      data: { name: companyName, slug },
    });

    const user = await prisma.user.create({
      data: {
        email,
        name: name || email.split("@")[0],
        password: hashedPassword,
        role: "ADMIN",
        companyId: company.id,
      },
    });

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      company: { id: company.id, name: company.name, slug: company.slug },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Erreur lors de l'inscription" }, { status: 500 });
  }
}
