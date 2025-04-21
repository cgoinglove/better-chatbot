"use client";

import { WebhookInfo, createWebhookAction, deleteWebhookAction, listWebhooksAction } from "@/app/api/github/webhook-actions";
import { useEffect, useState } from "react";
import { Button } from "ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "ui/card";
import { Input } from "ui/input";
import { Loader2, Plus, Trash, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "ui/table";
import { Badge } from "ui/badge";
import { formatDistanceToNow } from "date-fns";
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

interface GitHubWebhooksProps {
  owner: string;
  repo: string;
}

export function GitHubWebhooks({ owner, repo }: GitHubWebhooksProps) {
  const [webhooks, setWebhooks] = useState<WebhookInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [deleteWebhook, setDeleteWebhook] = useState<WebhookInfo | null>(null);
  
  const fetchWebhooks = async () => {
    setIsLoading(true);
    try {
      const hooks = await listWebhooksAction(owner, repo);
      setWebhooks(hooks);
    } catch (error) {
      console.error("Error fetching webhooks:", error);
      toast.error("Failed to fetch webhooks");
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchWebhooks();
  }, [owner, repo]);
  
  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!webhookUrl) {
      toast.error("Webhook URL is required");
      return;
    }
    
    setIsCreating(true);
    
    try {
      const result = await createWebhookAction(owner, repo, webhookUrl);
      
      if (result.success) {
        toast.success(result.message);
        setWebhookUrl("");
        fetchWebhooks();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Error creating webhook:", error);
      toast.error("An error occurred while creating the webhook");
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleDeleteWebhook = async () => {
    if (!deleteWebhook) return;
    
    try {
      const result = await deleteWebhookAction(owner, repo, deleteWebhook.id);
      
      if (result.success) {
        toast.success(result.message);
        fetchWebhooks();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Error deleting webhook:", error);
      toast.error("An error occurred while deleting the webhook");
    } finally {
      setDeleteWebhook(null);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Repository Webhooks</CardTitle>
        <CardDescription>
          Manage webhooks for {owner}/{repo}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleCreateWebhook} className="flex items-end space-x-2">
          <div className="flex-1 space-y-2">
            <label htmlFor="webhookUrl" className="text-sm font-medium">
              Webhook URL
            </label>
            <Input
              id="webhookUrl"
              placeholder="https://example.com/webhook"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={isCreating}>
            {isCreating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Add Webhook
          </Button>
        </form>
        
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Existing Webhooks</h3>
          <Button variant="outline" size="sm" onClick={fetchWebhooks} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="ml-2">Refresh</span>
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : webhooks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No webhooks found for this repository
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((webhook) => (
                  <TableRow key={webhook.id}>
                    <TableCell className="font-mono text-xs truncate max-w-[200px]">
                      {webhook.url}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.map((event) => (
                          <Badge key={event} variant="outline">
                            {event}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {webhook.active ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(webhook.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteWebhook(webhook)}
                      >
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        <p>
          Webhooks allow GitHub to notify this application when events occur in the repository.
        </p>
      </CardFooter>
      
      {/* Delete Webhook Dialog */}
      <AlertDialog open={!!deleteWebhook} onOpenChange={(open) => !open && setDeleteWebhook(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this webhook? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteWebhook}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
