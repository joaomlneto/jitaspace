import type { RichTextEditorProps } from "@mantine/tiptap";
import { Stack, Text } from "@mantine/core";
import { RichTextEditor } from "@mantine/tiptap";

import { useEveEditor } from "@jitaspace/tiptap-eve";

import { AllianceLinkControl } from "~/components/EveMail/Editor/AllianceLinkControl";
import { CharacterLinkControl } from "~/components/EveMail/Editor/CharacterLinkControl";
import { ConstellationLinkControl } from "~/components/EveMail/Editor/ConstellationLinkControl";
import { CorporationLinkControl } from "~/components/EveMail/Editor/CorporationLinkControl";
import { ItemTypeLinkControl } from "~/components/EveMail/Editor/ItemTypeLinkControl";
import { RegionLinkControl } from "~/components/EveMail/Editor/RegionLinkControl";
import { SolarSystemLinkControl } from "~/components/EveMail/Editor/SolarSystemLinkControl";
import { StationLinkControl } from "~/components/EveMail/Editor/StationLinkControl";

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
      // we remove the outermost <p></p> tag
      const html = editor.getHTML();
      onContentUpdate(html.substring(3, html.length - 4));
    },
  });

  if (!editor) {
    return <Text>Loading editor...</Text>;
  }

  return (
    <Stack>
      <RichTextEditor editor={editor} mih={200} {...otherProps}>
        <RichTextEditor.Toolbar sticky stickyOffset={80}>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Bold />
            <RichTextEditor.Italic />
            <RichTextEditor.Underline />
            <RichTextEditor.ClearFormatting />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Link />
            <CharacterLinkControl />
            <CorporationLinkControl />
            <AllianceLinkControl />
            <RegionLinkControl />
            <ConstellationLinkControl />
            <SolarSystemLinkControl />
            <StationLinkControl />
            <ItemTypeLinkControl />
            <RichTextEditor.Unlink />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup ml="auto">
            <Text
              size="sm"
              color={
                (editor?.getHTML().length ?? 0) - 7 >= 8000 ? "red" : "dimmed"
              }
            >
              {(editor?.getHTML().length ?? 0) - 7}/8000
            </Text>
          </RichTextEditor.ControlsGroup>
        </RichTextEditor.Toolbar>
        <RichTextEditor.Content />
      </RichTextEditor>
    </Stack>
  );
}
