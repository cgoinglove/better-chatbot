import { pgUserService } from "./pg/queries.pg";
import { sqliteUserService } from "./sqlite/queries.sqlite";

export const userService = process.env.USE_FILE_SYSTEM_DB
  ? sqliteUserService
  : pgUserService;
