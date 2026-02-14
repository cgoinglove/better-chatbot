import { NextResponse } from "next/server";
import { pgDb } from "lib/db/pg/db.pg";
import {
  UserSchema,
  SessionSchema,
  LeadSchema,
  UsageRecordSchema,
  ConnectorSchema,
} from "lib/db/pg/schema.pg";
import { count, sql, gte, eq, and } from "drizzle-orm";

export async function GET() {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      usersResult,
      sessionsResult,
      leadsResult,
      pipelineResult,
      aiRequestsResult,
      connectorsResult,
    ] = await Promise.all([
      pgDb.select({ count: count() }).from(UserSchema),
      pgDb
        .select({ count: count() })
        .from(SessionSchema)
        .where(gte(SessionSchema.expiresAt, now)),
      pgDb.select({ count: count() }).from(LeadSchema),
      pgDb
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${LeadSchema.estimatedValue} AS numeric)), 0)`.mapWith(
            Number
          ),
        })
        .from(LeadSchema),
      pgDb
        .select({ count: count() })
        .from(UsageRecordSchema)
        .where(
          and(
            eq(UsageRecordSchema.resourceType, "ai-requests"),
            gte(UsageRecordSchema.recordedAt, monthStart)
          )
        ),
      pgDb.select({ count: count() }).from(ConnectorSchema),
    ]);

    return NextResponse.json({
      stats: {
        totalUsers: usersResult[0]?.count ?? 0,
        activeSessions: sessionsResult[0]?.count ?? 0,
        totalLeads: leadsResult[0]?.count ?? 0,
        pipelineValue: pipelineResult[0]?.total ?? 0,
        aiRequestsThisMonth: aiRequestsResult[0]?.count ?? 0,
        totalConnectors: connectorsResult[0]?.count ?? 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
