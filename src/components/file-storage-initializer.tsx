"use client";

import { appStore } from "@/app/store";
import { AppDefaultToolkit } from "@/lib/ai/tools";
import { useEffect } from "react";
import { useShallow } from "zustand/shallow";

/**
 * Initializes file-generator tool if file storage is configured.
 * This runs once on app mount and adds FileGenerator to the default toolkit.
 */
export function FileStorageInitializer() {
  const [allowedAppDefaultToolkit, appStoreMutate] = appStore(
    useShallow((state) => [state.allowedAppDefaultToolkit, state.mutate]),
  );

  useEffect(() => {
    // Only run once on mount
    const checkStorageAndInit = async () => {
      try {
        const response = await fetch("/api/storage/config");
        const data = await response.json();

        if (data.configured) {
          // Check if FileGenerator is already in the list
          const hasFileGenerator = allowedAppDefaultToolkit?.includes(
            AppDefaultToolkit.FileGenerator,
          );

          if (!hasFileGenerator) {
            // Add FileGenerator to the default toolkit
            appStoreMutate((prev) => ({
              allowedAppDefaultToolkit: [
                ...(prev.allowedAppDefaultToolkit || []),
                AppDefaultToolkit.FileGenerator,
              ],
            }));
          }
        }
      } catch (error) {
        console.error("Failed to check file storage config:", error);
      }
    };

    checkStorageAndInit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return null; // This component doesn't render anything
}
