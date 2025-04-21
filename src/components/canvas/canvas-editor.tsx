"use client";

import { insertCanvasAction, selectCanvasAction, updateCanvasAction } from "@/app/api/canvas/actions";
import { appStore } from "@/app/store";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup
} from "@/components/ui/resizable";
import { Textarea } from "@/components/ui/textarea";
import { useCopy } from "@/hooks/use-copy";
import { useChat } from "@ai-sdk/react";
import {
    Check,
    Code,
    Copy,
    FileCode,
    FileText,
    Heading1,
    Heading2,
    Heading3,
    Image,
    Link as LinkIcon,
    List,
    ListOrdered,
    Quote,
    RefreshCw,
    Save,
    Wand2
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/shallow";

type CanvasEditorProps = {
  canvasId: string;
};

export function CanvasEditor({ canvasId }: CanvasEditorProps) {
  const [title, setTitle] = useState("Untitled Canvas");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState("4o");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { copied, copy } = useCopy();

  const [canvasList, storeMutate] = appStore(
    useShallow((state) => [state.canvasList, state.mutate])
  );

  // Load canvas data if it exists
  useEffect(() => {
    const loadCanvas = async () => {
      try {
        const canvas = await selectCanvasAction(canvasId);
        if (canvas) {
          setTitle(canvas.title);
          setContent(canvas.content);
        }
      } catch (error) {
        console.error("Failed to load canvas:", error);
        toast.error("Failed to load canvas");
      }
    };

    loadCanvas();
  }, [canvasId]);

  // Set up AI chat for suggestions
  const {
    messages,
    append,
    isLoading,
    setMessages
  } = useChat({
    api: "/api/chat",
    id: `canvas-${canvasId}`,
    body: { model: selectedModel },
    initialMessages: [],
  });

  // Get the latest AI suggestion
  const latestAiSuggestion = messages
    .filter(msg => msg.role === "assistant")
    .pop()?.content || "";

  // Handle saving the canvas
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const canvas = await selectCanvasAction(canvasId);

      if (canvas) {
        // Update existing canvas
        const updatedCanvas = await updateCanvasAction(canvasId, { title, content });

        // Update store
        const updatedList = canvasList.map(c =>
          c.id === canvasId ? updatedCanvas : c
        );
        storeMutate({ canvasList: updatedList });
      } else {
        // Create new canvas
        const newCanvas = await insertCanvasAction({ title, content, id: canvasId });

        // Update store
        storeMutate({
          canvasList: [...canvasList, newCanvas],
          currentCanvasId: canvasId
        });
      }

      toast.success("Canvas saved successfully");
    } catch (error) {
      console.error("Failed to save canvas:", error);
      toast.error("Failed to save canvas");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle generating content with AI
  const handleGenerateContent = async (prompt: string) => {
    setIsGenerating(true);
    try {
      await append({
        role: "user",
        content: `${prompt}:\n\n${content}`
      });
    } catch (error) {
      console.error("Failed to generate content:", error);
      toast.error("Failed to generate content");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle applying AI suggestion to the editor
  const handleApplySuggestion = () => {
    if (latestAiSuggestion) {
      setContent(latestAiSuggestion);
      toast.success("Applied AI suggestion to editor");
    }
  };

  // Insert markdown formatting at cursor position
  const insertFormatting = (before: string, after: string = "") => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    const newContent =
      content.substring(0, start) +
      before + selectedText + after +
      content.substring(end);

    setContent(newContent);

    // Focus back on textarea and set cursor position after formatting
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        end + before.length
      );
    }, 0);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="flex items-center gap-4 mb-4">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-xl font-semibold"
          placeholder="Enter canvas title"
        />
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-24"
        >
          {isSaving ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save
            </>
          )}
        </Button>
      </div>

      {/* Formatting toolbar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => insertFormatting("# ", "")}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => insertFormatting("## ", "")}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => insertFormatting("### ", "")}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => insertFormatting("**", "**")}
          title="Bold"
        >
          <strong>B</strong>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => insertFormatting("*", "*")}
          title="Italic"
        >
          <em>I</em>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => insertFormatting("`", "`")}
          title="Inline Code"
        >
          <Code className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => insertFormatting("```\n", "\n```")}
          title="Code Block"
        >
          <FileCode className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => insertFormatting("1. ", "")}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => insertFormatting("- ", "")}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => insertFormatting("> ", "")}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => insertFormatting("[", "](url)")}
          title="Link"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => insertFormatting("![alt text](", ")")}
          title="Image"
        >
          <Image className="h-4 w-4" />
        </Button>
      </div>

      {/* AI assistance toolbar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleGenerateContent("Improve this content")}
          disabled={isGenerating || !content}
        >
          {isGenerating ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Wand2 className="h-4 w-4 mr-2" />
          )}
          Improve
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleGenerateContent("Fix grammar and spelling")}
          disabled={isGenerating || !content}
        >
          {isGenerating ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Wand2 className="h-4 w-4 mr-2" />
          )}
          Fix Grammar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleGenerateContent("Make this more concise")}
          disabled={isGenerating || !content}
        >
          {isGenerating ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Wand2 className="h-4 w-4 mr-2" />
          )}
          Make Concise
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleGenerateContent("Expand on this content")}
          disabled={isGenerating || !content}
        >
          {isGenerating ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Wand2 className="h-4 w-4 mr-2" />
          )}
          Expand
        </Button>
      </div>

      {/* Resizable split view */}
      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1 border rounded-lg overflow-hidden"
      >
        {/* Editor panel */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col">
            <div className="p-2 bg-muted/30 border-b flex items-center">
              <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm font-medium">Editor</span>
            </div>
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 resize-none p-4 font-mono text-sm h-full rounded-none border-0 focus-visible:ring-0"
              placeholder="Start typing your content here..."
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Preview panel */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col">
            <div className="p-2 bg-muted/30 border-b flex justify-between items-center">
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm font-medium">Preview</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copy(content)}
                className="h-8 px-2"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <Markdown>{content || "Preview will appear here"}</Markdown>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* AI suggestions panel */}
      {messages.length > 0 && (
        <Card className="mt-4 p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium">AI Suggestions</h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleApplySuggestion}
                disabled={!latestAiSuggestion}
              >
                Apply
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMessages([])}
              >
                Clear
              </Button>
            </div>
          </div>
          <div className="max-h-60 overflow-auto border rounded-md p-3 bg-muted/20">
            <Markdown>{latestAiSuggestion || "No suggestions yet"}</Markdown>
          </div>
        </Card>
      )}
    </div>
  );
}
