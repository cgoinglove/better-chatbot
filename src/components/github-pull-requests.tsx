"use client";

import { formatDistanceToNow } from "date-fns";
import { githubApiRequest } from "lib/github/github-api-middleware";
import { getMockUserSession } from "lib/mock";
import {
  GitPullRequest,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "ui/badge";
import { Button } from "ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "ui/card";
import { Input } from "ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "ui/table";

interface GitHubPullRequestsProps {
  owner: string;
  repo: string;
}

interface PullRequest {
  id: number;
  number: number;
  title: string;
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
}

export function GitHubPullRequests({ owner, repo }: GitHubPullRequestsProps) {
  const params = useParams();
  const repositoryId = params.id as string;

  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [filteredPRs, setFilteredPRs] = useState<PullRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "closed">("open");

  const fetchPullRequests = async () => {
    setIsLoading(true);
    try {
      const user = getMockUserSession();
      if (!user) {
        toast.error("User not authenticated");
        return;
      }

      const prs = await githubApiRequest(
        user.id,
        `/repos/${owner}/${repo}/pulls?state=${filter}&sort=updated&direction=desc`,
      );

      // Fetch additional details for each PR
      const detailedPRs = await Promise.all(
        prs.map(async (pr: any) => {
          try {
            // Get PR details to check if it's merged
            const details = await githubApiRequest(
              user.id,
              `/repos/${owner}/${repo}/pulls/${pr.number}`,
            );

            return {
              ...pr,
              merged: details.merged,
            };
          } catch (error) {
            console.error(
              `Error fetching details for PR #${pr.number}:`,
              error,
            );
            return {
              ...pr,
              merged: false,
            };
          }
        }),
      );

      setPullRequests(detailedPRs);
      setFilteredPRs(detailedPRs);
    } catch (error) {
      console.error("Error fetching pull requests:", error);
      toast.error("Failed to fetch pull requests");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPullRequests();
  }, [owner, repo, filter]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredPRs(pullRequests);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredPRs(
        pullRequests.filter(
          (pr) =>
            pr.title.toLowerCase().includes(query) ||
            pr.user.login.toLowerCase().includes(query) ||
            pr.number.toString().includes(query),
        ),
      );
    }
  }, [searchQuery, pullRequests]);

  const getStateBadge = (pr: PullRequest) => {
    if (pr.state === "open") {
      if (pr.draft) {
        return (
          <Badge
            variant="outline"
            className="bg-gray-50 text-gray-700 border-gray-200"
          >
            Draft
          </Badge>
        );
      }
      return (
        <Badge
          variant="outline"
          className="bg-green-50 text-green-700 border-green-200"
        >
          Open
        </Badge>
      );
    } else if (pr.merged) {
      return (
        <Badge
          variant="outline"
          className="bg-purple-50 text-purple-700 border-purple-200"
        >
          Merged
        </Badge>
      );
    } else {
      return (
        <Badge
          variant="outline"
          className="bg-red-50 text-red-700 border-red-200"
        >
          Closed
        </Badge>
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <GitPullRequest className="mr-2 h-5 w-5" />
          Pull Requests
        </CardTitle>
        <CardDescription>
          View and manage pull requests for {owner}/{repo}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            <Button
              variant={filter === "open" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("open")}
            >
              Open
            </Button>
            <Button
              variant={filter === "closed" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("closed")}
            >
              Closed
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPullRequests}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            <span className="ml-2">Refresh</span>
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pull requests..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredPRs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery
              ? "No pull requests match your search"
              : `No ${filter} pull requests found`}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Comments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPRs.map((pr) => (
                  <TableRow key={pr.id}>
                    <TableCell>
                      <Link
                        href={`/github/repository/${repositoryId}/pull/${pr.number}`}
                        className="hover:underline font-medium"
                      >
                        #{pr.number} {pr.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <img
                          src={pr.user.avatar_url}
                          alt={pr.user.login}
                          className="h-6 w-6 rounded-full"
                        />
                        <span>{pr.user.login}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStateBadge(pr)}</TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(pr.updated_at), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <MessageSquare className="mr-1 h-4 w-4 text-muted-foreground" />
                        {pr.comments}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
