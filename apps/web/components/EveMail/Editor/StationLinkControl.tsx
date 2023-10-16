import React, { forwardRef } from "react";
import {
  Button,
  createStyles,
  Popover,
  px,
  rem,
  useComponentDefaultProps,
  type PopoverProps,
} from "@mantine/core";
import { useDisclosure, useInputState, useWindowEvent } from "@mantine/hooks";
import { useRichTextEditorContext } from "@mantine/tiptap";

import { getUniverseStationsStationId } from "@jitaspace/esi-client-kubb";
import { StationIcon } from "@jitaspace/eve-icons";
import { EsiSearchSelect } from "@jitaspace/ui";

import {
  ControlBase,
  type RichTextEditorControlBaseProps,
} from "~/components/EveMail/Editor/ControlBase";

const useStyles = createStyles((theme) => {
  const colors = theme.fn.variant({ variant: "light" });
  return {
    linkEditor: {
      display: "flex",
    },

    linkEditorInput: {
      borderTopRightRadius: 0,
      borderBottomRightRadius: 0,
      borderRight: 0,
    },

    linkEditorExternalControl: {
      backgroundColor:
        theme.colorScheme === "dark"
          ? theme.fn.rgba(theme.colors.dark[7], 0.5)
          : theme.white,
      border: `${rem(1)} solid ${
        theme.colorScheme === "dark"
          ? theme.colors.dark[4]
          : theme.colors.gray[4]
      }`,
      height: rem(24),
      width: rem(24),
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      borderRadius: theme.fn.radius(),

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      "&[data-active]": {
        backgroundColor: colors.background,
        borderColor: colors.border,
        color: colors.color,
        ...theme.fn.hover({ background: colors.hover }),
      },
    },

    linkEditorSave: {
      borderTopLeftRadius: 0,
      borderBottomLeftRadius: 0,
    },
  };
});

export interface RichTextEditorLinkControlProps
  extends Partial<RichTextEditorControlBaseProps> {
  /** Props added to Popover component */
  popoverProps?: Partial<PopoverProps>;
}

const StationLinkIcon: RichTextEditorControlBaseProps["icon"] = ({
  size,
  ...others
}) => <StationIcon width={px(size)} {...others} />;

export const StationLinkControl = forwardRef<
  HTMLButtonElement,
  RichTextEditorLinkControlProps
>((props, ref) => {
  const { icon, ...others } = useComponentDefaultProps(
    "RichTextEditorLinkControl",
    {},
    props,
  );

  const { editor, classNames, styles, unstyled, variant } =
    useRichTextEditorContext();
  const { classes } = useStyles(undefined, {
    name: "RichTextEditor",
    classNames,
    // @ts-expect-error annoying type conversion issue
    styles,
    unstyled,
    variant,
  });

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
        ? editor.chain().focus().extendMarkRange("link").unsetLink().run()
        : editor
            .chain()
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
          unstyled={unstyled}
          {...others}
          ref={ref}
        />
      </Popover.Target>

      <Popover.Dropdown
        sx={(theme) => ({
          backgroundColor:
            theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.white,
        })}
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
