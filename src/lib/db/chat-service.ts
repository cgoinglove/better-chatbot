import "./init-db"; // Import the database initialization module
import { pgChatService } from "./queries.pg";
import { sqliteChatService } from "./queries.sqlite";

export const chatService = process.env.USE_FILE_SYSTEM_DB
  ? sqliteChatService
  : pgChatService;
