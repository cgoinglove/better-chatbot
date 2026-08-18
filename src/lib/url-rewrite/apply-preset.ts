import { AppDefaultToolkit } from "lib/ai/tools";
import type { ChatMention } from "app-types/chat";
import type { ChatLinkPreset } from "app-types/url-rewrite";

type StatePatch = {
  chatModel?: ChatLinkPreset["chatModel"];
  toolChoice?: NonNullable<ChatLinkPreset["toolChoice"]>;
  allowedAppDefaultToolkit?: AppDefaultToolkit[];
  allowedMcpServers?: NonNullable<ChatLinkPreset["allowedMcpServers"]>;
  threadMentions?: Record<string, ChatMention[]>;
};

const isKnownToolkit = (value: string): value is AppDefaultToolkit =>
  Object.values(AppDefaultToolkit).includes(value as AppDefaultToolkit);

/**
 * Turns a link preset into a patch for the client `appStore`.
 *
 * A key that the link does not set is left out of the patch entirely, so the
 * visitor keeps their own value; a key the link *does* set always lands, even
 * when it is empty (an admin restricting a link to no tools at all).
 */
export function buildPresetStatePatch(
  preset: ChatLinkPreset,
  threadId: string,
  previousThreadMentions: Record<string, ChatMention[]> = {},
): StatePatch {
  const patch: StatePatch = {};

  if (preset.chatModel) patch.chatModel = preset.chatModel;
  if (preset.toolChoice) patch.toolChoice = preset.toolChoice;
  if (preset.allowedAppDefaultToolkit) {
    patch.allowedAppDefaultToolkit =
      preset.allowedAppDefaultToolkit.filter(isKnownToolkit);
  }
  if (preset.allowedMcpServers) {
    patch.allowedMcpServers = preset.allowedMcpServers;
  }
  if (preset.mentions?.length) {
    patch.threadMentions = {
      ...previousThreadMentions,
      [threadId]: preset.mentions,
    };
  }

  return patch;
}
