"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  selectCodeSnippetsByUserIdAction, 
  selectCodeSnippetsByLanguageAction,
  searchCodeSnippetsAction,
  selectFavoriteCodeSnippetsAction
} from "@/app/api/code-snippets/actions";
import { CodeSnippet } from "@/lib/db/code-snippet-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Search, Star, StarOff, Code, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function CodeSnippetsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");

  // Load snippets on initial load
  useEffect(() => {
    loadSnippets();
  }, []);

  // Load snippets based on active tab
  useEffect(() => {
    if (activeTab === "all") {
      loadSnippets();
    } else if (activeTab === "favorites") {
      loadFavoriteSnippets();
    } else {
      // Language filter
      loadSnippetsByLanguage(activeTab);
    }
  }, [activeTab]);

  const loadSnippets = async () => {
    setIsLoading(true);
    try {
      const data = await selectCodeSnippetsByUserIdAction();
      setSnippets(data);
    } catch (error) {
      toast.error("Failed to load code snippets");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFavoriteSnippets = async () => {
    setIsLoading(true);
    try {
      const data = await selectFavoriteCodeSnippetsAction();
      setSnippets(data);
    } catch (error) {
      toast.error("Failed to load favorite snippets");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSnippetsByLanguage = async (language: string) => {
    setIsLoading(true);
    try {
      const data = await selectCodeSnippetsByLanguageAction(language);
      setSnippets(data);
    } catch (error) {
      toast.error(`Failed to load ${language} snippets`);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return loadSnippets();
    }
    
    setIsLoading(true);
    try {
      const data = await searchCodeSnippetsAction(searchQuery);
      setSnippets(data);
    } catch (error) {
      toast.error("Search failed");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get unique languages from snippets for tabs
  const languages = [...new Set(snippets.map(snippet => snippet.language))];

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Code Snippets</h1>
        <Button onClick={() => router.push("/code-snippets/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Snippet
        </Button>
      </div>

      <div className="flex mb-6">
        <div className="flex-1 mr-2">
          <Input
            placeholder="Search snippets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button onClick={handleSearch} variant="outline">
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 flex flex-wrap">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="favorites">
            <Star className="h-4 w-4 mr-1" />
            Favorites
          </TabsTrigger>
          {languages.map(lang => (
            <TabsTrigger key={lang} value={lang}>
              <Code className="h-4 w-4 mr-1" />
              {lang}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : snippets.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/20">
              <p className="text-muted-foreground mb-4">No code snippets found</p>
              <Button onClick={() => router.push("/code-snippets/new")}>
                Create your first snippet
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {snippets.map((snippet) => (
                <Card key={snippet.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg truncate">{snippet.title}</CardTitle>
                        <CardDescription className="text-xs">
                          {new Date(snippet.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className="flex space-x-1">
                        {snippet.isFavorite && (
                          <Star className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    {snippet.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {snippet.description}
                      </p>
                    )}
                    <div className="bg-muted rounded p-2 h-24 overflow-hidden">
                      <pre className="text-xs overflow-hidden">
                        <code>{snippet.code.slice(0, 200)}{snippet.code.length > 200 ? '...' : ''}</code>
                      </pre>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2 flex justify-between">
                    <div className="flex items-center">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {snippet.language}
                      </span>
                    </div>
                    <div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => router.push(`/code-snippets/${snippet.id}`)}
                      >
                        View
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
