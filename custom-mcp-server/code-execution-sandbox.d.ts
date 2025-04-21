/**
 * Execute code securely using the LLM Sandbox
 * @param code The code to execute
 * @param language The programming language (currently only supports Python)
 * @returns Result of the execution
 */
export function executeCodeSecurely(
  code: string,
  language: string,
): Promise<{
  success: boolean;
  output?: string;
  error?: string;
  executionTime?: number;
}>;
