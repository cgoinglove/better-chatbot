"use client";

import { selectRepositoriesByUserIdAction } from "@/app/api/github/actions";
import { appStore } from "@/app/store";
import { Github } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui/select";
import { useShallow } from "zustand/shallow";

export function GitHubRepositorySelector() {
  const [isLoading, setIsLoading] = useState(true);

  const [appStoreMutate, repositoryList, currentRepositoryId] = appStore(
    useShallow((state) => [
      state.mutate,
      state.githubRepositoryList,
      state.currentGithubRepositoryId,
    ]),
  );

  useEffect(() => {
    const fetchRepositories = async () => {
      if (repositoryList === null) {
        setIsLoading(true);
        try {
          const repositories = await selectRepositoriesByUserIdAction();
          appStoreMutate({ githubRepositoryList: repositories });
        } catch (error) {
          console.error("Error fetching repositories:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    fetchRepositories();
  }, [appStoreMutate, repositoryList]);

  const handleRepositoryChange = (repositoryId: string) => {
    appStoreMutate({ currentGithubRepositoryId: repositoryId });
  };

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Github className="mr-2 h-4 w-4" />
        Loading repositories...
      </Button>
    );
  }

  if (!repositoryList || repositoryList.length === 0) {
    return null;
  }

  const activeRepositories = repositoryList.filter((repo) => repo.isEnabled);

  if (activeRepositories.length === 0) {
    return null;
  }

  return (
    <Select
      value={currentRepositoryId || ""}
      onValueChange={handleRepositoryChange}
    >
      <SelectTrigger className="w-[200px]">
        <Github className="mr-2 h-4 w-4" />
        <SelectValue placeholder="Select repository" />
      </SelectTrigger>
      <SelectContent>
        {activeRepositories.map((repository) => (
          <SelectItem key={repository.id} value={repository.id}>
            {repository.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
