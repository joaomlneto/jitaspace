import React from "react";
import { Stack, Text } from "@mantine/core";
import { RichTextEditor, type RichTextEditorProps } from "@mantine/tiptap";

import { useEveEditor } from "@jitaspace/tiptap-eve";

type EvemailEditorProps = Omit<RichTextEditorProps, "editor" | "children"> & {
  content: string;
  onContentUpdate: (content: string) => void;
};

export function MailMessageEditor({
  content,
  onContentUpdate,
  ...otherProps
}: EvemailEditorProps) {
  const editor = useEveEditor({
    content,
    onUpdate: ({ editor }) => {
      onContentUpdate(editor.getHTML());
    },
  });

  return (
    <Stack>
      <RichTextEditor editor={editor} {...otherProps} mih={200}>
        <RichTextEditor.Toolbar sticky stickyOffset={80}>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Bold />
            <RichTextEditor.Italic />
            <RichTextEditor.Underline />
            <RichTextEditor.Link />
            <RichTextEditor.ClearFormatting />
            <Text ml="xl" size="md">
              Text formatting is still in the works!
            </Text>
          </RichTextEditor.ControlsGroup>
        </RichTextEditor.Toolbar>
        <RichTextEditor.Content />
      </RichTextEditor>
    </Stack>
  );
}
