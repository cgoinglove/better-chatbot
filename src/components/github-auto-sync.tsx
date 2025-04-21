"use client";

import { useEffect, useState } from "react";
import { Button } from "ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "ui/card";
import { RefreshCw, Check, AlertTriangle, GitFork } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "ui/progress";
import { Badge } from "ui/badge";
import { Checkbox } from "ui/checkbox";
import { Label } from "ui/label";
import { Separator } from "ui/separator";
import { ScrollArea } from "ui/scroll-area";

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  private: boolean;
  html_url: string;
  updated_at: string;
  language: string;
  default_branch: string;
  selected?: boolean;
  syncing?: boolean;
  synced?: boolean;
  error?: string;
}

export function GitHubAutoSync() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectAll, setSelectAll] = useState(false);
  
  // Fetch repositories
  useEffect(() => {
    const fetchRepositories = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/github/repositories");
        
        if (!response.ok) {
          throw new Error("Failed to fetch repositories");
        }
        
        const data = await response.json();
        setRepositories(data.map((repo: Repository) => ({ ...repo, selected: false })));
      } catch (error) {
        console.error("Error fetching repositories:", error);
        toast.error("Failed to fetch repositories");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRepositories();
  }, []);
  
  // Handle select all
  useEffect(() => {
    if (selectAll) {
      setRepositories(repositories.map(repo => ({ ...repo, selected: true })));
    } else {
      setRepositories(repositories.map(repo => ({ ...repo, selected: false })));
    }
  }, [selectAll]);
  
  // Handle repository selection
  const handleSelectRepository = (id: number, selected: boolean) => {
    setRepositories(repositories.map(repo => 
      repo.id === id ? { ...repo, selected } : repo
    ));
    
    // Update selectAll state based on all repositories being selected
    const allSelected = repositories.every(repo => 
      (repo.id === id ? selected : repo.selected)
    );
    setSelectAll(allSelected);
  };
  
  // Sync selected repositories
  const handleSync = async () => {
    const selectedRepos = repositories.filter(repo => repo.selected);
    
    if (selectedRepos.length === 0) {
      toast.error("Please select at least one repository to sync");
      return;
    }
    
    setIsSyncing(true);
    setProgress(0);
    
    // Mark selected repositories as syncing
    setRepositories(repositories.map(repo => 
      repo.selected ? { ...repo, syncing: true, synced: false, error: undefined } : repo
    ));
    
    // Sync repositories one by one
    for (let i = 0; i < selectedRepos.length; i++) {
      const repo = selectedRepos[i];
      
      try {
        // Update progress
        setProgress(Math.round((i / selectedRepos.length) * 100));
        
        // Sync repository
        const response = await fetch("/api/github/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            repository: repo.full_name,
          }),
        });
        
        if (!response.ok) {
          const error = await response.text();
          throw new Error(error || "Failed to sync repository");
        }
        
        // Mark repository as synced
        setRepositories(prevRepos => prevRepos.map(r => 
          r.id === repo.id ? { ...r, syncing: false, synced: true } : r
        ));
        
        toast.success(`Repository ${repo.full_name} synced successfully`);
      } catch (error) {
        console.error(`Error syncing repository ${repo.full_name}:`, error);
        
        // Mark repository as failed
        setRepositories(prevRepos => prevRepos.map(r => 
          r.id === repo.id ? { 
            ...r, 
            syncing: false, 
            error: error instanceof Error ? error.message : "Failed to sync repository" 
          } : r
        ));
        
        toast.error(`Failed to sync repository ${repo.full_name}`);
      }
    }
    
    // Update progress to 100%
    setProgress(100);
    
    // Reset syncing state after a delay
    setTimeout(() => {
      setIsSyncing(false);
    }, 1000);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <GitFork className="mr-2 h-5 w-5" />
          Auto-Sync GitHub Repositories
        </CardTitle>
        <CardDescription>
          Automatically find and sync your GitHub repositories
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : repositories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No repositories found in your GitHub account
          </div>
        ) : (
          <>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="selectAll" 
                checked={selectAll}
                onCheckedChange={(checked) => setSelectAll(checked === true)}
              />
              <Label htmlFor="selectAll">Select All Repositories</Label>
            </div>
            
            <Separator />
            
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                {repositories.map((repo) => (
                  <div key={repo.id} className="flex items-start space-x-3 py-2">
                    <Checkbox 
                      id={`repo-${repo.id}`} 
                      checked={repo.selected}
                      onCheckedChange={(checked) => handleSelectRepository(repo.id, checked === true)}
                      disabled={isSyncing}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <Label 
                          htmlFor={`repo-${repo.id}`}
                          className="font-medium cursor-pointer"
                        >
                          {repo.full_name}
                        </Label>
                        <div>
                          {repo.syncing && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                              Syncing
                            </Badge>
                          )}
                          {repo.synced && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <Check className="mr-1 h-3 w-3" />
                              Synced
                            </Badge>
                          )}
                          {repo.error && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Error
                            </Badge>
                          )}
                        </div>
                      </div>
                      {repo.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {repo.description}
                        </p>
                      )}
                      {repo.error && (
                        <p className="text-sm text-red-600 mt-1">
                          {repo.error}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            {isSyncing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Syncing Progress</span>
                  <span className="text-sm text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleSync}
          disabled={isLoading || isSyncing || repositories.every(repo => !repo.selected)}
        >
          {isSyncing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Syncing Repositories...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Selected Repositories
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
