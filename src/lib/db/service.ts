import { pgChatService } from "./pg/services/chat-service.pg";
import { pgUserService } from "./pg/services/user-service.pg";
import { pgMcpService } from "./pg/services/mcp-service.pg";
import { sqliteChatService } from "./sqlite/services/chat-service.sqlite";
import { sqliteUserService } from "./sqlite/services/user-service.sqlite";
import { sqliteMcpService } from "./sqlite/services/mcp-service.sqlite";

export const chatService = process.env.USE_FILE_SYSTEM_DB
  ? sqliteChatService
  : pgChatService;

export const userService = process.env.USE_FILE_SYSTEM_DB
  ? sqliteUserService
  : pgUserService;

export const mcpService = process.env.USE_FILE_SYSTEM_DB
  ? sqliteMcpService
  : pgMcpService;
