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

  // `editor` is null on the first render (TipTap creates it in an effect after
  // mount; see useEveEditor). Subtract the wrapping <p></p> (7 chars) to get
  // the real content length; 0 while the editor is still null.
  const contentLength = (editor?.getHTML().length ?? 7) - 7;

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
            <Text size="sm" color={contentLength >= 8000 ? "red" : "dimmed"}>
              {contentLength}/8000
            </Text>
          </RichTextEditor.ControlsGroup>
        </RichTextEditor.Toolbar>
        <RichTextEditor.Content />
      </RichTextEditor>
    </Stack>
  );
}
