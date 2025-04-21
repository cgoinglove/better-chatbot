"use client";

import { insertCodeSnippetAction } from "@/app/api/code-snippets/actions";
import { callMcpToolAction } from "@/app/api/mcp/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Check, Copy, Loader2, Play, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { toast } from "sonner";

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

// Sample code snippets for different languages
const SAMPLE_CODE: Record<string, string> = {
  javascript: "console.log('Hello, world!');",
  typescript:
    "const greeting: string = 'Hello, world!';\nconsole.log(greeting);",
  python: "print('Hello, world!')",
  shell: "echo 'Hello, world!'",
  powershell: "Write-Host 'Hello, world!'",
  batch: "@echo Hello, world!",
  ruby: "puts 'Hello, world!'",
  php: "<?php\necho 'Hello, world!';\n?>",
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello, world!")\n}',
  java: 'public class HelloWorld {\n    public static void main(String[] args) {\n        System.out.println("Hello, world!");\n    }\n}',
  c: '#include <stdio.h>\n\nint main() {\n    printf("Hello, world!\\n");\n    return 0;\n}',
  cpp: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, world!" << std::endl;\n    return 0;\n}',
  csharp:
    'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, world!");\n    }\n}',
  rust: 'fn main() {\n    println!("Hello, world!");\n}',
  swift: 'print("Hello, world!")',
  kotlin: 'fun main() {\n    println("Hello, world!")\n}',
  r: 'cat("Hello, world!\\n")',
  perl: 'print "Hello, world!\\n";',
  lua: 'print("Hello, world!")',
  sql: "SELECT 'Hello, world!' AS greeting;",
};

export default function TestCodeExecution() {
  const [code, setCode] = useState(SAMPLE_CODE.javascript);
  const [language, setLanguage] = useState("javascript");
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    output?: string;
    error?: string;
    executionTime?: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [copied, setCopied] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [snippetTitle, setSnippetTitle] = useState("");
  const [snippetDescription, setSnippetDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Update code when language changes
  useEffect(() => {
    if (SAMPLE_CODE[language]) {
      setCode(SAMPLE_CODE[language]);
    }
  }, [language]);

  const handleExecute = async () => {
    if (!code.trim()) {
      toast.error("Please enter some code to execute");
      return;
    }

    setIsExecuting(true);
    setResult(null);

    try {
      const response = await callMcpToolAction(
        "custom-mcp-server",
        "code_execute",
        {
          code,
          language,
        },
      );

      setResult({
        success: response.success || false,
        output: response.output,
        error: response.error,
        executionTime: response.executionTime,
      });
    } catch (error) {
      toast.error(
        `Failed to execute code: ${error instanceof Error ? error.message : String(error)}`,
      );
      setResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveSnippet = async () => {
    if (!code.trim()) {
      toast.error("No code to save");
      return;
    }

    if (!snippetTitle.trim()) {
      toast.error("Please enter a title for the snippet");
      return;
    }

    setIsSaving(true);
    try {
      await insertCodeSnippetAction({
        title: snippetTitle,
        description: snippetDescription,
        code,
        language,
        isFavorite: false,
      });

      toast.success("Code snippet saved successfully");
      setSaveDialogOpen(false);
      setSnippetTitle("");
      setSnippetDescription("");
    } catch (error) {
      toast.error(
        `Failed to save snippet: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Test Code Execution Tool</h1>
        <div className="flex space-x-2">
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Save className="h-4 w-4 mr-2" />
                Save Snippet
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Code Snippet</DialogTitle>
                <DialogDescription>
                  Save this code for future reference.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={snippetTitle}
                    onChange={(e) => setSnippetTitle(e.target.value)}
                    placeholder="Enter a title for your snippet"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={snippetDescription}
                    onChange={(e) => setSnippetDescription(e.target.value)}
                    placeholder="Enter a description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSaveDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveSnippet} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={handleExecute} disabled={isExecuting}>
            {isExecuting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Execute Code
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-3">
          <Select value={language} onValueChange={setLanguage}>
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

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle>Code</CardTitle>
            <Button variant="outline" size="sm" onClick={handleCopyCode}>
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
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue="edit"
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as "edit" | "preview")}
          >
            <TabsList className="mb-2">
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="edit" className="mt-0">
              <Textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="font-mono h-80 resize-none"
                placeholder="Enter your code here..."
              />
            </TabsContent>
            <TabsContent value="preview" className="mt-0">
              <div className="border rounded-md overflow-hidden">
                <SyntaxHighlighter
                  language={language}
                  style={vscDarkPlus}
                  customStyle={{ margin: 0, height: "320px", overflow: "auto" }}
                  showLineNumbers
                >
                  {code}
                </SyntaxHighlighter>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>
              {result.success ? (
                <span className="text-green-500">Execution Result</span>
              ) : (
                <span className="text-red-500">Execution Error</span>
              )}
            </CardTitle>
            {result.executionTime && (
              <CardDescription>
                Executed in {result.executionTime}ms
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {result.output && (
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-1">Output:</h3>
                <pre className="bg-muted p-3 rounded overflow-auto max-h-60 text-sm">
                  {result.output}
                </pre>
              </div>
            )}
            {result.error && (
              <div>
                <h3 className="text-sm font-medium mb-1 text-red-500">
                  Error:
                </h3>
                <pre className="bg-muted p-3 rounded overflow-auto max-h-60 text-sm text-red-500">
                  {result.error}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
