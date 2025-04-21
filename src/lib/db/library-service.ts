import "./library-service-init"; // Import the initialization module
import { pgLibraryService } from "./queries.pg/library";
import { sqliteLibraryService } from "./queries.sqlite/library";

export const libraryService = process.env.USE_FILE_SYSTEM_DB
  ? sqliteLibraryService
  : pgLibraryService;
