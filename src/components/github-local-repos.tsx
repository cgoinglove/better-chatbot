"use client";

import { appStore } from "@/app/store";
import { LocalRepository } from "lib/github/local-repo-scanner";
import {
  Check,
  Clock,
  ExternalLink,
  Folder,
  GitBranch,
  Github,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "ui/badge";
import { Button } from "ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "ui/card";
import { Input } from "ui/input";
import { ScrollArea } from "ui/scroll-area";
import { Skeleton } from "ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "ui/tabs";
import { useShallow } from "zustand/shallow";

export function GitHubLocalRepos() {
  const [isLoading, setIsLoading] = useState(true);
  const [repositories, setRepositories] = useState<LocalRepository[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<LocalRepository[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "desktop" | "other">(
    "all",
  );
  const [addingRepo, setAddingRepo] = useState<string | null>(null);

  // Get managed repositories from app store
  const [appStoreMutate, managedRepos] = appStore(
    useShallow((state) => [state.mutate, state.githubRepositoryList]),
  );

  // Fetch local repositories
  const fetchLocalRepos = async (forceRescan = false) => {
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/github/local-repos${forceRescan ? "?force=true" : ""}`,
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to scan for local repositories");
      }

      const data = await response.json();

      if (data.success) {
        setRepositories(data.repositories);
        filterRepositories(data.repositories, searchQuery, activeTab);

        if (data.repositories.length === 0) {
          toast.info("No local GitHub repositories found");
        } else {
          toast.success(
            `Found ${data.repositories.length} local GitHub repositories`,
          );
        }
      } else {
        throw new Error(
          data.message || "Failed to scan for local repositories",
        );
      }
    } catch (error) {
      console.error("Error scanning for local repositories:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to scan for local repositories",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Filter repositories based on search query and active tab
  const filterRepositories = (
    repos: LocalRepository[],
    query: string,
    tab: "all" | "desktop" | "other",
  ) => {
    // Filter by tab
    let filtered = repos;
    if (tab === "desktop") {
      filtered = repos.filter((repo) => repo.isGitHubDesktop);
    } else if (tab === "other") {
      filtered = repos.filter((repo) => !repo.isGitHubDesktop);
    }

    // Filter by search query
    if (query) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(
        (repo) =>
          repo.name.toLowerCase().includes(lowerQuery) ||
          repo.path.toLowerCase().includes(lowerQuery) ||
          (repo.remote && repo.remote.toLowerCase().includes(lowerQuery)),
      );
    }

    setFilteredRepos(filtered);
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    filterRepositories(repositories, query, activeTab);
  };

  // Handle tab change
  const handleTabChange = (tab: "all" | "desktop" | "other") => {
    setActiveTab(tab);
    filterRepositories(repositories, searchQuery, tab);
  };

  // Open repository in file explorer
  const openInFileExplorer = (repoPath: string) => {
    // This will be handled by the server
    window.open(`file://${repoPath}`, "_blank");
  };

  // Add repository to managed repositories
  const addToManagedRepos = async (repo: LocalRepository) => {
    setAddingRepo(repo.path);

    try {
      const response = await fetch("/api/github/add-local-repo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: repo.name,
          repoPath: repo.path,
          remote: repo.remote,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to add repository");
      }

      const data = await response.json();

      if (data.success) {
        toast.success(`Added ${repo.name} to managed repositories`);

        // Update app store with new repository
        if (managedRepos) {
          appStoreMutate({
            githubRepositoryList: [...managedRepos, data.repository],
          });
        }
      } else {
        throw new Error(data.message || "Failed to add repository");
      }
    } catch (error) {
      console.error("Error adding repository:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add repository",
      );
    } finally {
      setAddingRepo(null);
    }
  };

  // Check if repository is already managed
  const isRepoManaged = (repoPath: string) => {
    return managedRepos?.some((repo) => repo.path === repoPath) || false;
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffDay > 30) {
        return date.toLocaleDateString();
      } else if (diffDay > 0) {
        return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
      } else if (diffHour > 0) {
        return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;
      } else if (diffMin > 0) {
        return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
      } else {
        return "just now";
      }
    } catch (error) {
      return "unknown";
    }
  };

  // Load repositories on component mount
  useEffect(() => {
    fetchLocalRepos();
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Folder className="mr-2 h-5 w-5" />
            Local GitHub Repositories
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLocalRepos(true)}
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Rescan</span>
          </Button>
        </CardTitle>
        <CardDescription>
          GitHub repositories found on your local system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="flex-1"
          />
        </div>

        <Tabs
          defaultValue="all"
          className="w-full"
          onValueChange={(value) =>
            handleTabChange(value as "all" | "desktop" | "other")
          }
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">
              All
              <Badge variant="outline" className="ml-2">
                {repositories.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="desktop">
              GitHub Desktop
              <Badge variant="outline" className="ml-2">
                {repositories.filter((repo) => repo.isGitHubDesktop).length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="other">
              Other
              <Badge variant="outline" className="ml-2">
                {repositories.filter((repo) => !repo.isGitHubDesktop).length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            {renderRepositoryList(filteredRepos, isLoading)}
          </TabsContent>
          <TabsContent value="desktop" className="mt-4">
            {renderRepositoryList(filteredRepos, isLoading)}
          </TabsContent>
          <TabsContent value="other" className="mt-4">
            {renderRepositoryList(filteredRepos, isLoading)}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        {isLoading
          ? "Scanning for repositories..."
          : `Found ${repositories.length} repositories (${
              repositories.filter((repo) => repo.isGitHubDesktop).length
            } from GitHub Desktop)`}
      </CardFooter>
    </Card>
  );

  // Helper function to render repository list
  function renderRepositoryList(repos: LocalRepository[], loading: boolean) {
    if (loading) {
      return (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-5 w-1/3 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <div className="flex space-x-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </Card>
          ))}
        </div>
      );
    }

    if (repos.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No repositories found
        </div>
      );
    }

    return (
      <ScrollArea className="h-[400px]">
        <div className="space-y-2 pr-4">
          {repos.map((repo) => (
            <Card
              key={repo.path}
              className="p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium flex items-center">
                    <Github className="h-4 w-4 mr-2" />
                    {repo.name}
                    {repo.isGitHubDesktop && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        GitHub Desktop
                      </Badge>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 truncate max-w-md">
                    {repo.path}
                  </p>
                  <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                    {repo.branch && (
                      <div className="flex items-center">
                        <GitBranch className="h-3 w-3 mr-1" />
                        {repo.branch}
                      </div>
                    )}
                    {repo.lastCommit && (
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatRelativeTime(repo.lastCommit.date)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openInFileExplorer(repo.path)}
                    title="Open in File Explorer"
                  >
                    <Folder className="h-4 w-4" />
                  </Button>
                  {repo.remote && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(repo.remote, "_blank")}
                      title="Open on GitHub"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  {isRepoManaged(repo.path) ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      title="Already managed"
                    >
                      <Check className="h-4 w-4 text-green-500" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addToManagedRepos(repo)}
                      disabled={addingRepo === repo.path}
                      title="Add to managed repositories"
                    >
                      {addingRepo === repo.path ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    );
  }
}
