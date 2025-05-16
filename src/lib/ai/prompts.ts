import { MCPToolInfo } from "app-types/mcp";
import { Session } from "next-auth";
import { UserPreferences } from "app-types/user";
import { Project } from "app-types/chat";

export const CREATE_THREAD_TITLE_PROMPT = `\n
      - you will generate a short title based on the first message a user begins a conversation with
      - ensure it is not more than 80 characters long
      - the title should be a summary of the user's message
      - do not use quotes or colons`;

export const buildUserSystemPrompt = (
  session?: Session,
  userPreferences?: UserPreferences,
) => {
  let prompt = `
### User Context ###
<user_information>
- **System time:** ${new Date().toLocaleString()}
${session?.user?.name ? `- **User Name:** ${session?.user?.name}` : ""}
${session?.user?.email ? `- **User Email:** ${session?.user?.email}` : ""}
${userPreferences?.profession ? `- **User Profession:** ${userPreferences?.profession}` : ""}
</user_information>`.trim();

  // Enhanced addressing preferences
  if (userPreferences?.displayName) {
    prompt += `
### Addressing Preferences ###
<addressing>
  * Use the following name: ${userPreferences.displayName}
  * Use their name at appropriate moments to personalize the interaction
</addressing>`.trim();
  }

  // Enhanced response style guidance with more specific instructions
  prompt += `
### Communication Style ###

${
  userPreferences?.responseStyleExample
    ? `
<response_style>
- **Match your response style to this example**:
  """
  ${userPreferences.responseStyleExample}
- Replicate its tone, complexity, and approach to explanation.
- Adapt this style naturally to different topics and query complexities.
  """
</response_style>`.trim()
    : ""
}
${
  userPreferences?.profession
    ? `
- This user works as a **${userPreferences.profession}**.
`.trim()
    : ""
}
- If a diagram or chart is requested or would be helpful to express your thoughts, use mermaid code blocks.
- You can embed interactive maps using the map language specifier:
  \`\`\`map
  center: [51.505, -0.09]
  zoom: 13
  markers:
    - position: [51.505, -0.09]
      popup: "London"
    - position: [51.51, -0.08]
      popup: "Another Location"
  \`\`\`

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
