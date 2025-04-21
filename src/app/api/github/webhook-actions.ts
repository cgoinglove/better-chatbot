"use server";

import { createRepositoryWebhook, deleteRepositoryWebhook, listRepositoryWebhooks } from "lib/github/webhook-service";
import { getMockUserSession } from "lib/mock";
import logger from "logger";

export interface WebhookInfo {
  id: number;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
}

export async function createWebhookAction(
  owner: string,
  repo: string,
  webhookUrl: string
): Promise<{ success: boolean; message: string; webhook?: any }> {
  try {
    const user = getMockUserSession();
    if (!user) {
      return {
        success: false,
        message: "Unauthorized",
      };
    }
    
    const webhook = await createRepositoryWebhook(user.id, owner, repo, webhookUrl);
    
    return {
      success: true,
      message: "Webhook created successfully",
      webhook,
    };
  } catch (error: any) {
    logger.error("Error creating webhook:", error);
    return {
      success: false,
      message: error.message || "Failed to create webhook",
    };
  }
}

export async function listWebhooksAction(
  owner: string,
  repo: string
): Promise<WebhookInfo[]> {
  try {
    const user = getMockUserSession();
    if (!user) {
      return [];
    }
    
    const webhooks = await listRepositoryWebhooks(user.id, owner, repo);
    
    return webhooks.map(webhook => ({
      id: webhook.id,
      url: webhook.config.url,
      events: webhook.events,
      active: webhook.active,
      createdAt: webhook.created_at,
    }));
  } catch (error) {
    logger.error("Error listing webhooks:", error);
    return [];
  }
}

export async function deleteWebhookAction(
  owner: string,
  repo: string,
  hookId: number
): Promise<{ success: boolean; message: string }> {
  try {
    const user = getMockUserSession();
    if (!user) {
      return {
        success: false,
        message: "Unauthorized",
      };
    }
    
    const success = await deleteRepositoryWebhook(user.id, owner, repo, hookId);
    
    if (success) {
      return {
        success: true,
        message: "Webhook deleted successfully",
      };
    } else {
      return {
        success: false,
        message: "Failed to delete webhook",
      };
    }
  } catch (error: any) {
    logger.error("Error deleting webhook:", error);
    return {
      success: false,
      message: error.message || "Failed to delete webhook",
    };
  }
}
