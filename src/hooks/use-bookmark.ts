"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useSWRConfig } from "swr";

export interface BookmarkItem {
  id: string;
  isBookmarked?: boolean;
}

interface UseBookmarkOptions {
  onSuccess?: () => void;
  itemType?: "agent" | "workflow";
}

export function useBookmark(options: UseBookmarkOptions = {}) {
  const { onSuccess, itemType = "agent" } = options;
  const [loading, setLoading] = useState<string | null>(null);
  const t = useTranslations();
  const { mutate } = useSWRConfig();

  const toggleBookmark = async (item: BookmarkItem) => {
    const { id, isBookmarked = false } = item;

    if (loading === id) return;

    setLoading(id);

    try {
      // Use SWR's built-in optimistic updates
      await mutate(
        (key) => typeof key === "string" && key.startsWith(`/api/${itemType}`),
        async (cachedData: any) => {
          // Make the API call to the generic bookmark endpoint
          const response = await fetch(`/api/bookmark`, {
            method: isBookmarked ? "DELETE" : "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              itemId: id,
              itemType,
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to update bookmark");
          }

          // Return the updated data - SWR will handle optimistic updates automatically
          if (!cachedData) return cachedData;

          // Handle arrays of items (like /api/agent?filters=...)
          if (Array.isArray(cachedData)) {
            return cachedData.map((item: any) =>
              item.id === id ? { ...item, isBookmarked: !isBookmarked } : item,
            );
          }

          // Handle single item (like /api/agent/123)
          if (cachedData.id === id) {
            return { ...cachedData, isBookmarked: !isBookmarked };
          }

          return cachedData;
        },
        {
          optimisticData: (cachedData: any) => {
            if (!cachedData) return cachedData;

            // Handle arrays of items
            if (Array.isArray(cachedData)) {
              return cachedData.map((item: any) =>
                item.id === id
                  ? { ...item, isBookmarked: !isBookmarked }
                  : item,
              );
            }

            // Handle single item
            if (cachedData.id === id) {
              return { ...cachedData, isBookmarked: !isBookmarked };
            }

            return cachedData;
          },
          rollbackOnError: true,
          revalidate: false,
        },
      );

      // Success feedback
      const messageKey = isBookmarked
        ? `${itemType === "agent" ? "Agent" : "Workflow"}.bookmarkRemoved`
        : `${itemType === "agent" ? "Agent" : "Workflow"}.bookmarkAdded`;

      toast.success(t(messageKey));

      // Call success callback (typically to refresh data)
      if (onSuccess) {
        onSuccess();
      }

      return !isBookmarked; // Return new bookmark state
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      toast.error(t("Common.error"));
      throw error;
    } finally {
      setLoading(null);
    }
  };

  return {
    toggleBookmark,
    isLoading: (itemId: string) => loading === itemId,
  };
}
