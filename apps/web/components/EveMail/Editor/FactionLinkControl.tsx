import type { PopoverProps } from "@mantine/core";
import type React from "react";
import { forwardRef } from "react";
import { Button, Popover, useMantineTheme, useProps } from "@mantine/core";
import { useDisclosure, useInputState } from "@mantine/hooks";
import { useRichTextEditorContext } from "@mantine/tiptap";

import { EsiSearchSelect } from "@jitaspace/eve-components";
import { FactionalWarfareIcon } from "@jitaspace/eve-icons";
import { FactionAvatar } from "@jitaspace/ui";

import type { RichTextEditorControlBaseProps } from "~/components/EveMail/Editor/ControlBase";
import { ControlBase } from "~/components/EveMail/Editor/ControlBase";
import { getLinkedEntityId } from "~/components/EveMail/Editor/linkedEntityId";
import classes from "./LinkControl.module.css";

export interface RichTextEditorLinkControlProps extends Partial<RichTextEditorControlBaseProps> {
  /** Props added to Popover component */
  popoverProps?: Partial<PopoverProps>;
}

const FactionLinkIcon: RichTextEditorControlBaseProps["icon"] = ({ size }) => (
  <div style={{ position: "relative", width: size, height: size }}>
    <FactionalWarfareIcon fill alt="" />
  </div>
);

export const FactionLinkControl = forwardRef<
  HTMLButtonElement,
  RichTextEditorLinkControlProps
>((props, ref) => {
  const { icon, ...others } = useProps("RichTextEditorLinkControl", {}, props);

  const theme = useMantineTheme();
  const { editor, unstyled } = useRichTextEditorContext();

  const [factionId, setFactionId] = useInputState("");
  const [opened, { open, close }] = useDisclosure(false);

  const handleOpen = () => {
    open();
    const linkData = editor?.getAttributes("link");
    setFactionId(getLinkedEntityId(linkData?.href, ["faction"]));
  };

  const handleClose = () => {
    close();
    setFactionId("");
  };

  const setLink = () => {
    handleClose();
    if (factionId === "") {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor
        ?.chain()
        .focus()
        .extendMarkRange("link")
        .setLink({
          href: `showinfo:30//${factionId}`,
        })
        .run();
    }
  };

  const handleInputKeydown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      setLink();
    }
  };

  return (
    <Popover
      trapFocus
      shadow="md"
      withinPortal
      opened={opened}
      onClose={handleClose}
      offset={-44}
      zIndex={10000}
      unstyled={unstyled}
    >
      <Popover.Target>
        <ControlBase
          icon={icon ?? FactionLinkIcon}
          aria-label="Link Faction"
          title="Link Faction"
          onClick={handleOpen}
          active={editor?.isActive("link")}
          {...others}
          ref={ref}
        />
      </Popover.Target>

      <Popover.Dropdown
        style={{
          backgroundColor: theme.colors.dark[7],
        }}
      >
        <div className={classes.linkEditor}>
          <EsiSearchSelect
            categories={["faction"]}
            placeholder="Search Faction"
            type="url"
            value={factionId}
            onChange={setFactionId}
            classNames={{ input: classes.linkEditorInput }}
            onKeyDown={handleInputKeydown}
            unstyled={unstyled}
            comboboxProps={{ withinPortal: false }}
            leftSection={<FactionAvatar size={24} factionId={factionId} />}
          />

          <Button
            variant="default"
            onClick={setLink}
            className={classes.linkEditorSave}
            unstyled={unstyled}
          >
            Save
          </Button>
        </div>
      </Popover.Dropdown>
    </Popover>
  );
});
FactionLinkControl.displayName = "FactionLinkControl";
