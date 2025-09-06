import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AppDefaultToolkit, ChatThread, Project } from "app-types/chat";

import { DEFAULT_MODEL } from "lib/ai/models";
import { AllowedMCPServer, MCPServerInfo } from "app-types/mcp";
import { OPENAI_VOICE } from "lib/ai/speech/open-ai/use-voice-chat.openai";
export interface AppState {
  threadList: ChatThread[];
  mcpList: MCPServerInfo[];
  projectList: Omit<Project, "instructions">[];
  currentThreadId: ChatThread["id"] | null;
  currentProjectId: Project["id"] | null;
  toolChoice: "auto" | "none" | "manual";
  allowedMcpServers?: Record<string, AllowedMCPServer>;
  allowedAppDefaultToolkit?: AppDefaultToolkit[];
  model: string;
  temporaryModel: string;
  openTemporaryChat: boolean;
  openShortcutsPopup: boolean;
  openChatPreferences: boolean;
  voiceChat: {
    isOpen: boolean;
    options: {
      provider: string;
      providerOptions?: Record<string, any>;
    };
  };
}

export interface AppDispatch {
  mutate: (state: Mutate<AppState>) => void;
}

const initialState: AppState = {
  threadList: [],
  projectList: [],
  mcpList: [],
  currentThreadId: null,
  currentProjectId: null,
  toolChoice: "auto",
  allowedMcpServers: undefined,
  allowedAppDefaultToolkit: [AppDefaultToolkit.Weather, AppDefaultToolkit.WebSearch],
  model: DEFAULT_MODEL,
  temporaryModel: DEFAULT_MODEL,
  openTemporaryChat: false,
  openShortcutsPopup: false,
  openChatPreferences: false,
  voiceChat: {
    isOpen: false,
    options: {
      provider: "openai",
      providerOptions: {
        model: OPENAI_VOICE["Alloy"],
      },
    },
  },
};

export const appStore = create<AppState & AppDispatch>()(
  persist(
    (set) => ({
      ...initialState,
      mutate: set,
    }),
    {
      name: "mc-app-store-v1.0.0",
      partialize: (state) => ({
        model: state.model || initialState.model,
        toolChoice: state.toolChoice || initialState.toolChoice,
        allowedMcpServers:
          state.allowedMcpServers || initialState.allowedMcpServers,
        allowedAppDefaultToolkit:
          state.allowedAppDefaultToolkit ||
          initialState.allowedAppDefaultToolkit,
        temporaryModel: state.temporaryModel || initialState.temporaryModel,
        voiceChat: {
          ...initialState.voiceChat,
          ...state.voiceChat,
          isOpen: false,
        },
      }),
    },
  ),
);
