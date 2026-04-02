import { NextRequest, NextResponse } from "next/server";
import { pgDb } from "lib/db/pg/db.pg";
import { UserTable } from "lib/db/pg/schema.pg";
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
          like(UserTable.name, `%${search}%`),
          like(UserTable.email, `%${search}%`),
        )
      : undefined;

    const [users, totalResult] = await Promise.all([
      pgDb
        .select({
          id: UserTable.id,
          name: UserTable.name,
          email: UserTable.email,
          emailVerified: UserTable.emailVerified,
          image: UserTable.image,
          createdAt: UserTable.createdAt,
          updatedAt: UserTable.updatedAt,
        })
        .from(UserTable)
        .where(conditions)
        .orderBy(desc(UserTable.createdAt))
        .limit(limit)
        .offset(offset),
      pgDb.select({ count: count() }).from(UserTable).where(conditions),
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
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}
