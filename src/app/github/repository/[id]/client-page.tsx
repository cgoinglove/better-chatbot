"use client";

import { indexRepositoryAction } from "@/app/api/github/actions";
import { GitHubBranchSelector } from "@/components/github-branch-selector";
import { GitHubCommitHistory } from "@/components/github-commit-history";
import { GitHubPullRequests } from "@/components/github-pull-requests";
import { GitHubWebhooks } from "@/components/github-webhooks";
import { GitHubRepository } from "app-types/github";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Loader2,
  RefreshCw,
  Webhook,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "ui/badge";
import { Button } from "ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "ui/tabs";

interface GitHubRepositoryDetailProps {
  repository: GitHubRepository;
}

export function GitHubRepositoryDetail({
  repository,
}: GitHubRepositoryDetailProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isIndexing, setIsIndexing] = useState(false);
  const [currentBranch, setCurrentBranch] = useState<string>("");

  const handleIndex = async () => {
    setIsIndexing(true);

    try {
      const result = await indexRepositoryAction(repository.id);

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Error indexing repository:", error);
      toast.error("An error occurred while indexing the repository");
    } finally {
      setIsIndexing(false);
    }
  };

  // Extract owner and repo from repository name or path
  const getOwnerAndRepo = () => {
    // Try to extract from name first (if it's in the format "owner/repo")
    if (repository.name.includes("/")) {
      return repository.name.split("/");
    }

    // Try to extract from path
    const pathParts = repository.path.split(/[\\/]/);
    const repoName = pathParts[pathParts.length - 1];
    const ownerName = pathParts[pathParts.length - 2] || "unknown";

    return [ownerName, repoName];
  };

  const [owner, repo] = getOwnerAndRepo();

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/github">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {repository.name}
          </h1>
          <p className="text-muted-foreground">
            {repository.description || "No description provided"}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="branches">
            <GitBranch className="mr-2 h-4 w-4" />
            Branches
          </TabsTrigger>
          <TabsTrigger value="commits">
            <GitCommit className="mr-2 h-4 w-4" />
            Commits
          </TabsTrigger>
          <TabsTrigger value="pull-requests">
            <GitPullRequest className="mr-2 h-4 w-4" />
            Pull Requests
          </TabsTrigger>
          <TabsTrigger value="webhooks">
            <Webhook className="mr-2 h-4 w-4" />
            Webhooks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Repository Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Path
                  </h3>
                  <p className="font-mono text-sm">{repository.path}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Status
                  </h3>
                  <div>
                    {repository.isEnabled ? (
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200"
                      >
                        Active
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-gray-50 text-gray-700 border-gray-200"
                      >
                        Disabled
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Last Indexed
                  </h3>
                  <p>
                    {repository.lastIndexed ? (
                      formatDistanceToNow(new Date(repository.lastIndexed), {
                        addSuffix: true,
                      })
                    ) : (
                      <span className="text-muted-foreground">Never</span>
                    )}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Current Branch
                  </h3>
                  <p>{currentBranch || "Unknown"}</p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleIndex} disabled={isIndexing}>
                  {isIndexing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Indexing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Index Repository
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branches" className="mt-6">
          <GitHubBranchSelector
            repositoryPath={repository.path}
            repositoryName={repository.name}
            onBranchChange={setCurrentBranch}
          />
        </TabsContent>

        <TabsContent value="commits" className="mt-6">
          <GitHubCommitHistory
            owner={owner}
            repo={repo}
            branch={currentBranch}
          />
        </TabsContent>

        <TabsContent value="pull-requests" className="mt-6">
          <GitHubPullRequests owner={owner} repo={repo} />
        </TabsContent>

        <TabsContent value="webhooks" className="mt-6">
          <GitHubWebhooks owner={owner} repo={repo} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
