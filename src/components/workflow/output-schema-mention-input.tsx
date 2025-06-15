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
import { generateUUID, toAny } from "lib/utils";

interface OutputSchemaMentionInputProps {
  currentNodeId: string;
  nodes: UINode[];
  edges: Edge[];
  input: string;
  onChange: (input: string) => void;
  onChangeMention: (mention: { nodeId: string; path: string[] }) => void;
  placeholder?: string;
}

const EL_DATA_KEY = "_mention_item";

export function OutputSchemaMentionInput({
  currentNodeId,
  nodes,
  edges,
  input,
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
            const item = JSON.parse(props.node.attrs.id) as {
              nodeId: string;
              path: string[];
            };
            const node = document.createElement("div");
            node.setAttribute("data-type", EL_DATA_KEY);
            toAny(node)[EL_DATA_KEY] = item;
            node.className =
              "flex gap-1 items-center px-2 py-1 border rounded-md bg-input";
            node.innerHTML = `<span>${item.path.join(".")}</span>`;
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
                onExit: (props) => {
                  const mentionItems =
                    props.editor?.$doc.element.querySelectorAll(
                      `[data-type='${EL_DATA_KEY}']`,
                    );
                  const mentionItemsArray = Array.from(mentionItems).map(
                    (item) => toAny(item)[EL_DATA_KEY],
                  );

                  console.log(mentionItemsArray);
                  //   onChangeMention?.(
                  //     mentionItemsArray.map((item) => decodeMentionItem(item.id)),
                  //   );
                  setSuggestion(null);
                },
              };
            },
          },
        }),
      ],
      content: input,
      autofocus: true,
      onUpdate: ({ editor }) => {
        onChange?.(editor.getHTML());
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
    if (input?.trim() !== editor?.getText().trim()) {
      editor?.commands.setContent(input || "");
    }
  }, [input, editor]);

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
                        id: JSON.stringify(item),
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
