import type {
  Plugin,
  UserPlugin,
  PluginWithUserState,
  PluginCommand,
} from "app-types/plugin";

export function mergePluginWithUserState(
  plugin: Plugin,
  userPlugin: UserPlugin | null,
): PluginWithUserState {
  return {
    ...plugin,
    userState: userPlugin
      ? {
          enabled: userPlugin.enabled,
          isPinned: userPlugin.isPinned,
          customSystemPrompt: userPlugin.customSystemPrompt,
        }
      : null,
  };
}

export function dedupePluginsById(
  plugins: PluginWithUserState[],
): PluginWithUserState[] {
  const seen = new Set<string>();
  return plugins.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

export function buildPluginsSystemPrompt(
  plugins: PluginWithUserState[],
): string {
  if (plugins.length === 0) return "";
  const blocks = plugins
    .map((p) => {
      const content = p.userState?.customSystemPrompt ?? p.systemPromptAddition;
      return `<plugin name="${p.name}">\n${content}\n</plugin>`;
    })
    .join("\n");
  return `<active_plugins>\n${blocks}\n</active_plugins>`;
}

export function findCommandBySlug(
  slug: string,
  plugins: PluginWithUserState[],
): PluginCommand | null {
  for (const plugin of plugins) {
    const command = plugin.commands.find((c) => c.slug === slug);
    if (command) return command;
  }
  return null;
}
