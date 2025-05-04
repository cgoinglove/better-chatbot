import { pgChatService } from "./pg/queries.pg";
import { sqliteChatService } from "./sqlite/queries.sqlite";

export const chatService = process.env.USE_FILE_SYSTEM_DB
  ? sqliteChatService
  : pgChatService;
