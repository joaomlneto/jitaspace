import { Stack, Text } from "@mantine/core";
import {
  Link,
  RichTextEditor,
  type RichTextEditorProps,
} from "@mantine/tiptap";
import { Color } from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

type EvemailEditorProps = Omit<RichTextEditorProps, "editor" | "children"> & {
  content: string;
  onContentUpdate: (content: string) => void;
};

export default function EvemailEditor({
  content,
  onContentUpdate,
  ...otherProps
}: EvemailEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, TextStyle, Underline, Link, Color],
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
