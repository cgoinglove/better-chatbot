import { MCPToolInfo } from "app-types/mcp";
import { Session } from "next-auth";

export const CREATE_THREAD_TITLE_PROMPT = `\n
      - you will generate a short title based on the first message a user begins a conversation with
      - ensure it is not more than 80 characters long
      - the title should be a summary of the user's message
      - do not use quotes or colons`;

export const SYSTEM_TIME_PROMPT = (session?: Session) =>
  `\n
- system time: ${new Date().toLocaleString()}
${session?.user?.name ? `- User Name: ${session?.user?.name}` : ""}
${session?.user?.email ? `- User Email: ${session?.user?.email}` : ""}

`.trim();

export const SUMMARIZE_PROMPT = `\n
You are an expert AI assistant specialized in summarizing and extracting project requirements. 
Read the following chat history and generate a concise, professional system instruction for a new AI assistant continuing this project. 
This system message should clearly describe the project’s context, goals, and any decisions or requirements discussed, in a way that guides future conversation. 
Focus on actionable directives and critical details only, omitting any irrelevant dialogue or filler. 
Ensure the tone is formal and precise. Base your summary strictly on the chat content provided, without adding new information.

(Paste the chat transcript below.)
`.trim();

export const generateExampleToolSchemaPrompt = (options: {
  toolInfo: MCPToolInfo;
  prompt?: string;
}) => `\n
You are given a tool with the following details:
- Tool Name: ${options.toolInfo.name}
- Tool Description: ${options.toolInfo.description}

${
  options.prompt ||
  `
Step 1: Create a realistic example question or scenario that a user might ask to use this tool.
Step 2: Based on that question, generate a valid JSON input object that matches the input schema of the tool.
`.trim()
}
`;
