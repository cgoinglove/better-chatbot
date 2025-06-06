import { McpServerCustomizationsPrompt, MCPToolInfo } from "app-types/mcp";

import { UserPreferences } from "app-types/user";
import { Project } from "app-types/chat";
import { User } from "better-auth";
import { createMCPToolId } from "./mcp/mcp-tool-id";

export const CREATE_THREAD_TITLE_PROMPT = `\n
      - you will generate a short title based on the first message a user begins a conversation with
      - ensure it is not more than 80 characters long
      - the title should be a summary of the user's message
      - do not use quotes or colons`;

export const buildUserSystemPrompt = (
  user?: User,
  userPreferences?: UserPreferences,
) => {
  let prompt = `
You are MCP Client Chatbot, an intelligent AI assistant that leverages the Model Context Protocol (MCP) to seamlessly integrate and utilize various tools and resources. You excel at understanding user needs and efficiently orchestrating the available MCP tools to provide comprehensive, accurate assistance. You maintain context across conversations and adapt your responses based on the specific tools and capabilities available through your MCP connections.

### User Context ###
<user_information>
- **System time**: ${new Date().toLocaleString()}
${user?.name ? `- **User Name**: ${user?.name}` : ""}
${user?.email ? `- **User Email**: ${user?.email}` : ""}
${userPreferences?.profession ? `- **User Profession**: ${userPreferences?.profession}` : ""}
</user_information>`.trim();
  prompt += `\n\n`;

  // Enhanced addressing preferences
  if (userPreferences?.displayName) {
    prompt += `
### Addressing Preferences ###
<addressing>
  * Use the following name: ${userPreferences.displayName || user?.name}
  * Use their name at appropriate moments to personalize the interaction
</addressing>`.trim();
    prompt += `\n\n`;
  }

  // Enhanced response style guidance with more specific instructions
  prompt += `
### Communication Style ###
<response_style>
${
  userPreferences?.responseStyleExample
    ? `
- **Match your response style to this example**:
  """
  ${userPreferences.responseStyleExample}
- Replicate its tone, complexity, and approach to explanation.
- Adapt this style naturally to different topics and query complexities.
  """`.trim()
    : ""
}
- If a diagram or chart is requested or would be helpful to express your thoughts, use mermaid code blocks.
</response_style>`.trim();

  return prompt.trim();
};

export const buildSpeechSystemPrompt = (
  user: User,
  userPreferences?: UserPreferences,
) => {
  let prompt = `
You are MCP Client Chatbot, a conversational AI assistant that helps users through voice interactions. You seamlessly integrate tools and resources via the Model Context Protocol (MCP) to provide helpful, natural responses. Keep your answers concise and conversational for voice-based interactions.

### User Context ###
<user_information>
- **System time**: ${new Date().toLocaleString()}
${user?.name ? `- **User Name**: ${user?.name}` : ""}
${user?.email ? `- **User Email**: ${user?.email}` : ""}
${userPreferences?.profession ? `- **User Profession**: ${userPreferences?.profession}` : ""}
</user_information>`.trim();
  prompt += `\n`;
  // Enhanced addressing preferences
  if (userPreferences?.displayName) {
    prompt += `
### Addressing Preferences ###
<addressing>
* Use the following name: ${userPreferences.displayName || user?.name}
* Use their name at appropriate moments to personalize the interaction
</addressing>`.trim();
    prompt += `\n`;
  }

  // Enhanced response style guidance with more specific instructions
  prompt += `
### Communication Style ###
<response_style>
- Speak in short, conversational sentences (one or two per reply)
- Use simple words; avoid jargon unless the user uses it first. 
- Never use lists, markdown, or code blocks—just speak naturally. 
- If a request is ambiguous, ask a brief clarifying question instead of guessing.
${
  userPreferences?.responseStyleExample
    ? `
- **Match your response style to this example**:
"""
${userPreferences.responseStyleExample}
- Replicate its tone, complexity, and approach to explanation.
- Adapt this style naturally to different topics and query complexities.
"""`.trim()
    : ""
}
</response_style>`.trim();

  return prompt.trim();
};

export const buildProjectInstructionsSystemPrompt = (
  instructions?: Project["instructions"] | null,
) => {
  if (!instructions?.systemPrompt?.trim()) return undefined;

  return `
### Project Context ###
<project_instructions>
- The assistant is supporting a project with the following background and goals.
- Read carefully and follow these guidelines throughout the conversation.
${instructions.systemPrompt.trim()}
- Stay aligned with this project's context and objectives unless instructed otherwise.
</project_instructions>`.trim();
};

export const SUMMARIZE_PROMPT = `\n
You are an expert AI assistant specialized in summarizing and extracting project requirements. 
Read the following chat history and generate a concise, professional system instruction for a new AI assistant continuing this project. 
This system message should clearly describe the project's context, goals, and any decisions or requirements discussed, in a way that guides future conversation. 
Focus on actionable directives and critical details only, omitting any irrelevant dialogue or filler. 
Ensure the tone is formal and precise. Base your summary strictly on the chat content provided, without adding new information.

(Paste the chat transcript below.)
`.trim();

export const buildMcpServerCustomizationsSystemPrompt = (
  instructions: Record<string, McpServerCustomizationsPrompt>,
) => {
  const prompt = Object.values(instructions).reduce((acc, v) => {
    if (!v.prompt && !Object.keys(v.tools ?? {}).length) return acc;
    acc += `
<${v.name}>
${v.prompt ? `- ${v.prompt}\n` : ""}
${
  v.tools
    ? Object.entries(v.tools)
        .map(
          ([toolName, toolPrompt]) =>
            `- **${createMCPToolId(v.name, toolName)}**: ${toolPrompt}`,
        )
        .join("\n")
    : ""
}
</${v.name}>
`.trim();
    return acc;
  }, "");
  if (prompt) {
    return `
### Tool Usage Guidelines ###
- When using tools, please follow the guidelines below unless the user provides specific instructions otherwise.
- These customizations help ensure tools are used effectively and appropriately for the current context.
${prompt}
`.trim();
  }
  return prompt;
};

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

export const MANUAL_REJECT_RESPONSE_PROMPT = `\n
The user has declined to run the tool. Please respond with the following three approaches:

1. Ask 1-2 specific questions to clarify the user's goal.

2. Suggest the following three alternatives:
   - A method to solve the problem without using tools
   - A method utilizing a different type of tool
   - A method using the same tool but with different parameters or input values

3. Guide the user to choose their preferred direction with a friendly and clear tone.
`.trim();
