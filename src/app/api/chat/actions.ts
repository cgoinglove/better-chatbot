"use server";

import {
  generateObject,
  generateText,
  jsonSchema,
  LanguageModel,
  type Message,
} from "ai";

import {
  CREATE_THREAD_TITLE_PROMPT,
  generateExampleToolSchemaPrompt,
} from "lib/ai/prompts";

import type { ChatThread, Project } from "app-types/chat";

import { chatService, mcpService } from "lib/db/service";
import { customModelProvider } from "lib/ai/models";
import { toAny } from "lib/utils";
import {
  MCPServerBinding,
  MCPServerBindingConfig,
  MCPToolInfo,
} from "app-types/mcp";
import { serverCache } from "lib/cache";
import { CacheKeys } from "lib/cache/cache-keys";
import { auth } from "../auth/auth";

export async function getUserId() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("User not found");
  }
  return userId;
}

export async function generateTitleFromUserMessageAction({
  message,
  model,
}: { message: Message; model: LanguageModel }) {
  const { text: title } = await generateText({
    model,
    system: CREATE_THREAD_TITLE_PROMPT,
    prompt: JSON.stringify(message),
  });

  return title.trim();
}

export async function selectThreadWithMessagesAction(threadId: string) {
  const thread = await chatService.selectThread(threadId);
  if (!thread) {
    return null;
  }
  const messages = await chatService.selectMessagesByThreadId(threadId);
  return { ...thread, messages: messages ?? [] };
}

export async function deleteThreadAction(threadId: string) {
  await chatService.deleteThread(threadId);
}

export async function deleteMessagesByChatIdAfterTimestampAction(
  messageId: string,
) {
  await chatService.deleteMessagesByChatIdAfterTimestamp(messageId);
}

export async function selectThreadListByUserIdAction() {
  const userId = await getUserId();
  const threads = await chatService.selectThreadsByUserId(userId);
  return threads;
}

export async function updateThreadAction(
  id: string,
  thread: Partial<Omit<ChatThread, "createdAt" | "updatedAt" | "userId">>,
) {
  const userId = await getUserId();
  await chatService.updateThread(id, { ...thread, userId });
}

export async function deleteThreadsAction() {
  const userId = await getUserId();
  await chatService.deleteAllThreads(userId);
}

export async function generateExampleToolSchemaAction(options: {
  modelName: string;
  toolInfo: MCPToolInfo;
  prompt?: string;
}) {
  const model = customModelProvider.getModel(options.modelName);

  const schema = jsonSchema(
    toAny({
      ...options.toolInfo.inputSchema,
      properties: options.toolInfo.inputSchema?.properties ?? {},
      additionalProperties: false,
    }),
  );
  const { object } = await generateObject({
    model,
    schema,
    prompt: generateExampleToolSchemaPrompt({
      toolInfo: options.toolInfo,
      prompt: options.prompt,
    }),
  });

  return object;
}

export async function selectProjectListByUserIdAction() {
  const userId = await getUserId();
  const projects = await chatService.selectProjectsByUserId(userId);
  return projects;
}

export async function insertProjectAction({
  name,
  instructions,
}: {
  name: string;
  instructions?: Project["instructions"];
}) {
  const userId = await getUserId();
  const project = await chatService.insertProject({
    name,
    userId,
    instructions: instructions ?? {
      systemPrompt: "",
    },
  });
  return project;
}

export async function insertProjectWithThreadAction({
  name,
  instructions,
  threadId,
}: {
  name: string;
  instructions?: Project["instructions"];
  threadId: string;
}) {
  const userId = await getUserId();
  const project = await chatService.insertProject({
    name,
    userId,
    instructions: instructions ?? {
      systemPrompt: "",
    },
  });
  await chatService.updateThread(threadId, {
    projectId: project.id,
  });
  await serverCache.delete(CacheKeys.thread(threadId));
  return project;
}

export async function selectProjectByIdAction(id: string) {
  const project = await chatService.selectProjectById(id);
  return project;
}

export async function updateProjectAction(
  id: string,
  project: Partial<Pick<Project, "name" | "instructions">>,
) {
  const updatedProject = await chatService.updateProject(id, project);
  await serverCache.delete(CacheKeys.project(id));
  return updatedProject;
}

export async function deleteProjectAction(id: string) {
  await serverCache.delete(CacheKeys.project(id));
  await chatService.deleteProject(id);
}

export async function rememberProjectInstructionsAction(
  projectId: string,
): Promise<Project["instructions"] | null> {
  const key = CacheKeys.project(projectId);
  const cachedProject = await serverCache.get<Project>(key);
  if (cachedProject) {
    return cachedProject.instructions;
  }
  const project = await chatService.selectProjectById(projectId);
  if (!project) {
    return null;
  }
  await serverCache.set(key, project);
  return project.instructions;
}

export async function rememberThreadAction(threadId: string) {
  const key = CacheKeys.thread(threadId);
  const cachedThread = await serverCache.get<ChatThread>(key);
  if (cachedThread) {
    return cachedThread;
  }
  const thread = await chatService.selectThread(threadId);
  if (!thread) {
    return null;
  }
  await serverCache.set(key, thread);
  return thread;
}

export async function rememberMcpBindingAction(
  ownerId: string,
  ownerType: MCPServerBinding["ownerType"],
): Promise<MCPServerBindingConfig | null> {
  if (!ownerId || !ownerType) {
    return null;
  }
  const key = CacheKeys.mcpBinding(ownerId, ownerType);
  const cachedMcpBinding = await serverCache.get<MCPServerBindingConfig>(key);
  if (cachedMcpBinding) {
    return cachedMcpBinding;
  }
  const mcpBinding = await mcpService.selectMcpServerBinding(
    ownerId,
    ownerType,
  );
  await serverCache.set(key, mcpBinding?.config);
  return mcpBinding?.config ?? null;
}

export async function updateProjectNameAction(id: string, name: string) {
  const updatedProject = await chatService.updateProject(id, { name });
  await serverCache.delete(CacheKeys.project(id));
  return updatedProject;
}

export async function saveMcpServerBindingsAction(entity: MCPServerBinding) {
  await serverCache.delete(
    CacheKeys.mcpBinding(entity.ownerId, entity.ownerType),
  );
  await mcpService.saveMcpServerBinding(entity);
}
