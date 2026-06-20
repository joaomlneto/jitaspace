import type { PopoverProps } from "@mantine/core";
import type React from "react";
import { forwardRef } from "react";
import { Button, Popover, useMantineTheme, useProps } from "@mantine/core";
import { useDisclosure, useInputState, useWindowEvent } from "@mantine/hooks";
import { useRichTextEditorContext } from "@mantine/tiptap";

import { EsiSearchSelect } from "@jitaspace/eve-components";
import { Systems2Icon } from "@jitaspace/eve-icons";

import type { RichTextEditorControlBaseProps } from "~/components/EveMail/Editor/ControlBase";
import { ControlBase } from "~/components/EveMail/Editor/ControlBase";
import classes from "./LinkControl.module.css";

export interface RichTextEditorLinkControlProps extends Partial<RichTextEditorControlBaseProps> {
  /** Props added to Popover component */
  popoverProps?: Partial<PopoverProps>;
}

const ConstellationLinkIcon: RichTextEditorControlBaseProps["icon"] = ({
  size,
}) => (
  <div style={{ position: "relative", width: size, height: size }}>
    <Systems2Icon fill alt="" />
  </div>
);

export const ConstellationLinkControl = forwardRef<
  HTMLButtonElement,
  RichTextEditorLinkControlProps
>((props, ref) => {
  const { icon, ...others } = useProps("RichTextEditorLinkControl", {}, props);

  const theme = useMantineTheme();
  const { editor, unstyled } = useRichTextEditorContext();

  const [constellationId, setConstellationId] = useInputState("");
  const [opened, { open, close }] = useDisclosure(false);

  const handleOpen = () => {
    open();
    const linkData = editor?.getAttributes("link");
    const href = typeof linkData?.href === "string" ? linkData.href : "";
    setConstellationId(href);
  };

  const handleClose = () => {
    close();
    setConstellationId("");
  };

  const setLink = () => {
    handleClose();
    if (constellationId === "") {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor
        ?.chain()
        .focus()
        .extendMarkRange("link")
        .setLink({
          href: `showinfo:4//${constellationId}`,
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
          icon={icon ?? ConstellationLinkIcon}
          aria-label="Link Constellation"
          title="Link Constellation"
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
            categories={["constellation"]}
            placeholder="Search Constellation"
            type="url"
            value={constellationId}
            onChange={setConstellationId}
            classNames={{ input: classes.linkEditorInput }}
            onKeyDown={handleInputKeydown}
            unstyled={unstyled}
            comboboxProps={{ withinPortal: false }}
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
ConstellationLinkControl.displayName = "ConstellationLinkControl";
