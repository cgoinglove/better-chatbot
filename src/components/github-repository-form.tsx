"use client";

import { GitHubRepository, GitHubRepositoryUpdate } from "app-types/github";
import { useState } from "react";
import { Button } from "ui/button";
import { Input } from "ui/input";
import { Label } from "ui/label";
import { Textarea } from "ui/textarea";
import { createRepositoryAction, updateRepositoryAction } from "@/app/api/github/actions";
import { toast } from "sonner";
import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "ui/card";
import { Switch } from "ui/switch";

interface GitHubRepositoryFormProps {
  repository?: GitHubRepository;
  onCancel: () => void;
  onSuccess: () => void;
}

export function GitHubRepositoryForm({ repository, onCancel, onSuccess }: GitHubRepositoryFormProps) {
  const [name, setName] = useState(repository?.name || "");
  const [path, setPath] = useState(repository?.path || "");
  const [description, setDescription] = useState(repository?.description || "");
  const [isEnabled, setIsEnabled] = useState(repository?.isEnabled ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [appStoreMutate, repositoryList] = appStore(
    useShallow((state) => [state.mutate, state.githubRepositoryList])
  );
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !path) {
      toast.error("Name and path are required");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (repository) {
        // Update existing repository
        const updateData: GitHubRepositoryUpdate = {
          name,
          path,
          description,
          isEnabled,
        };
        
        const updatedRepository = await updateRepositoryAction(repository.id, updateData);
        
        if (updatedRepository) {
          // Update the repository in the store
          const updatedRepositoryList = repositoryList?.map((r) => 
            r.id === repository.id ? updatedRepository : r
          ) || [];
          
          appStoreMutate({ githubRepositoryList: updatedRepositoryList });
          toast.success("Repository updated");
          onSuccess();
        } else {
          toast.error("Failed to update repository");
        }
      } else {
        // Create new repository
        const newRepository = await createRepositoryAction({
          name,
          path,
          description,
          isEnabled,
        });
        
        if (newRepository) {
          // Add the new repository to the store
          const updatedRepositoryList = [...(repositoryList || []), newRepository];
          appStoreMutate({ githubRepositoryList: updatedRepositoryList });
          toast.success("Repository created");
          onSuccess();
        } else {
          toast.error("Failed to create repository");
        }
      }
    } catch (error) {
      console.error("Error submitting repository:", error);
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{repository ? "Edit Repository" : "Add Repository"}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Repository name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="path">Path</Label>
            <Input
              id="path"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="Full path to local repository"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Repository description"
              rows={3}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="isEnabled"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
            <Label htmlFor="isEnabled">Enabled</Label>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : repository ? "Update" : "Add"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
