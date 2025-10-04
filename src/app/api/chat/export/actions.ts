import { TipTapMentionJsonContent } from "app-types/util";
import { getUserId } from "../actions";
import { ChatExportCommentCreateSchema } from "app-types/chat-export";
import { chatExportRepository } from "lib/db/repository";

export async function addExportChatCommentAction(data: {
  exportId: string;
  content: TipTapMentionJsonContent;
  parentId?: string;
}) {
  const userId = await getUserId();
  const validatedData = ChatExportCommentCreateSchema.parse({
    ...data,
    authorId: userId,
  });
  return await chatExportRepository.insertComment(validatedData);
}
