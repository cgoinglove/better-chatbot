"use client";

import { searchFilesAction } from "@/app/api/github/actions";
import { GitHubFileSearchResult } from "app-types/github";
import { useState } from "react";
import { Button } from "ui/button";
import { Input } from "ui/input";
import { Label } from "ui/label";
import { Loader2, Search } from "lucide-react";
import { Badge } from "ui/badge";
import { ScrollArea } from "ui/scroll-area";
import { Separator } from "ui/separator";

interface GitHubSearchProps {
  onSelect: (file: GitHubFileSearchResult) => void;
  onCancel: () => void;
}

export function GitHubSearch({ onSelect, onCancel }: GitHubSearchProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<GitHubFileSearchResult[]>([]);
  
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) return;
    
    setIsSearching(true);
    
    try {
      const searchResults = await searchFilesAction(query);
      setResults(searchResults);
    } catch (error) {
      console.error("Error searching files:", error);
    } finally {
      setIsSearching(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <div>
        <form onSubmit={handleSearch} className="flex space-x-2">
          <div className="flex-1">
            <Label htmlFor="search" className="sr-only">
              Search
            </Label>
            <Input
              id="search"
              placeholder="Search code in repositories..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isSearching}
            />
          </div>
          <Button type="submit" disabled={isSearching}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span className="ml-2">Search</span>
          </Button>
        </form>
      </div>
      
      {results.length > 0 && (
        <ScrollArea className="h-[300px] rounded-md border p-4">
          <div className="space-y-4">
            {results.map((file) => (
              <div
                key={file.id}
                className="rounded-md border p-3 hover:bg-muted/50 cursor-pointer"
                onClick={() => onSelect(file)}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium truncate">{file.filePath}</div>
                  <Badge variant="outline">{file.language || "text"}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {file.repositoryName}
                </div>
                {file.snippet && (
                  <>
                    <Separator className="my-2" />
                    <div className="text-xs font-mono bg-muted p-2 rounded-sm overflow-x-auto">
                      {file.snippet}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
      
      {results.length === 0 && query && !isSearching && (
        <div className="text-center py-8 text-muted-foreground">
          No results found. Try a different search term.
        </div>
      )}
      
      <div className="flex justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
