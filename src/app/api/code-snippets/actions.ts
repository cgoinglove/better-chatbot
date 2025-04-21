"use server";

import { CodeSnippet, codeSnippetService } from "@/lib/db/code-snippet-service";
import { getMockUserSession } from "@/lib/mock";
import logger from "logger";

export async function insertCodeSnippetAction({
  title,
  description,
  code,
  language,
  tags,
  isFavorite,
}: Omit<
  CodeSnippet,
  "id" | "userId" | "createdAt" | "updatedAt"
>): Promise<CodeSnippet> {
  try {
    const userId = getMockUserSession().id;
    return await codeSnippetService.insertCodeSnippet({
      title,
      description,
      code,
      language,
      tags,
      isFavorite,
      userId,
    });
  } catch (error) {
    logger.error("Error inserting code snippet:", error);
    throw new Error("Failed to save code snippet");
  }
}

export async function updateCodeSnippetAction(
  id: string,
  {
    title,
    description,
    code,
    language,
    tags,
    isFavorite,
  }: Partial<Omit<CodeSnippet, "id" | "userId" | "createdAt" | "updatedAt">>,
): Promise<CodeSnippet> {
  try {
    return await codeSnippetService.updateCodeSnippet(id, {
      title,
      description,
      code,
      language,
      tags,
      isFavorite,
    });
  } catch (error) {
    logger.error("Error updating code snippet:", error);
    throw new Error("Failed to update code snippet");
  }
}

export async function deleteCodeSnippetAction(id: string): Promise<void> {
  try {
    await codeSnippetService.deleteCodeSnippet(id);
  } catch (error) {
    logger.error("Error deleting code snippet:", error);
    throw new Error("Failed to delete code snippet");
  }
}

export async function selectCodeSnippetAction(
  id: string,
): Promise<CodeSnippet | null> {
  try {
    return await codeSnippetService.selectCodeSnippet(id);
  } catch (error) {
    logger.error("Error selecting code snippet:", error);
    throw new Error("Failed to retrieve code snippet");
  }
}

export async function selectCodeSnippetsByUserIdAction(): Promise<
  CodeSnippet[]
> {
  try {
    const userId = getMockUserSession().id;
    return await codeSnippetService.selectCodeSnippetsByUserId(userId);
  } catch (error) {
    logger.error("Error selecting code snippets by user ID:", error);
    return [];
  }
}

export async function searchCodeSnippetsAction(
  query: string,
): Promise<CodeSnippet[]> {
  try {
    const userId = getMockUserSession().id;
    return await codeSnippetService.searchCodeSnippets(userId, query);
  } catch (error) {
    logger.error("Error searching code snippets:", error);
    return [];
  }
}

export async function selectCodeSnippetsByLanguageAction(
  language: string,
): Promise<CodeSnippet[]> {
  try {
    const userId = getMockUserSession().id;
    return await codeSnippetService.selectCodeSnippetsByLanguage(
      userId,
      language,
    );
  } catch (error) {
    logger.error("Error selecting code snippets by language:", error);
    return [];
  }
}

export async function selectFavoriteCodeSnippetsAction(): Promise<
  CodeSnippet[]
> {
  try {
    const userId = getMockUserSession().id;
    return await codeSnippetService.selectFavoriteCodeSnippets(userId);
  } catch (error) {
    logger.error("Error selecting favorite code snippets:", error);
    return [];
  }
}
