"use client";
import type { Project } from "app-types/project";
import useSWR, { SWRConfiguration } from "swr";
import { handleErrorWithToast } from "ui/shared-toast";
import { fetcher } from "lib/utils";

interface UseProjectOptions extends SWRConfiguration {
  enabled?: boolean;
}

export function useProject(
  projectId: string | null | undefined,
  options: UseProjectOptions = {},
) {
  const { enabled = true, ...swrOptions } = options;

  const {
    data: project,
    error,
    isLoading,
    mutate,
  } = useSWR<Project>(
    projectId && enabled ? `/api/projects/${projectId}` : null,
    fetcher,
    {
      errorRetryCount: 0,
      revalidateOnFocus: false,
      onError: handleErrorWithToast,
      ...swrOptions,
    },
  );

  return {
    project,
    isLoading,
    error,
    mutate,
  };
}
