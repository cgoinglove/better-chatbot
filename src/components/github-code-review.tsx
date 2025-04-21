"use client";

import { useEffect, useState } from "react";
import { Button } from "ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "ui/card";
import { Loader2, RefreshCw, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { githubApiRequest } from "lib/github/github-api-middleware";
import { getMockUserSession } from "lib/mock";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "ui/tabs";
import { ScrollArea } from "ui/scroll-area";
import { Separator } from "ui/separator";

interface GitHubCodeReviewProps {
  owner: string;
  repo: string;
  pullNumber: number;
}

interface Comment {
  id: number;
  user: {
    login: string;
    avatar_url: string;
  };
  body: string;
  created_at: string;
  updated_at: string;
  path?: string;
  position?: number;
  line?: number;
  commit_id?: string;
}

export function GitHubCodeReview({ owner, repo, pullNumber }: GitHubCodeReviewProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [reviewComments, setReviewComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fetchComments = async () => {
    setIsLoading(true);
    try {
      const user = getMockUserSession();
      if (!user) {
        toast.error("User not authenticated");
        return;
      }
      
      // Fetch issue comments (general PR comments)
      const issueComments = await githubApiRequest(
        user.id,
        `/repos/${owner}/${repo}/issues/${pullNumber}/comments`
      );
      
      // Fetch review comments (inline code comments)
      const prReviewComments = await githubApiRequest(
        user.id,
        `/repos/${owner}/${repo}/pulls/${pullNumber}/comments`
      );
      
      setComments(issueComments);
      setReviewComments(prReviewComments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      toast.error("Failed to fetch comments");
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchComments();
  }, [owner, repo, pullNumber]);
  
  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      const user = getMockUserSession();
      if (!user) {
        toast.error("User not authenticated");
        return;
      }
      
      // Submit a new comment
      await githubApiRequest(
        user.id,
        `/repos/${owner}/${repo}/issues/${pullNumber}/comments`,
        {
          method: "POST",
          body: {
            body: newComment,
          },
        }
      );
      
      // Clear the comment field
      setNewComment("");
      
      // Refresh comments
      fetchComments();
      
      toast.success("Comment added successfully");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const renderComment = (comment: Comment) => (
    <div key={comment.id} className="flex space-x-4 py-4">
      <Avatar className="h-10 w-10">
        <AvatarImage src={comment.user.avatar_url} alt={comment.user.login} />
        <AvatarFallback>{comment.user.login.substring(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-2">
        <div className="flex items-center space-x-2">
          <span className="font-medium">{comment.user.login}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>
        <div className="text-sm">
          {comment.body}
        </div>
        {comment.path && (
          <div className="text-xs bg-muted p-2 rounded-md">
            <div className="font-mono font-medium">{comment.path}</div>
            {comment.line && <div>Line {comment.line}</div>}
          </div>
        )}
      </div>
    </div>
  );
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageSquare className="mr-2 h-5 w-5" />
          Code Review
        </CardTitle>
        <CardDescription>
          Review and comment on pull request #{pullNumber}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchComments}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="ml-2">Refresh</span>
          </Button>
        </div>
        
        <Tabs defaultValue="discussion">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="discussion">Discussion ({comments.length})</TabsTrigger>
            <TabsTrigger value="code-review">Code Review ({reviewComments.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="discussion" className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No comments yet. Start the discussion!
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {comments.map(renderComment)}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
          
          <TabsContent value="code-review" className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : reviewComments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No code review comments yet.
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {reviewComments.map(renderComment)}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
        
        <Separator className="my-4" />
        
        <div className="space-y-4">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={4}
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmitComment}
              disabled={isSubmitting || !newComment.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Add Comment
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
