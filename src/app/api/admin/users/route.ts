import { NextRequest, NextResponse } from "next/server";
import { pgDb } from "lib/db/pg/db.pg";
import { UserSchema } from "lib/db/pg/schema.pg";
import { desc, count, like, or } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  try {
    const conditions = search
      ? or(
          like(UserSchema.name, `%${search}%`),
          like(UserSchema.email, `%${search}%`)
        )
      : undefined;

    const [users, totalResult] = await Promise.all([
      pgDb
        .select({
          id: UserSchema.id,
          name: UserSchema.name,
          email: UserSchema.email,
          emailVerified: UserSchema.emailVerified,
          image: UserSchema.image,
          createdAt: UserSchema.createdAt,
          updatedAt: UserSchema.updatedAt,
        })
        .from(UserSchema)
        .where(conditions)
        .orderBy(desc(UserSchema.createdAt))
        .limit(limit)
        .offset(offset),
      pgDb
        .select({ count: count() })
        .from(UserSchema)
        .where(conditions),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total: totalResult[0]?.count ?? 0,
        totalPages: Math.ceil((totalResult[0]?.count ?? 0) / limit),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
