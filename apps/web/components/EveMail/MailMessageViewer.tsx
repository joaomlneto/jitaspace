import React from "react";
import { type RichTextEditorProps } from "@mantine/tiptap";

import { useEveEditor } from "@jitaspace/tiptap-eve";

type MailMessageViewerProps = Omit<
  RichTextEditorProps,
  "editor" | "children"
> & {
  content: string;
};

export function MailMessageViewer({ content }: MailMessageViewerProps) {
  const editor = useEveEditor({
    content,
  });

  /*
  return (
    <Stack>
      <RichTextEditor editor={editor} {...otherProps}>
        <RichTextEditor.Content />
      </RichTextEditor>
    </Stack>
  );*/

  return (
    <div
      dangerouslySetInnerHTML={{ __html: editor?.getHTML() ?? "Loading..." }}
    />
  );
}
