"use client";

import { GitHubAccountInfo, unlinkGitHubAccountAction } from "@/app/api/github/account-actions";
import { Button } from "ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import { Github, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "ui/alert-dialog";

interface GitHubAccountCardProps {
  account: GitHubAccountInfo;
  onUnlink: () => void;
}

export function GitHubAccountCard({ account, onUnlink }: GitHubAccountCardProps) {
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  const handleUnlink = async () => {
    setIsUnlinking(true);
    
    try {
      const success = await unlinkGitHubAccountAction();
      
      if (success) {
        toast.success("GitHub account unlinked successfully");
        onUnlink();
      } else {
        toast.error("Failed to unlink GitHub account");
      }
    } catch (error) {
      console.error("Error unlinking GitHub account:", error);
      toast.error("An error occurred while unlinking GitHub account");
    } finally {
      setIsUnlinking(false);
      setShowConfirmDialog(false);
    }
  };
  
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={account.avatarUrl} alt={account.username} />
            <AvatarFallback>
              <Github className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{account.name || account.username}</CardTitle>
            <CardDescription>@{account.username}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <p>Connected since {new Date(account.createdAt).toLocaleDateString()}</p>
            {account.email && <p className="mt-1">Email: {account.email}</p>}
          </div>
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowConfirmDialog(true)}
            disabled={isUnlinking}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {isUnlinking ? "Unlinking..." : "Unlink GitHub Account"}
          </Button>
        </CardFooter>
      </Card>
      
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink GitHub Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlink your GitHub account? You will need to reconnect to access your GitHub repositories.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlink}>Unlink</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
