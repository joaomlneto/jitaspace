import type React from "react";
import { forwardRef } from "react";
import {
  Button,
  Popover,
  useMantineTheme,
  useProps
  
} from "@mantine/core";
import type {PopoverProps} from "@mantine/core";
import { useDisclosure, useInputState, useWindowEvent } from "@mantine/hooks";
import { useRichTextEditorContext } from "@mantine/tiptap";

import { CorporationIcon } from "@jitaspace/eve-icons";
import { CorporationAvatar, EsiSearchSelect } from "@jitaspace/ui";

import {
  ControlBase
  
} from "~/components/EveMail/Editor/ControlBase";
import type {RichTextEditorControlBaseProps} from "~/components/EveMail/Editor/ControlBase";
import classes from "./LinkControl.module.css";


export interface RichTextEditorLinkControlProps
  extends Partial<RichTextEditorControlBaseProps> {
  /** Props added to Popover component */
  popoverProps?: Partial<PopoverProps>;
}

const CorporationLinkIcon: RichTextEditorControlBaseProps["icon"] = ({
  size,
  ...others
}) => <CorporationIcon width={Number(size)} {...others} />;

export const CorporationLinkControl = forwardRef<
  HTMLButtonElement,
  RichTextEditorLinkControlProps
>((props, ref) => {
  const { icon, ...others } = useProps("RichTextEditorLinkControl", {}, props);

  const theme = useMantineTheme();
  const { editor, unstyled } = useRichTextEditorContext();

  const [corporationId, setCorporationId] = useInputState("");
  const [opened, { open, close }] = useDisclosure(false);

  const handleOpen = () => {
    open();
    const linkData = editor?.getAttributes("link");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    setCorporationId(linkData?.href || "");
  };

  const handleClose = () => {
    close();
    setCorporationId("");
  };

  const setLink = () => {
    handleClose();
    corporationId === ""
      ? editor?.chain().focus().extendMarkRange("link").unsetLink().run()
      : editor
          ?.chain()
          .focus()
          .extendMarkRange("link")
          .setLink({
            href: `showinfo:2//${corporationId}`,
          })
          .run();
  };

  const handleInputKeydown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      setLink();
    }
  };

  useWindowEvent("edit-link", handleOpen, false);

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
          icon={icon || CorporationLinkIcon}
          aria-label="Link Corporation"
          title="Link Corporation"
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
            categories={["corporation"]}
            placeholder="Search Corporation"
            type="url"
            value={corporationId}
            onChange={setCorporationId}
            classNames={{ input: classes.linkEditorInput }}
            onKeyDown={handleInputKeydown}
            unstyled={unstyled}
            leftSection={
              <CorporationAvatar size={24} corporationId={corporationId} />
            }
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
CorporationLinkControl.displayName = "CorporationLinkControl";
