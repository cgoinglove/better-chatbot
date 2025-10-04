import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ChatMention, ChatModel, ChatThread } from "app-types/chat";
import { AllowedMCPServer, MCPServerInfo } from "app-types/mcp";
import { OPENAI_VOICE } from "lib/ai/speech/open-ai/use-voice-chat.openai";
import { WorkflowSummary } from "app-types/workflow";
import { AppDefaultToolkit } from "lib/ai/tools";
import { AgentSummary } from "app-types/agent";
import { ArchiveWithItemCount } from "app-types/archive";

export interface UploadedFile {
  id: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
  isUploading?: boolean;
  progress?: number;
  previewUrl?: string;
  abortController?: AbortController;
  dataUrl?: string; // Full data URL format: "data:image/png;base64,..."
}

export interface AppState {
  threadList: ChatThread[];
  mcpList: (MCPServerInfo & { id: string })[];
  agentList: AgentSummary[];
  workflowToolList: WorkflowSummary[];
  currentThreadId: ChatThread["id"] | null;
  toolChoice: "auto" | "none" | "manual";
  allowedMcpServers?: Record<string, AllowedMCPServer>;
  allowedAppDefaultToolkit?: AppDefaultToolkit[];
  generatingTitleThreadIds: string[];
  archiveList: ArchiveWithItemCount[];
  threadMentions: {
    [threadId: string]: ChatMention[];
  };
  threadFiles: {
    [threadId: string]: UploadedFile[];
  };
  threadImageToolModel: {
    [threadId: string]: string | undefined;
  };
  toolPresets: {
    allowedMcpServers?: Record<string, AllowedMCPServer>;
    allowedAppDefaultToolkit?: AppDefaultToolkit[];
    name: string;
  }[];
  chatModel?: ChatModel;
  openShortcutsPopup: boolean;
  openChatPreferences: boolean;
  openUserSettings: boolean;
  mcpCustomizationPopup?: MCPServerInfo & { id: string };
  temporaryChat: {
    isOpen: boolean;
    instructions: string;
    chatModel?: ChatModel;
  };
  voiceChat: {
    isOpen: boolean;
    agentId?: string;
    options: {
      provider: string;
      providerOptions?: Record<string, any>;
    };
  };
  pendingThreadMention?: ChatMention;
}

export interface AppDispatch {
  mutate: (state: Mutate<AppState>) => void;
}

const initialState: AppState = {
  threadList: [],
  archiveList: [],
  generatingTitleThreadIds: [],
  threadMentions: {},
  threadFiles: {},
  threadImageToolModel: {},
  mcpList: [],
  agentList: [],
  workflowToolList: [],
  currentThreadId: null,
  toolChoice: "auto",
  allowedMcpServers: undefined,
  openUserSettings: false,
  allowedAppDefaultToolkit: [
    AppDefaultToolkit.Code,
    AppDefaultToolkit.Visualization,
  ],
  toolPresets: [],
  chatModel: undefined,
  openShortcutsPopup: false,
  openChatPreferences: false,
  mcpCustomizationPopup: undefined,
  temporaryChat: {
    isOpen: false,
    instructions: "",
  },
  voiceChat: {
    isOpen: false,
    options: {
      provider: "openai",
      providerOptions: {
        model: OPENAI_VOICE["Alloy"],
      },
    },
  },
  pendingThreadMention: undefined,
};

export const appStore = create<AppState & AppDispatch>()(
  persist(
    (set) => ({
      ...initialState,
      mutate: set,
    }),
    {
      name: "mc-app-store-v2.0.1",
      partialize: (state) => ({
        chatModel: state.chatModel || initialState.chatModel,
        toolChoice: state.toolChoice || initialState.toolChoice,
        allowedMcpServers:
          state.allowedMcpServers || initialState.allowedMcpServers,
        allowedAppDefaultToolkit: (
          state.allowedAppDefaultToolkit ??
          initialState.allowedAppDefaultToolkit
        )?.filter((v) => Object.values(AppDefaultToolkit).includes(v)),
        temporaryChat: {
          ...initialState.temporaryChat,
          ...state.temporaryChat,
          isOpen: false,
        },
        toolPresets: state.toolPresets || initialState.toolPresets,
        voiceChat: {
          ...initialState.voiceChat,
          ...state.voiceChat,
          isOpen: false,
        },
      }),
    },
  ),
);
