"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  selectCodeSnippetAction, 
  updateCodeSnippetAction,
  deleteCodeSnippetAction
} from "@/app/api/code-snippets/actions";
import { CodeSnippet } from "@/lib/db/code-snippet-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { 
  Loader2, 
  Save, 
  Play, 
  Star, 
  StarOff, 
  ArrowLeft, 
  Trash2,
  Copy,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { callMcpToolAction } from "@/app/api/mcp/actions";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// Define supported languages
const SUPPORTED_LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "shell",
  "powershell",
  "batch",
  "ruby",
  "php",
  "go",
  "java",
  "c",
  "cpp",
  "csharp",
  "rust",
  "swift",
  "kotlin",
  "r",
  "perl",
  "lua",
  "sql",
];

export default function CodeSnippetPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  const isNew = id === "new";
  
  const [snippet, setSnippet] = useState<CodeSnippet>({
    id: isNew ? "" : id,
    title: "",
    description: "",
    code: "",
    language: "javascript",
    tags: "",
    isFavorite: false,
    userId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<{
    success: boolean;
    output?: string;
    error?: string;
    executionTime?: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [copied, setCopied] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Load snippet data if editing an existing snippet
  useEffect(() => {
    if (!isNew) {
      loadSnippet();
    }
  }, [id]);

  const loadSnippet = async () => {
    setIsLoading(true);
    try {
      const data = await selectCodeSnippetAction(id);
      if (data) {
        setSnippet(data);
      } else {
        toast.error("Snippet not found");
        router.push("/code-snippets");
      }
    } catch (error) {
      toast.error("Failed to load snippet");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!snippet.title.trim()) {
      toast.error("Title is required");
      return;
    }
    
    if (!snippet.code.trim()) {
      toast.error("Code is required");
      return;
    }
    
    setIsSaving(true);
    try {
      if (isNew) {
        // Create new snippet via the API
        const response = await fetch("/api/code-snippets", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(snippet),
        });
        
        if (!response.ok) {
          throw new Error("Failed to create snippet");
        }
        
        const newSnippet = await response.json();
        toast.success("Snippet created successfully");
        router.push(`/code-snippets/${newSnippet.id}`);
      } else {
        // Update existing snippet
        await updateCodeSnippetAction(id, {
          title: snippet.title,
          description: snippet.description,
          code: snippet.code,
          language: snippet.language,
          tags: snippet.tags,
          isFavorite: snippet.isFavorite,
        });
        toast.success("Snippet updated successfully");
      }
    } catch (error) {
      toast.error(isNew ? "Failed to create snippet" : "Failed to update snippet");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCodeSnippetAction(id);
      toast.success("Snippet deleted successfully");
      router.push("/code-snippets");
    } catch (error) {
      toast.error("Failed to delete snippet");
      console.error(error);
    }
  };

  const handleExecute = async () => {
    if (!snippet.code.trim()) {
      toast.error("No code to execute");
      return;
    }
    
    setIsExecuting(true);
    setExecutionResult(null);
    
    try {
      const result = await callMcpToolAction(
        "custom-mcp-server",
        "code_execute",
        {
          code: snippet.code,
          language: snippet.language,
        }
      );
      
      if (result && result.content && result.content.length > 0) {
        setExecutionResult({
          success: result.success || false,
          output: result.output,
          error: result.error,
          executionTime: result.executionTime,
        });
      } else {
        throw new Error("Invalid response from code execution");
      }
    } catch (error) {
      toast.error(
        `Failed to execute code: ${error instanceof Error ? error.message : String(error)}`
      );
      setExecutionResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(snippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFavorite = async () => {
    try {
      const updatedSnippet = await updateCodeSnippetAction(id, {
        isFavorite: !snippet.isFavorite,
      });
      setSnippet(updatedSnippet);
      toast.success(
        updatedSnippet.isFavorite
          ? "Added to favorites"
          : "Removed from favorites"
      );
    } catch (error) {
      toast.error("Failed to update favorite status");
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push("/code-snippets")}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">{isNew ? "New Snippet" : "Edit Snippet"}</h1>
        </div>
        <div className="flex space-x-2">
          {!isNew && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleFavorite}
              >
                {snippet.isFavorite ? (
                  <>
                    <StarOff className="h-4 w-4 mr-1" />
                    Unfavorite
                  </>
                ) : (
                  <>
                    <Star className="h-4 w-4 mr-1" />
                    Favorite
                  </>
                )}
              </Button>
              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Snippet</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete this snippet? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDelete}>
                      Delete
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-2">
          <Input
            placeholder="Snippet Title"
            value={snippet.title}
            onChange={(e) => setSnippet({ ...snippet, title: e.target.value })}
            className="text-lg font-medium mb-2"
          />
        </div>
        <div>
          <Select
            value={snippet.language}
            onValueChange={(value) => setSnippet({ ...snippet, language: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {lang.charAt(0).toUpperCase() + lang.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-6">
        <Textarea
          placeholder="Description (optional)"
          value={snippet.description || ""}
          onChange={(e) => setSnippet({ ...snippet, description: e.target.value })}
          className="resize-none h-20"
        />
      </div>

      <div className="mb-6">
        <Input
          placeholder="Tags (comma separated, optional)"
          value={snippet.tags || ""}
          onChange={(e) => setSnippet({ ...snippet, tags: e.target.value })}
        />
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle>Code</CardTitle>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyCode}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExecute}
                disabled={isExecuting}
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-1" />
                    Execute
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="edit" value={activeTab} onValueChange={(value) => setActiveTab(value as "edit" | "preview")}>
            <TabsList className="mb-2">
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="edit" className="mt-0">
              <Textarea
                value={snippet.code}
                onChange={(e) => setSnippet({ ...snippet, code: e.target.value })}
                className="font-mono h-80 resize-none"
                placeholder="Enter your code here..."
              />
            </TabsContent>
            <TabsContent value="preview" className="mt-0">
              <div className="border rounded-md overflow-hidden">
                <SyntaxHighlighter
                  language={snippet.language}
                  style={vscDarkPlus}
                  customStyle={{ margin: 0, height: "320px", overflow: "auto" }}
                  showLineNumbers
                >
                  {snippet.code}
                </SyntaxHighlighter>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {executionResult && (
        <Card>
          <CardHeader>
            <CardTitle>
              {executionResult.success ? (
                <span className="text-green-500">Execution Result</span>
              ) : (
                <span className="text-red-500">Execution Error</span>
              )}
            </CardTitle>
            {executionResult.executionTime && (
              <CardDescription>
                Executed in {executionResult.executionTime}ms
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {executionResult.output && (
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-1">Output:</h3>
                <pre className="bg-muted p-3 rounded overflow-auto max-h-60 text-sm">
                  {executionResult.output}
                </pre>
              </div>
            )}
            {executionResult.error && (
              <div>
                <h3 className="text-sm font-medium mb-1 text-red-500">Error:</h3>
                <pre className="bg-muted p-3 rounded overflow-auto max-h-60 text-sm text-red-500">
                  {executionResult.error}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
