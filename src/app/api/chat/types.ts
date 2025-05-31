import { AppDefaultToolkit } from "app-types/chat";

export interface ChatRequestBody {
  allowedAppDefaultToolkit?: AppDefaultToolkit[];
  // Add other request body fields as needed
}
