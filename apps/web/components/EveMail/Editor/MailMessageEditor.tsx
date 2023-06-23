import React from "react";
import { Stack, Text } from "@mantine/core";
import { RichTextEditor, type RichTextEditorProps } from "@mantine/tiptap";

import { AllianceLinkControl } from "~/components/EveMail/Editor/AllianceLinkControl";
import { CharacterLinkControl } from "~/components/EveMail/Editor/CharacterLinkControl";
import { CorporationLinkControl } from "~/components/EveMail/Editor/CorporationLinkControl";
import { ItemTypeLinkControl } from "~/components/EveMail/Editor/ItemTypeLinkControl";
import { SolarSystemLinkControl } from "~/components/EveMail/Editor/SolarSystemLinkControl";
import { StationLinkControl } from "~/components/EveMail/Editor/StationLinkControl";
import { useEveEditor } from "../../../../../packages/tiptap-eve";

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
            <SolarSystemLinkControl />
            <StationLinkControl />
            <ItemTypeLinkControl />
            <RichTextEditor.Unlink />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <Text
              ml="xl"
              size="sm"
              color={
                (editor?.getHTML().length ?? 0) - 7 >= 8000 ? "red" : "dimmed"
              }
            >
              {(editor?.getHTML().length ?? 0) - 7}/8000
            </Text>
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <Text ml="xl" size="md">
              Text formatting not fully supported
            </Text>
          </RichTextEditor.ControlsGroup>
        </RichTextEditor.Toolbar>
        <RichTextEditor.Content />
      </RichTextEditor>
    </Stack>
  );
}
