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

import { SystemsIcon } from "@jitaspace/eve-icons";
import { EsiSearchSelect } from "@jitaspace/ui";

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

const SolarSystemLinkIcon: RichTextEditorControlBaseProps["icon"] = ({
  size,
  ...others
}) => <SystemsIcon width={Number(size)} {...others} />;

export const SolarSystemLinkControl = forwardRef<
  HTMLButtonElement,
  RichTextEditorLinkControlProps
>((props, ref) => {
  const { icon, ...others } = useProps("RichTextEditorLinkControl", {}, props);

  const theme = useMantineTheme();
  const { editor, unstyled } = useRichTextEditorContext();

  const [SolarSystemId, setSolarSystemId] = useInputState("");
  const [opened, { open, close }] = useDisclosure(false);

  const handleOpen = () => {
    open();
    const linkData = editor?.getAttributes("link");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    setSolarSystemId(linkData?.href || "");
  };

  const handleClose = () => {
    close();
    setSolarSystemId("");
  };

  const setLink = () => {
    handleClose();
    SolarSystemId === ""
      ? editor?.chain().focus().extendMarkRange("link").unsetLink().run()
      : editor
          ?.chain()
          .focus()
          .extendMarkRange("link")
          .setLink({
            href: `showinfo:5//${SolarSystemId}`,
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
          icon={icon || SolarSystemLinkIcon}
          aria-label="Link Solar System"
          title="Link Solar System"
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
            categories={["solar_system"]}
            placeholder="Search SolarSystem"
            type="url"
            value={SolarSystemId}
            onChange={setSolarSystemId}
            classNames={{ input: classes.linkEditorInput }}
            onKeyDown={handleInputKeydown}
            unstyled={unstyled}
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
SolarSystemLinkControl.displayName = "SolarSystemLinkControl";
