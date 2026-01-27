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

import { getUniverseStationsStationId } from "@jitaspace/esi-client";
import { StationIcon } from "@jitaspace/eve-icons";
import { EsiSearchSelect, StationAvatar } from "@jitaspace/ui";

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

const StationLinkIcon: RichTextEditorControlBaseProps["icon"] = ({
  size,
  ...others
}) => <StationIcon width={Number(size)} {...others} />;

export const StationLinkControl = forwardRef<
  HTMLButtonElement,
  RichTextEditorLinkControlProps
>((props, ref) => {
  const { icon, ...others } = useProps("RichTextEditorLinkControl", {}, props);

  const theme = useMantineTheme();
  const { editor, unstyled } = useRichTextEditorContext();

  const [stationId, setStationId] = useInputState("");
  const [opened, { open, close }] = useDisclosure(false);

  const handleOpen = () => {
    open();
    const linkData = editor?.getAttributes("link");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    setStationId(linkData?.href || "");
  };

  const handleClose = () => {
    close();
    setStationId("");
  };

  const setLink = () => {
    void getUniverseStationsStationId(parseInt(stationId)).then((data) => {
      handleClose();
      stationId === ""
        ? editor?.chain().focus().extendMarkRange("link").unsetLink().run()
        : editor
            ?.chain()
            .focus()
            .extendMarkRange("link")
            .setLink({
              href: `showinfo:${data.data.type_id}//${stationId}`,
            })
            .run();
    });
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
          icon={icon || StationLinkIcon}
          aria-label="Link Station"
          title="Link Station"
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
            categories={["station", "structure"]}
            placeholder="Search Station"
            type="url"
            value={stationId}
            onChange={setStationId}
            classNames={{ input: classes.linkEditorInput }}
            onKeyDown={handleInputKeydown}
            unstyled={unstyled}
            leftSection={<StationAvatar size={24} stationId={stationId} />}
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
StationLinkControl.displayName = "StationLinkControl";
