"use client";
import Mention from "@tiptap/extension-mention";
import {
  EditorContent,
  Range,
  useEditor,
  UseEditorOptions,
  Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TipTapMentionJsonContent } from "app-types/util";
import { cn } from "lib/utils";
import {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  RefObject,
} from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";

interface MentionInputProps {
  disabled?: boolean;
  defaultContent?: TipTapMentionJsonContent | string;
  content?: TipTapMentionJsonContent | string;
  onChange?: (content: {
    json: TipTapMentionJsonContent;
    text: string;
    mentions: { label: string; id: string }[];
  }) => void;
  onEnter?: () => void;
  placeholder?: string;
  suggestionChar?: string;
  className?: string;
  disabledMention?: boolean;
  editorRef?: RefObject<Editor | null>;
  onFocus?: () => void;
  onBlur?: () => void;
  MentionItem: FC<{
    label: string;
    id: string;
  }>;
  Suggestion: FC<{
    top: number;
    left: number;
    onClose: () => void;
    onSelectMention: (item: { label: string; id: string }) => void;
  }>;
}

export default function MentionInput({
  defaultContent,
  content,
  onChange,
  disabled,
  onEnter,
  placeholder = "",
  suggestionChar = "@",
  MentionItem,
  disabledMention,
  Suggestion,
  className,
  editorRef,
  onFocus,
  onBlur,
}: MentionInputProps) {
  const [open, setOpen] = useState(false);
  const position = useRef<{
    top: number;
    left: number;
    range: Range;
  } | null>(null);
  const latestContent = useRef<{
    json: TipTapMentionJsonContent;
    text: string;
  } | null>(null);

  // Memoize editor configuration
  const editorConfig = useMemo<UseEditorOptions>(() => {
    return {
      editable: !disabled,
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
            el.className = "inline-flex";
            const root = createRoot(el);
            root.render(
              <MentionItem
                label={props.node.attrs.label}
                id={props.node.attrs.id}
              />,
            );
            return el;
          },
          suggestion: {
            char: suggestionChar,
            render: () => {
              return {
                onStart: (props) => {
                  const rect = props.clientRect?.();
                  if (rect) {
                    position.current = {
                      top: rect.top,
                      left: rect.left,
                      range: props.range,
                    };
                    setOpen(true);
                  }
                },
                onExit: () => setOpen(false),
              };
            },
          },
        }),
      ],
      content: defaultContent ?? content,
      autofocus: true,
      onUpdate: ({ editor }) => {
        const json = editor.getJSON() as TipTapMentionJsonContent;
        const text = editor.getText();
        const mentions = json?.content
          ?.flatMap(({ content }) => {
            return content
              ?.filter((v) => v.type == "mention")
              .map((v) => v.attrs);
          })
          .filter(Boolean) as { label: string; id: string }[];
        latestContent.current = {
          json,
          text,
        };
        onChange?.({
          json,
          text,
          mentions,
        });
      },
      onFocus: () => {
        onFocus?.();
      },
      onBlur: () => {
        onBlur?.();
      },
      editorProps: {
        attributes: {
          class:
            "w-full max-h-80 min-h-[2rem] break-words overflow-y-auto resize-none focus:outline-none px-2 py-1 prose prose-sm dark:prose-invert ",
        },
      },
    };
  }, [disabled, MentionItem, suggestionChar, onChange]);

  const editor = useEditor(editorConfig);

  // Expose editor through ref
  useEffect(() => {
    if (editorRef && editor) {
      editorRef.current = editor;
    }
  }, [editor]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled]);

  // Memoize handlers
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const isSubmit =
        !open &&
        e.key === "Enter" &&
        editor?.getText().trim().length &&
        !e.shiftKey &&
        !e.metaKey &&
        !e.nativeEvent.isComposing;
      if (isSubmit) onEnter?.();
    },
    [editor, onEnter, open],
  );

  // Memoize the DOM structure
  const suggestion = useMemo(() => {
    if (!open || disabledMention) return null;
    return createPortal(
      <Suggestion
        top={position.current?.top ?? 0}
        left={position.current?.left ?? 0}
        onClose={() => {
          setOpen(false);
        }}
        onSelectMention={(item) => {
          editor
            ?.chain()
            .focus()
            .insertContentAt(position.current!.range, [
              {
                type: "mention",
                attrs: item,
              },
            ])
            .run();
          setOpen(false);
        }}
      />,
      document.body,
    );
  }, [open, disabledMention]);

  const placeholderElement = useMemo(() => {
    if (!editor?.isEmpty) return null;

    return (
      <div className="absolute top-1 left-2 text-muted-foreground pointer-events-none">
        {placeholder}
      </div>
    );
  }, [editor?.isEmpty, placeholder]);

  useEffect(() => {
    if (open) {
      return () => {
        editor?.commands.focus();
      };
    }
    position.current = null;
    editor?.commands.focus();
  }, [open]);

  useEffect(() => {
    if (content != undefined && onChange) {
      if (
        typeof content == "string" &&
        content != latestContent.current?.text
      ) {
        editor?.commands.setContent(content);
      } else if (
        typeof content != "string" &&
        content != latestContent.current?.json
      ) {
        editor?.commands.setContent(content);
      }
    }
  }, [content]);

  const focus = useCallback(() => {
    editor?.commands.focus();
  }, [editor]);

  return (
    <div onClick={focus} className={cn("relative w-full", className)}>
      <EditorContent editor={editor} onKeyDown={handleKeyDown} />
      {suggestion}
      {placeholderElement}
    </div>
  );
}
