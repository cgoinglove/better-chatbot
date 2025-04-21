import { Canvas } from "app-types/canvas";
import type { ChatThread } from "app-types/chat";
import { GitHubRepository } from "app-types/github";
import { Library, LibraryEntry } from "app-types/library";
import { MCPServerInfo } from "app-types/mcp";
import { Rule } from "app-types/rules";
import type { User } from "app-types/user";
import { DEFAULT_MODEL } from "lib/ai/models";
import { getMockUserSession } from "lib/mock";
import { create } from "zustand";
import { persist } from "zustand/middleware";
export interface AppState {
  threadList: ChatThread[];
  mcpList: MCPServerInfo[];
  canvasList: Canvas[];
  ruleList: Rule[];
  libraryList: Library[];
  libraryEntryList: LibraryEntry[];
  githubRepositoryList: GitHubRepository[] | null;
  currentThreadId: ChatThread["id"] | null;
  currentCanvasId: Canvas["id"] | null;
  currentLibraryId: Library["id"] | null;
  currentGithubRepositoryId: GitHubRepository["id"] | null;
  user: User;
  activeTool: boolean;
  model: string;
}

export interface AppDispatch {
  mutate: (state: Mutate<AppState>) => void;
}

export interface AppGetters {
  getCurrentThread(): ChatThread | null;
  getCurrentLibrary(): Library | null;
}
export const appStore = create<AppState & AppDispatch & AppGetters>()(
  persist(
    (set, get) => ({
      threadList: [],
      mcpList: [],
      canvasList: [],
      ruleList: [],
      libraryList: [],
      libraryEntryList: [],
      githubRepositoryList: null,
      currentThreadId: null,
      currentCanvasId: null,
      currentLibraryId: null,
      currentGithubRepositoryId: null,
      user: getMockUserSession(),
      activeTool: true,
      modelList: [],

      model: "claude-3-5-sonnet", // Use Claude as default model
      getCurrentThread: () =>
        get().threadList.find(
          (thread) => thread.id === get().currentThreadId,
        ) || null,
      getCurrentLibrary: () =>
        get().libraryList.find(
          (library) => library.id === get().currentLibraryId,
        ) || null,
      mutate: set,
    }),
    {
      name: "mc-app-store",
      partialize: (state) => ({
        model: state.model || DEFAULT_MODEL,
        activeTool: state.activeTool,
      }),
    },
  ),
);
