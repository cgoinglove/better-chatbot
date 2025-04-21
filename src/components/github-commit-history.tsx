"use client";

import { useEffect, useState } from "react";
import { Button } from "ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "ui/card";
import { Input } from "ui/input";
import { Loader2, Search, RefreshCw, GitCommit, FileCode } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { githubApiRequest } from "lib/github/github-api-middleware";
import { getMockUserSession } from "lib/mock";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "ui/dialog";
import { ScrollArea } from "ui/scroll-area";
import { Badge } from "ui/badge";

interface GitHubCommitHistoryProps {
  owner: string;
  repo: string;
  branch?: string;
}

interface Commit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  author: {
    login: string;
    avatar_url: string;
  } | null;
  html_url: string;
}

interface CommitDetail {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  author: {
    login: string;
    avatar_url: string;
  } | null;
  files: {
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
  }[];
  stats: {
    additions: number;
    deletions: number;
    total: number;
  };
}

export function GitHubCommitHistory({ owner, repo, branch }: GitHubCommitHistoryProps) {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [filteredCommits, setFilteredCommits] = useState<Commit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCommit, setSelectedCommit] = useState<CommitDetail | null>(null);
  const [isLoadingCommit, setIsLoadingCommit] = useState(false);
  
  const fetchCommits = async () => {
    setIsLoading(true);
    try {
      const user = getMockUserSession();
      if (!user) {
        toast.error("User not authenticated");
        return;
      }
      
      const queryParams = branch ? `?sha=${branch}` : '';
      const commitList = await githubApiRequest(
        user.id,
        `/repos/${owner}/${repo}/commits${queryParams}`
      );
      
      setCommits(commitList);
      setFilteredCommits(commitList);
    } catch (error) {
      console.error("Error fetching commits:", error);
      toast.error("Failed to fetch commits");
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchCommits();
  }, [owner, repo, branch]);
  
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCommits(commits);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredCommits(
        commits.filter(
          (commit) =>
            commit.commit.message.toLowerCase().includes(query) ||
            commit.commit.author.name.toLowerCase().includes(query) ||
            commit.commit.author.email.toLowerCase().includes(query) ||
            commit.sha.includes(query)
        )
      );
    }
  }, [searchQuery, commits]);
  
  const handleViewCommit = async (sha: string) => {
    setIsLoadingCommit(true);
    try {
      const user = getMockUserSession();
      if (!user) {
        toast.error("User not authenticated");
        return;
      }
      
      const commitDetail = await githubApiRequest(
        user.id,
        `/repos/${owner}/${repo}/commits/${sha}`
      );
      
      setSelectedCommit(commitDetail);
    } catch (error) {
      console.error("Error fetching commit details:", error);
      toast.error("Failed to fetch commit details");
    } finally {
      setIsLoadingCommit(false);
    }
  };
  
  const getShortSha = (sha: string) => sha.substring(0, 7);
  
  const getCommitTitle = (message: string) => {
    const lines = message.split('\n');
    return lines[0];
  };
  
  const getCommitBody = (message: string) => {
    const lines = message.split('\n');
    if (lines.length <= 1) return '';
    return lines.slice(1).join('\n').trim();
  };
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <GitCommit className="mr-2 h-5 w-5" />
            Commit History
          </CardTitle>
          <CardDescription>
            View commits for {branch ? `branch ${branch} in ` : ''}{owner}/{repo}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search commits..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCommits}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="ml-2">Refresh</span>
            </Button>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCommits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery
                ? "No commits match your search"
                : "No commits found"}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Commit</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCommits.map((commit) => (
                    <TableRow key={commit.sha}>
                      <TableCell>
                        <div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {getShortSha(commit.sha)}
                          </div>
                          <div className="font-medium">
                            {getCommitTitle(commit.commit.message)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={commit.author?.avatar_url} alt={commit.commit.author.name} />
                            <AvatarFallback>{commit.commit.author.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span>{commit.author?.login || commit.commit.author.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(commit.commit.author.date), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewCommit(commit.sha)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Commit Detail Dialog */}
      <Dialog open={!!selectedCommit} onOpenChange={(open) => !open && setSelectedCommit(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <GitCommit className="h-5 w-5" />
              <span>Commit {selectedCommit && getShortSha(selectedCommit.sha)}</span>
            </DialogTitle>
            <DialogDescription>
              {selectedCommit?.commit.author.name} committed {selectedCommit?.commit.author.date && formatDistanceToNow(new Date(selectedCommit.commit.author.date), { addSuffix: true })}
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingCommit ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedCommit && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="p-4 border-b">
                <h3 className="text-lg font-medium">{getCommitTitle(selectedCommit.commit.message)}</h3>
                {getCommitBody(selectedCommit.commit.message) && (
                  <p className="mt-2 text-sm whitespace-pre-wrap">
                    {getCommitBody(selectedCommit.commit.message)}
                  </p>
                )}
              </div>
              
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Changes</h4>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      +{selectedCommit.stats.additions}
                    </Badge>
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      -{selectedCommit.stats.deletions}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {selectedCommit.files.map((file) => (
                    <div key={file.filename} className="border rounded-md p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileCode className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm truncate">{file.filename}</span>
                        </div>
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
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
