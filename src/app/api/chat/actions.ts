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

import { chatService } from "lib/db/chat-service";
import { customModelProvider } from "lib/ai/models";
import { toAny } from "lib/utils";
import { MCPToolInfo } from "app-types/mcp";
import { serverCache } from "lib/cache";
import { CacheKeys } from "lib/cache/cache-keys";
import { auth } from "../auth/auth";

const {
  deleteThread,
  deleteMessagesByChatIdAfterTimestamp,
  selectMessagesByThreadId,
  selectThread,
  selectThreadsByUserId,
  updateThread,
  deleteAllThreads,
  selectProjectsByUserId,
  insertProject,
  selectProjectById,
  updateProject,
  deleteProject,
} = chatService;

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
  const thread = await selectThread(threadId);
  if (!thread) {
    return null;
  }
  const messages = await selectMessagesByThreadId(threadId);
  return { ...thread, messages: messages ?? [] };
}

export async function deleteThreadAction(threadId: string) {
  await deleteThread(threadId);
}

export async function deleteMessagesByChatIdAfterTimestampAction(
  messageId: string,
) {
  await deleteMessagesByChatIdAfterTimestamp(messageId);
}

export async function selectThreadListByUserIdAction() {
  const userId = await getUserId();
  const threads = await selectThreadsByUserId(userId);
  return threads;
}

export async function updateThreadAction(
  id: string,
  thread: Partial<Omit<ChatThread, "createdAt" | "updatedAt" | "userId">>,
) {
  const userId = await getUserId();
  await updateThread(id, { ...thread, userId });
}

export async function deleteThreadsAction() {
  const userId = await getUserId();
  await deleteAllThreads(userId);
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
  const projects = await selectProjectsByUserId(userId);
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
  const project = await insertProject({
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
  const project = await insertProject({
    name,
    userId,
    instructions: instructions ?? {
      systemPrompt: "",
    },
  });
  await updateThread(threadId, {
    projectId: project.id,
  });
  await serverCache.delete(CacheKeys.thread(threadId));
  return project;
}

export async function selectProjectByIdAction(id: string) {
  const project = await selectProjectById(id);
  return project;
}

export async function updateProjectAction(
  id: string,
  project: Partial<Pick<Project, "name" | "instructions">>,
) {
  const updatedProject = await updateProject(id, project);
  await serverCache.delete(CacheKeys.project(id));
  return updatedProject;
}

export async function deleteProjectAction(id: string) {
  await serverCache.delete(CacheKeys.project(id));
  await deleteProject(id);
}

export async function rememberProjectInstructionsAction(
  projectId: string,
): Promise<Project["instructions"] | null> {
  const key = CacheKeys.project(projectId);
  const cachedProject = await serverCache.get<Project>(key);
  if (cachedProject) {
    return cachedProject.instructions;
  }
  const project = await selectProjectById(projectId);
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
  const thread = await selectThread(threadId);
  if (!thread) {
    return null;
  }
  await serverCache.set(key, thread);
  return thread;
}

export async function updateProjectNameAction(id: string, name: string) {
  const updatedProject = await updateProject(id, { name });
  await serverCache.delete(CacheKeys.project(id));
  return updatedProject;
}
