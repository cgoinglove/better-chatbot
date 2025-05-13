"use client";

import { useEffect, useState } from 'react';
import type { MCPClientsManager } from '@/lib/ai/mcp/create-mcp-clients-manager'; // Import the actual type

// Mock MCP manager for client-side rendering
const mockMCPManager = {
  getClients: () => [],
  tools: () => ({}),
  prompts: () => ({
    'example/greeting': {
      name: 'greeting',
      description: 'A simple greeting prompt',
      serverName: 'example',
      execute: async () => ({
        messages: [{ content: { text: 'Hello, this is a mock prompt!' } }]
      })
    }
  }),
  addClient: async () => {},
  removeClient: async () => {},
  refreshClient: async () => {},
  executePrompt: async (serverName: string, promptName: string) => {
    console.log(`Mock executing prompt ${promptName} from ${serverName}`);
    return {
      messages: [{ 
        content: { 
          text: `This is a mock response for ${promptName} from ${serverName}` 
        } 
      }]
    };
  }
};

/**
 * React hook to access the MCP Clients Manager
 * 
 * This hook provides a mock implementation for client-side rendering
 * and attempts to use the real implementation on the server
 */
export function useMCPManager() {
 const [manager, setManager] = useState<MCPClientsManager | typeof mockMCPManager>(mockMCPManager);

  useEffect(() => {
    // Check if we're in a Node.js environment (server)

    if (typeof window !== 'undefined') {
      // We're in the browser, use the mock
      return;
    }
    
    // If we're on the server, we can try to use the real implementation
    // This is wrapped in a try/catch because it might use Node.js modules
    try {
      const fetchMCPManager = async () => {
        try {
          // Dynamic imports to prevent client-side inclusion of Node.js modules
          const { createMCPClientsManager } = await import('@/lib/ai/mcp/create-mcp-clients-manager');

          const realManager = createMCPClientsManager();
          await realManager.init();
          setManager(realManager);
        } catch (error) {
          console.error('Failed to initialize MCP manager:', error);
          // Fall back to the mock
        }
      };
      
      fetchMCPManager();
    } catch (error) {
      console.error('Error importing MCP manager:', error);
      // Continue using the mock
    }
  }, []);
  
  return manager;
}