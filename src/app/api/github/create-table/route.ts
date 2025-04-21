import fs from "fs/promises";
import { sqliteDb } from "lib/db/db.sqlite";
import { GitHubConfigSqliteSchema } from "lib/db/schema.github-config";
import { getMockUserSession } from "lib/mock";
import logger from "logger";
import { NextRequest } from "next/server";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    // Verify user is logged in
    const user = getMockUserSession();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      // Read and execute the migration file
      const migrationPath = path.join(
        process.cwd(),
        "src/lib/db/migrations/sqlite/0005_github_config_table.sql",
      );
      const migrationSql = await fs.readFile(migrationPath, "utf-8");

      // Execute the migration
      await sqliteDb.run(migrationSql);

      // Verify the table was created by trying to query it
      try {
        await sqliteDb.select().from(GitHubConfigSqliteSchema).limit(1);

        return Response.json({
          success: true,
          message: "GitHub config table created successfully",
        });
      } catch (queryError) {
        logger.error("Error verifying GitHub config table:", queryError);
        return Response.json(
          {
            success: false,
            error: "Error verifying GitHub config table",
            message:
              queryError instanceof Error
                ? queryError.message
                : String(queryError),
          },
          { status: 500 },
        );
      }
    } catch (error) {
      logger.error("Error creating github_config table:", error);
      return Response.json(
        {
          success: false,
          error: "Error creating github_config table",
          message: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      );
    }
  } catch (error) {
    logger.error("Error in create-table route:", error);
    return Response.json(
      {
        success: false,
        error: "Error in create-table route",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
