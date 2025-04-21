"use client";

import { cloneRepositoryAction } from "@/app/api/github/clone-actions";
import { GitHubRemoteRepository } from "@/app/api/github/account-actions";
import { useState } from "react";
import { Button } from "ui/button";
import { Input } from "ui/input";
import { Label } from "ui/label";
import { Loader2, GitBranch, GitFork } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "ui/select";

interface GitHubCloneDialogProps {
  repository: GitHubRemoteRepository;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function GitHubCloneDialog({
  repository,
  open,
  onOpenChange,
  onSuccess,
}: GitHubCloneDialogProps) {
  const [isCloning, setIsCloning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [branch, setBranch] = useState<string>(repository.default_branch);
  const [depth, setDepth] = useState<number | undefined>(undefined);
  
  const handleClone = async () => {
    setIsCloning(true);
    setProgress(0);
    
    try {
      // Start progress animation
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval);
            return prev;
          }
          return prev + 5;
        });
      }, 500);
      
      // Clone the repository
      const result = await cloneRepositoryAction(
        repository.owner?.login || repository.full_name.split('/')[0],
        repository.name,
        branch !== repository.default_branch ? branch : undefined,
        depth
      );
      
      clearInterval(interval);
      
      if (result.success) {
        setProgress(100);
        toast.success(result.message);
        
        // Close dialog after a short delay
        setTimeout(() => {
          onOpenChange(false);
          onSuccess?.();
        }, 1000);
      } else {
        toast.error(result.error || "Failed to clone repository");
        setIsCloning(false);
      }
    } catch (error) {
      console.error("Error cloning repository:", error);
      toast.error("An error occurred while cloning the repository");
      setIsCloning(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Clone Repository</DialogTitle>
          <DialogDescription>
            Clone {repository.full_name} to your local machine
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="branch">Branch</Label>
            <div className="flex items-center space-x-2">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={repository.default_branch} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={repository.default_branch}>
                    {repository.default_branch} (default)
                  </SelectItem>
                  {repository.branches?.map((branch: string) => (
                    <SelectItem key={branch} value={branch}>
                      {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="depth">Depth (optional)</Label>
            <div className="flex items-center space-x-2">
              <GitFork className="h-4 w-4 text-muted-foreground" />
              <Input
                id="depth"
                type="number"
                placeholder="Clone depth (leave empty for full history)"
                value={depth || ""}
                onChange={(e) => setDepth(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                min={1}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Specify a depth to create a shallow clone with limited history
            </p>
          </div>
          
          {isCloning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Cloning Progress</Label>
                <span className="text-xs text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCloning}
          >
            Cancel
          </Button>
          <Button onClick={handleClone} disabled={isCloning}>
            {isCloning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cloning...
              </>
            ) : (
              "Clone Repository"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
