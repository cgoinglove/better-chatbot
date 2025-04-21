"use client";

import { GitHubFileSearchResult } from "app-types/github";
import { useEffect, useState } from "react";
import { Button } from "ui/button";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "ui/scroll-area";
import { Separator } from "ui/separator";
import { Badge } from "ui/badge";
import { PreBlock } from "./pre-block";

interface GitHubFileViewerProps {
  file: GitHubFileSearchResult;
  onClose: () => void;
}

export function GitHubFileViewer({ file, onClose }: GitHubFileViewerProps) {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchFileContent = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // In a real implementation, we would fetch the file content from the API
        // For now, we'll just use the snippet as a placeholder
        setContent(file.snippet || "File content not available");
      } catch (err) {
        console.error("Error fetching file content:", err);
        setError("Failed to load file content");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFileContent();
  }, [file]);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{file.filePath}</h3>
          <p className="text-sm text-muted-foreground">
            Repository: {file.repositoryName}
          </p>
        </div>
        <Badge variant="outline">{file.language || "text"}</Badge>
      </div>
      
      <Separator />
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-8 text-destructive">
          {error}
        </div>
      ) : (
        <ScrollArea className="h-[400px] rounded-md border">
          <div className="p-4">
            <PreBlock code={content || ""} language={file.language?.toLowerCase() || "text"} />
          </div>
        </ScrollArea>
      )}
      
      <div className="flex justify-end">
        <Button onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
