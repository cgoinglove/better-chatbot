import "./canvas-service-init"; // Import the initialization module
import { pgCanvasService } from "./queries.pg/canvas";
import { sqliteCanvasService } from "./queries.sqlite/canvas";

export const canvasService = process.env.USE_FILE_SYSTEM_DB
  ? sqliteCanvasService
  : pgCanvasService;
