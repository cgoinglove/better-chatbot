"use client";

import { GitHubRepository } from "app-types/github";
import { useState, useEffect } from "react";
import { Button } from "ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "ui/card";
import { Loader2, ArrowLeft, GitPullRequest, FileCode, MessageSquare, GitCommit } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "ui/tabs";
import { GitHubCodeReview } from "@/components/github-code-review";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "ui/badge";
import { githubApiRequest } from "lib/github/github-api-middleware";
import { getMockUserSession } from "lib/mock";
import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import { Separator } from "ui/separator";

interface PullRequestDetailProps {
  repository: GitHubRepository;
  pullNumber: number;
}

interface PullRequest {
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  html_url: string;
  comments: number;
  draft: boolean;
  merged: boolean;
  mergeable: boolean;
  mergeable_state: string;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  changed_files: number;
  additions: number;
  deletions: number;
}

interface FileChange {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export function PullRequestDetail({ repository, pullNumber }: PullRequestDetailProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [pullRequest, setPullRequest] = useState<PullRequest | null>(null);
  const [fileChanges, setFileChanges] = useState<FileChange[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Extract owner and repo from repository name or path
  const getOwnerAndRepo = () => {
    // Try to extract from name first (if it's in the format "owner/repo")
    if (repository.name.includes('/')) {
      return repository.name.split('/');
    }
    
    // Try to extract from path
    const pathParts = repository.path.split(/[\\/]/);
    const repoName = pathParts[pathParts.length - 1];
    const ownerName = pathParts[pathParts.length - 2] || 'unknown';
    
    return [ownerName, repoName];
  };
  
  const [owner, repo] = getOwnerAndRepo();
  
  const fetchPullRequestDetails = async () => {
    setIsLoading(true);
    try {
      const user = getMockUserSession();
      if (!user) {
        toast.error("User not authenticated");
        return;
      }
      
      // Fetch pull request details
      const pr = await githubApiRequest(
        user.id,
        `/repos/${owner}/${repo}/pulls/${pullNumber}`
      );
      
      // Fetch file changes
      const files = await githubApiRequest(
        user.id,
        `/repos/${owner}/${repo}/pulls/${pullNumber}/files`
      );
      
      setPullRequest(pr);
      setFileChanges(files);
    } catch (error) {
      console.error("Error fetching pull request details:", error);
      toast.error("Failed to fetch pull request details");
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchPullRequestDetails();
  }, [owner, repo, pullNumber]);
  
  const getStateBadge = () => {
    if (!pullRequest) return null;
    
    if (pullRequest.state === "open") {
      if (pullRequest.draft) {
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            Draft
          </Badge>
        );
      }
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Open
        </Badge>
      );
    } else if (pullRequest.merged) {
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          Merged
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          Closed
        </Badge>
      );
    }
  };
  
  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={`/github/repository/${repository.id}`}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          {isLoading ? (
            <div className="h-8 w-64 bg-muted animate-pulse rounded"></div>
          ) : (
            <>
              <div className="flex items-center space-x-2">
                <GitPullRequest className="h-5 w-5" />
                <h1 className="text-2xl font-bold tracking-tight">
                  #{pullRequest?.number} {pullRequest?.title}
                </h1>
                {getStateBadge()}
              </div>
              <p className="text-muted-foreground">
                {pullRequest?.user.login} opened this pull request{" "}
                {pullRequest?.created_at && formatDistanceToNow(new Date(pullRequest.created_at), { addSuffix: true })}
              </p>
            </>
          )}
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="files">
              <FileCode className="mr-2 h-4 w-4" />
              Files Changed ({fileChanges.length})
            </TabsTrigger>
            <TabsTrigger value="discussion">
              <MessageSquare className="mr-2 h-4 w-4" />
              Discussion
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pull Request Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={pullRequest?.user.avatar_url} alt={pullRequest?.user.login} />
                    <AvatarFallback>{pullRequest?.user.login.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium">{pullRequest?.user.login}</div>
                    <div className="mt-2 text-sm whitespace-pre-wrap">
                      {pullRequest?.body || "No description provided"}
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Branches</h3>
                    <div className="mt-1">
                      <div className="flex items-center space-x-2">
                        <GitCommit className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-sm">
                          {pullRequest?.base.ref} ← {pullRequest?.head.ref}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Changes</h3>
                    <div className="mt-1 text-sm">
                      <span className="text-green-600">+{pullRequest?.additions}</span>{" "}
                      <span className="text-red-600">-{pullRequest?.deletions}</span>{" "}
                      in {pullRequest?.changed_files} files
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button asChild>
                    <Link href={pullRequest?.html_url || "#"} target="_blank" rel="noopener noreferrer">
                      View on GitHub
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="files" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Files Changed</CardTitle>
                <CardDescription>
                  {fileChanges.length} files with {pullRequest?.additions} additions and {pullRequest?.deletions} deletions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {fileChanges.map((file) => (
                    <div key={file.filename} className="border rounded-md p-4">
                      <div className="flex items-center justify-between">
                        <div className="font-mono text-sm truncate">{file.filename}</div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            +{file.additions}
                          </Badge>
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            -{file.deletions}
                          </Badge>
                        </div>
                      </div>
                      {file.patch && (
                        <div className="mt-2 bg-muted p-2 rounded-md overflow-x-auto">
                          <pre className="text-xs font-mono whitespace-pre-wrap">{file.patch}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="discussion" className="mt-6">
            <GitHubCodeReview
              owner={owner}
              repo={repo}
              pullNumber={pullNumber}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
