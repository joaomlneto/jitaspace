import type { PopoverProps } from "@mantine/core";
import type React from "react";
import { forwardRef, useState } from "react";
import { Button, Popover, useMantineTheme, useProps } from "@mantine/core";
import { useDisclosure, useInputState } from "@mantine/hooks";
import { useRichTextEditorContext } from "@mantine/tiptap";

import {
  getUniverseStationsStationId,
  getUniverseStructuresStructureId,
} from "@jitaspace/esi-client";
import { isStationId } from "@jitaspace/esi-metadata";
import { EsiSearchSelect } from "@jitaspace/eve-components";
import { StationIcon } from "@jitaspace/eve-icons";
import { useAccessToken } from "@jitaspace/hooks";

import type { RichTextEditorControlBaseProps } from "~/components/EveMail/Editor/ControlBase";
import { StationAvatar, StructureAvatar } from "~/components/Avatar";
import { ControlBase } from "~/components/EveMail/Editor/ControlBase";
import { getLinkedEntityId } from "~/components/EveMail/Editor/linkedEntityId";
import classes from "./LinkControl.module.css";

export interface RichTextEditorLinkControlProps extends Partial<RichTextEditorControlBaseProps> {
  /** Props added to Popover component */
  popoverProps?: Partial<PopoverProps>;
}

const StationLinkIcon: RichTextEditorControlBaseProps["icon"] = ({ size }) => (
  <div style={{ position: "relative", width: size, height: size }}>
    <StationIcon fill alt="" />
  </div>
);

export const StationLinkControl = forwardRef<
  HTMLButtonElement,
  RichTextEditorLinkControlProps
>((props, ref) => {
  const { icon, ...others } = useProps("RichTextEditorLinkControl", {}, props);

  const theme = useMantineTheme();
  const { editor, unstyled } = useRichTextEditorContext();

  const [locationId, setLocationId] = useInputState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  // ESI only describes a structure to a character allowed to see it.
  const { authHeaders } = useAccessToken({
    scopes: ["esi-universe.read_structures.v1"],
  });

  // `EsiSearchSelect` holds its value as a string; the avatar takes a numeric
  // id, and has nothing to show before one is picked.
  const selectedId =
    locationId === "" ? undefined : Number.parseInt(locationId, 10);

  const handleOpen = () => {
    open();
    // A lookup that failed after the popover closed must not greet the next
    // open with its error.
    setLookupError(null);
    const linkData = editor?.getAttributes("link");
    setLocationId(getLinkedEntityId(linkData?.href, ["station", "structure"]));
  };

  const handleClose = () => {
    close();
    setLocationId("");
    setLookupError(null);
  };

  // A `showinfo:` link names the location's type as well as its id.
  const fetchTypeId = async (id: number): Promise<number | undefined> => {
    if (isStationId(id)) {
      return (await getUniverseStationsStationId(id)).data.type_id;
    }
    return (await getUniverseStructuresStructureId(id, { ...authHeaders })).data
      .type_id;
  };

  const setLink = async () => {
    if (locationId === "") {
      handleClose();
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const id = Number.parseInt(locationId, 10);
    const typeId = await fetchTypeId(id).catch(() => undefined);
    if (typeId === undefined) {
      setLookupError(
        isStationId(id)
          ? "Couldn't look up this station. Try again."
          : "Couldn't look up this structure. Log in with a character that can see it.",
      );
      return;
    }
    handleClose();
    editor
      ?.chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: `showinfo:${typeId}//${id}` })
      .run();
  };

  const handleInputKeydown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void setLink();
    }
  };

  return (
    <Popover
      trapFocus
      shadow="md"
      withinPortal
      opened={opened}
      onDismiss={handleClose}
      offset={-44}
      zIndex={10000}
      unstyled={unstyled}
    >
      <Popover.Target>
        <ControlBase
          icon={icon ?? StationLinkIcon}
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
            value={locationId}
            onChange={(value) => {
              setLookupError(null);
              setLocationId(value);
            }}
            error={lookupError}
            classNames={{ input: classes.linkEditorInput }}
            onKeyDown={handleInputKeydown}
            unstyled={unstyled}
            comboboxProps={{ withinPortal: false }}
            leftSection={
              selectedId !== undefined && !isStationId(selectedId) ? (
                <StructureAvatar size={24} structureId={selectedId} />
              ) : (
                <StationAvatar size={24} stationId={selectedId} />
              )
            }
          />

          <Button
            variant="default"
            onClick={() => void setLink()}
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
