import { create } from "zustand";
import type {
  ChatAttachment,
  ChatModel,
  ImageToolChoice,
  ToolChoice,
} from "@/lib/types";

type ChatState = {
  selectedModel?: ChatModel;
  toolChoice: ToolChoice;
  imageTool: ImageToolChoice;
  temporaryInstructions: string;
  pendingFirstMessage?: string;
  draftAttachments: ChatAttachment[];
  setSelectedModel: (model?: ChatModel) => void;
  setToolChoice: (toolChoice: ToolChoice) => void;
  setImageTool: (imageTool: ImageToolChoice) => void;
  setTemporaryInstructions: (instructions: string) => void;
  setPendingFirstMessage: (message?: string) => void;
  addDraftAttachment: (attachment: ChatAttachment) => void;
  removeDraftAttachment: (url: string) => void;
  clearDraftAttachments: () => void;
};

export const useChatStore = create<ChatState>((set) => ({
  toolChoice: "auto",
  imageTool: "off",
  temporaryInstructions: "",
  draftAttachments: [],
  setSelectedModel: (selectedModel) => set({ selectedModel }),
  setToolChoice: (toolChoice) => set({ toolChoice }),
  setImageTool: (imageTool) => set({ imageTool }),
  setTemporaryInstructions: (temporaryInstructions) =>
    set({ temporaryInstructions }),
  setPendingFirstMessage: (pendingFirstMessage) => set({ pendingFirstMessage }),
  addDraftAttachment: (attachment) =>
    set((state) => ({
      draftAttachments: [...state.draftAttachments, attachment],
    })),
  removeDraftAttachment: (url) =>
    set((state) => ({
      draftAttachments: state.draftAttachments.filter(
        (attachment) => attachment.url !== url,
      ),
    })),
  clearDraftAttachments: () => set({ draftAttachments: [] }),
}));
