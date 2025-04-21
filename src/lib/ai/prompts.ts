import { RuleEngine } from "./rule-engine";

export const CREATE_THREAD_TITLE_PROMPT = `\n
      - you will generate a short title based on the first message a user begins a conversation with
      - ensure it is not more than 80 characters long
      - the title should be a summary of the user's message
      - do not use quotes or colons`;

export const BASE_SYSTEM_PROMPT = `\n
system time: ${new Date().toLocaleString()}
- You are a helpful assistant.
`;

/**
 * Generates a system prompt that includes the base prompt and any enabled rules
 * @param userId The user ID to generate the system prompt for
 * @returns The combined system prompt
 */
export async function getSystemPrompt(userId: string): Promise<string> {
  const ruleEngine = RuleEngine.getInstance();
  return ruleEngine.generateSystemPrompt(userId, BASE_SYSTEM_PROMPT);
}
