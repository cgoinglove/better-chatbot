import { getMockUserSession } from "@/lib/mock";
import logger from "logger";
import { NextRequest, NextResponse } from "next/server";
import { insertCodeSnippetAction } from "./actions";

export async function POST(request: NextRequest) {
  try {
    const session = getMockUserSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, code, language, tags, isFavorite } = body;

    // Validate required fields
    if (!title || !code || !language) {
      return NextResponse.json(
        { error: "Title, code, and language are required" },
        { status: 400 },
      );
    }

    // Create the snippet
    const snippet = await insertCodeSnippetAction({
      title,
      description,
      code,
      language,
      tags,
      isFavorite: isFavorite || false,
    });

    return NextResponse.json(snippet, { status: 201 });
  } catch (error) {
    logger.error("Error creating code snippet:", error);
    return NextResponse.json(
      { error: "Failed to create code snippet" },
      { status: 500 },
    );
  }
}
