"use server";

import { Canvas, CanvasUpdate } from "app-types/canvas";
import { canvasService } from "lib/db/canvas-service";
import { getMockUserSession } from "lib/mock";

export async function insertCanvasAction({
  title,
  content,
  id,
}: {
  title: string;
  content: string;
  id?: string;
}): Promise<Canvas> {
  const userId = getMockUserSession().id;
  return canvasService.insertCanvas({
    title,
    content,
    userId,
    id,
  });
}

export async function updateCanvasAction(
  id: string,
  updates: CanvasUpdate
): Promise<Canvas> {
  return canvasService.updateCanvas(id, updates);
}

export async function deleteCanvasAction(id: string): Promise<void> {
  return canvasService.deleteCanvas(id);
}

export async function selectCanvasAction(id: string): Promise<Canvas | null> {
  return canvasService.selectCanvas(id);
}

export async function selectCanvasesByUserIdAction(): Promise<Canvas[]> {
  const userId = getMockUserSession().id;
  return canvasService.selectCanvasesByUserId(userId);
}
