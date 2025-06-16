import Mention from "@tiptap/extension-mention";
import {
  EditorContent,
  Range,
  useEditor,
  UseEditorOptions,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Edge } from "@xyflow/react";
import { UINode } from "lib/ai/workflow/interface";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { VariableSelectContent } from "./variable-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { TipTapMentionJsonContent } from "app-types/util";

interface OutputSchemaMentionInputProps {
  currentNodeId: string;
  nodes: UINode[];
  edges: Edge[];
  content?: TipTapMentionJsonContent;
  onChange: (content: TipTapMentionJsonContent) => void;
  placeholder?: string;
}

export function OutputSchemaMentionInput({
  currentNodeId,
  nodes,
  edges,
  content,
  onChange,
}: OutputSchemaMentionInputProps) {
  const [suggestion, setSuggestion] = useState<{
    top: number;
    left: number;
    range: Range;
  } | null>(null);

  const mentionRef = useRef<HTMLDivElement>(null);

  const editorConfig = useMemo<UseEditorOptions>(
    () => ({
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          codeBlock: false,
          blockquote: false,
          code: false,
        }),
        Mention.configure({
          HTMLAttributes: {
            class: "mention",
          },
          renderHTML: (props) => {
            const node = document.createElement("div");
            node.setAttribute("data-mention-item", props.node.attrs.id);
            node.className =
              "mr-1 inline-flex text-blue-500 gap-1 items-center hover:border-blue-500 border rounded-xs bg-background text-xs px-1";
            node.innerHTML = props.node.attrs.label;
            return node;
          },
          suggestion: {
            char: "/",
            render: () => {
              return {
                onStart: (props) => {
                  const rect = props.clientRect?.();
                  if (rect) {
                    setSuggestion({
                      top: rect.top - +window.scrollY,
                      left: rect.left - +window.scrollX,
                      range: props.range,
                    });
                  }
                },
                onExit: () => setSuggestion(null),
              };
            },
          },
        }),
      ],
      content,
      autofocus: true,
      onUpdate: ({ editor }) => {
        onChange?.(editor.getJSON() as TipTapMentionJsonContent);
      },
      editorProps: {
        attributes: {
          class:
            "w-full max-h-80 min-h-[2rem] break-words overflow-y-auto resize-none focus:outline-none px-2 py-1 prose prose-sm dark:prose-invert",
        },
      },
    }),
    [],
  );

  const editor = useEditor(editorConfig);

  useEffect(() => {
    if (!suggestion) return;

    const handleClick = (e: MouseEvent) => {
      if (
        !mentionRef.current?.contains(e.target as Node) &&
        !editor?.isActive("mention")
      ) {
        setSuggestion(null);
      }
    };
    window.addEventListener("click", handleClick);
    return () => {
      window.removeEventListener("click", handleClick);
    };
  }, [suggestion, editor]);

  const suggestionPortal = useMemo(() => {
    if (!suggestion) return null;
    return createPortal(
      <div
        className="fixed z-50"
        style={{
          top: suggestion.top,
          left: suggestion.left,
        }}
      >
        <DropdownMenu open={true}>
          <DropdownMenuTrigger />
          <DropdownMenuContent ref={mentionRef}>
            <VariableSelectContent
              currentNodeId={currentNodeId}
              nodes={nodes}
              edges={edges}
              onChange={(item) => {
                editor
                  ?.chain()
                  .focus()
                  .insertContentAt(suggestion.range, [
                    {
                      type: "mention",
                      attrs: {
                        id: JSON.stringify({
                          nodeId: item.nodeId,
                          path: item.path,
                        }),
                        label: `<span class="text-foreground">${item.nodeName}/</span>${item.path.join(".")}`,
                      },
                    },
                  ])
                  .run();
              }}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>,
      document.body,
    );
  }, [suggestion]);

  return (
    <div className="relative w-full">
      <EditorContent editor={editor} className="relative" />
      {suggestionPortal}
    </div>
  );
}
