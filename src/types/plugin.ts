// src/types/plugin.ts
export type PluginCategory =
  | "productivity"
  | "research"
  | "legal"
  | "sales"
  | "hr"
  | "custom";

export interface PluginSkill {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  prompt: string;
  category: string;
  tags: string[];
}

export interface PluginCommand {
  id: string;
  slug: string;
  name: string;
  description: string;
  prompt: string;
}

export interface Plugin {
  id: string;
  tenantId: string | null;
  userId: string | null;
  name: string;
  description: string;
  category: PluginCategory;
  icon: string;
  color: string;
  systemPromptAddition: string;
  skills: PluginSkill[];
  commands: PluginCommand[];
  isBuiltIn: boolean;
  isPublic: boolean;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPlugin {
  id: string;
  userId: string;
  pluginId: string;
  enabled: boolean;
  isPinned: boolean;
  customSystemPrompt: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PluginWithUserState extends Plugin {
  userState: {
    enabled: boolean;
    isPinned: boolean;
    customSystemPrompt: string | null;
  } | null;
}

export interface PluginRepository {
  listPluginsForUser(
    userId: string,
    tenantId: string,
  ): Promise<PluginWithUserState[]>;
  listEnabledPluginsForUser(
    userId: string,
    tenantId: string,
  ): Promise<PluginWithUserState[]>;
  getPluginById(
    id: string,
    userId: string,
  ): Promise<PluginWithUserState | null>;
  insertPlugin(data: InsertPlugin): Promise<Plugin>;
  updatePlugin(id: string, data: Partial<InsertPlugin>): Promise<Plugin>;
  deletePlugin(id: string): Promise<void>;
  enablePlugin(userId: string, pluginId: string): Promise<UserPlugin>;
  disablePlugin(userId: string, pluginId: string): Promise<void>;
  upsertUserPlugin(data: {
    userId: string;
    pluginId: string;
    enabled?: boolean;
    isPinned?: boolean;
    customSystemPrompt?: string | null;
  }): Promise<UserPlugin>;
  seedPlugins(plugins: InsertPlugin[]): Promise<Plugin[]>;
}

export type InsertPlugin = Omit<Plugin, "id" | "createdAt" | "updatedAt">;
