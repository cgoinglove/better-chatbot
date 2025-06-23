import Mention from "@tiptap/extension-mention";
import {
  EditorContent,
  Range,
  useEditor,
  UseEditorOptions,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Edge } from "@xyflow/react";
import {
  OutputSchemaSourceKey,
  UINode,
} from "lib/ai/workflow/workflow.interface";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { VariableSelectContent } from "./variable-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { TipTapMentionJsonContent } from "app-types/util";
import { findAvailableSchemaBySource } from "lib/ai/workflow/shared.workflow";
import { useToRef } from "@/hooks/use-latest";
import { createRoot } from "react-dom/client";
import { VariableMentionItem } from "./variable-mention-item";
import { generateUUID } from "lib/utils";

interface OutputSchemaMentionInputProps {
  currentNodeId: string;
  nodes: UINode[];
  edges: Edge[];
  content?: TipTapMentionJsonContent;
  onChange: (content: TipTapMentionJsonContent) => void;
  placeholder?: string;
  editable?: boolean;
}

export function OutputSchemaMentionInput({
  currentNodeId,
  nodes,
  edges,
  content,
  onChange,
  editable,
}: OutputSchemaMentionInputProps) {
  const [suggestion, setSuggestion] = useState<{
    top: number;
    left: number;
    range: Range;
  } | null>(null);

  const mentionRef = useRef<HTMLDivElement>(null);

  const removeMention = (id: string) => {
    const newContent = editor?.getJSON() as unknown as TipTapMentionJsonContent;
    newContent.content[0].content = newContent.content[0].content.filter(
      (item) => !(item.type == "mention" && item.attrs.id === id),
    );
    editor?.commands.setContent(newContent);
  };

  const latestRef = useToRef({ nodes, edges, removeMention });

  const editorConfig = useMemo<UseEditorOptions>(
    () => ({
      editable,
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
            const el = document.createElement("div");
            const item = JSON.parse(
              props.node.attrs.label,
            ) as OutputSchemaSourceKey;
            const labelData = {
              nodeName: "",
              path: [] as string[],
              notFound: false,
            };

            const sourceNode = latestRef.current.nodes.find(
              (node) => node.id === item.nodeId,
            );

            labelData.nodeName = sourceNode?.data.name ?? "ERROR";
            labelData.path = item.path;

            const schema = findAvailableSchemaBySource({
              nodeId: currentNodeId,
              source: item,
              nodes: latestRef.current.nodes.map((node) => node.data),
              edges: latestRef.current.edges,
            });

            if (!schema) {
              labelData.notFound = true;
            }

            el.setAttribute("data-mention-item", props.node.attrs.id);
            el.className = "mr-1 inline-flex";
            const root = createRoot(el);
            root.render(
              <VariableMentionItem
                {...labelData}
                onRemove={() =>
                  latestRef.current.removeMention(props.node.attrs.id)
                }
              />,
            );
            return el;
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
              onChange={(item) => {
                editor
                  ?.chain()
                  .focus()
                  .insertContentAt(suggestion.range, [
                    {
                      type: "mention",
                      attrs: {
                        id: generateUUID(),
                        label: JSON.stringify({
                          nodeId: item.nodeId,
                          path: item.path,
                        }),
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
