"use client";

import {
  GitHubRemoteRepository,
  getRemoteRepositoriesAction,
} from "@/app/api/github/account-actions";
import { formatDistanceToNow } from "date-fns";
import { Download, GitFork, Loader2, Search, Star } from "lucide-react";
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
import { GitHubCloneDialog } from "./github-clone-dialog";

export function GitHubRemoteRepositories() {
  const [repositories, setRepositories] = useState<GitHubRemoteRepository[]>(
    [],
  );
  const [filteredRepositories, setFilteredRepositories] = useState<
    GitHubRemoteRepository[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRepo, setSelectedRepo] =
    useState<GitHubRemoteRepository | null>(null);
  const [showCloneDialog, setShowCloneDialog] = useState(false);

  useEffect(() => {
    const fetchRepositories = async () => {
      setIsLoading(true);
      try {
        const repos = await getRemoteRepositoriesAction();
        setRepositories(repos);
        setFilteredRepositories(repos);
      } catch (error) {
        console.error("Error fetching repositories:", error);
        toast.error("Failed to fetch repositories");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRepositories();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredRepositories(repositories);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredRepositories(
        repositories.filter(
          (repo) =>
            repo.name.toLowerCase().includes(query) ||
            repo.description?.toLowerCase().includes(query) ||
            repo.language?.toLowerCase().includes(query),
        ),
      );
    }
  }, [searchQuery, repositories]);

  const handleCloneClick = (repository: GitHubRemoteRepository) => {
    setSelectedRepo(repository);
    setShowCloneDialog(true);
  };

  const handleCloneSuccess = () => {
    toast.success(`Repository ${selectedRepo?.name} cloned successfully`);
    // Optionally refresh the repository list
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Remote Repositories</CardTitle>
        <CardDescription>
          Your GitHub repositories that can be cloned and indexed
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search repositories..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredRepositories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery
              ? "No repositories match your search"
              : "No repositories found in your GitHub account"}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Repository</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Stats</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRepositories.map((repo) => (
                  <TableRow key={repo.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{repo.name}</div>
                        {repo.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {repo.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {repo.language ? (
                        <Badge variant="outline">{repo.language}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <div className="flex items-center">
                          <Star className="mr-1 h-3 w-3" />
                          {repo.stargazers_count}
                        </div>
                        <div className="flex items-center">
                          <GitFork className="mr-1 h-3 w-3" />
                          {repo.forks_count}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(repo.updated_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => handleCloneClick(repo)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Clone Dialog */}
      {selectedRepo && (
        <GitHubCloneDialog
          repository={selectedRepo}
          open={showCloneDialog}
          onOpenChange={setShowCloneDialog}
          onSuccess={handleCloneSuccess}
        />
      )}
    </Card>
  );
}
