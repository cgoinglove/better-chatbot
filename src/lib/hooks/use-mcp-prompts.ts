"use client";

import { useState } from "react";
import { callMcpPromptAction, listMcpPromptsAction } from "@/app/api/mcp/actions";
import useSWR from "swr";

export type MCPPromptArg = {
  name: string;
  description?: string;
  required: boolean;
};

export type MCPPrompt = {
  id: string;
  name: string;
  description: string;
  serverName: string;
  arguments?: MCPPromptArg[];
};

/**
 * Hook for accessing and executing MCP prompts
 */
export function useMCPPrompts() {
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);

  // Fetch available prompts using SWR
  const { data, isLoading, mutate } = useSWR(
    "mcp-prompts", 
    listMcpPromptsAction,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
    }
  );

  // Filter prompts based on search query
  const filterPrompts = (query: string) => {
    if (!query || !data) return [];
    
    const normalizedQuery = query.toLowerCase();
    
    // Ensure data is treated as an array before filtering
    const promptsArray = Array.isArray(data) ? data : [];

    return promptsArray.filter((prompt: MCPPrompt) => 
      prompt.name.toLowerCase().includes(normalizedQuery) || 
      prompt.description.toLowerCase().includes(normalizedQuery)
    );
  };

  // Execute a prompt
  const executePrompt = async (serverName: string, promptName: string, args?: Record<string, any>) => {
    setIsLoadingPrompt(true);
    setPromptError(null);
    
    try {
      const result = await callMcpPromptAction(serverName, promptName, args);
      setIsLoadingPrompt(false);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error executing prompt";
      setPromptError(errorMessage);
      setIsLoadingPrompt(false);
      throw error;
    }
  };

  return {
    prompts: data || [],
    filterPrompts,
    executePrompt,
    isLoadingPrompt,
    isLoadingPrompts: isLoading,
    promptError,
    refreshPrompts: () => mutate(),
  };
}