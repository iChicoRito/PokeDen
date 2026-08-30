"use client";

import { useEffect, useRef } from "react";

import { Placeholder } from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, Link as LinkIcon, List } from "lucide-react";

import { Button } from "@/components/ui/button";

type RichNoteEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
};

const editorClasses =
  "note-editor-content min-h-64 max-h-96 overflow-y-auto rounded-lg border border-input bg-transparent px-3 py-2";

const linkConfig = {
  openOnClick: false,
  autolink: true,
  linkOnPaste: true,
  HTMLAttributes: {
    target: "_blank",
    rel: "noreferrer noopener",
  },
} as const;

export function RichNoteEditor({ value, onChange, onBlur, placeholder }: RichNoteEditorProps) {
  const onChangeRef = useRef(onChange);
  const onBlurRef = useRef(onBlur);
  onChangeRef.current = onChange;
  onBlurRef.current = onBlur;

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          link: linkConfig,
          heading: { levels: [1, 2, 3] },
        }),
        Placeholder.configure({ placeholder: placeholder ?? "Write your note…" }),
      ],
      content: value,
      immediatelyRender: false,
      shouldRerenderOnTransaction: true,
      editorProps: {
        attributes: {
          class: editorClasses,
          "aria-label": "Note content",
        },
        handleDOMEvents: {
          keydown: (_view, event) => {
            // Keep editor shortcuts such as Ctrl/Cmd+B from reaching global app shortcuts.
            if (event.ctrlKey || event.metaKey) event.stopPropagation();
            return false;
          },
        },
      },
      onUpdate: ({ editor: current }) => {
        onChangeRef.current(current.getHTML());
      },
      onBlur: () => {
        onBlurRef.current?.();
      },
    },
    [],
  );

  // Sync external value changes (note switching) into the editor.
  useEffect(() => {
    if (!editor) return;
    if (value === editor.getHTML()) return;
    // Empty-value guard: "" and an empty <p></p> document are the same state.
    if (!value && editor.isEmpty) return;
    editor.commands.setContent(value, {
      emitUpdate: false,
      parseOptions: { preserveWhitespace: false },
    });
  }, [editor, value]);

  const runWithEditor = (run: (target: NonNullable<typeof editor>) => void) => () => {
    if (editor) run(editor);
  };

  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-end gap-1 pb-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Bold"
          aria-pressed={editor?.isActive("bold") ?? false}
          className={editor?.isActive("bold") ? "bg-muted" : ""}
          onClick={runWithEditor((target) => target.chain().focus().toggleBold().run())}
        >
          <Bold />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Italic"
          aria-pressed={editor?.isActive("italic") ?? false}
          className={editor?.isActive("italic") ? "bg-muted" : ""}
          onClick={runWithEditor((target) => target.chain().focus().toggleItalic().run())}
        >
          <Italic />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Bullet list"
          aria-pressed={editor?.isActive("bulletList") ?? false}
          className={editor?.isActive("bulletList") ? "bg-muted" : ""}
          onClick={runWithEditor((target) => target.chain().focus().toggleBulletList().run())}
        >
          <List />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={editor?.isActive("link") ? "Remove link" : "Add link"}
          aria-pressed={editor?.isActive("link") ?? false}
          className={editor?.isActive("link") ? "bg-muted" : ""}
          onClick={runWithEditor((target) => {
            if (target.isActive("link")) {
              target.chain().focus().unsetLink().run();
              return;
            }
            const url = window.prompt("Link URL", "https://");
            if (url) target.chain().focus().setLink({ href: url }).run();
          })}
        >
          <LinkIcon />
        </Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
