import React, { forwardRef } from "react";
import {
  Button,
  Popover,
  px,
  rem,
  rgba,
  useMantineColorScheme,
  useMantineTheme,
  useProps,
  type PopoverProps,
} from "@mantine/core";
import { useDisclosure, useInputState, useWindowEvent } from "@mantine/hooks";
import { useRichTextEditorContext } from "@mantine/tiptap";

import { SystemsIcon } from "@jitaspace/eve-icons";
import { EsiSearchSelect } from "@jitaspace/ui";

import {
  ControlBase,
  type RichTextEditorControlBaseProps,
} from "~/components/EveMail/Editor/ControlBase";

export interface RichTextEditorLinkControlProps
  extends Partial<RichTextEditorControlBaseProps> {
  /** Props added to Popover component */
  popoverProps?: Partial<PopoverProps>;
}

const SolarSystemLinkIcon: RichTextEditorControlBaseProps["icon"] = ({
  size,
  ...others
  // @ts-expect-error FIXME MANTINE V7 MIGRATION
}) => <SystemsIcon width={px(size)} {...others} />;

export const SolarSystemLinkControl = forwardRef<
  HTMLButtonElement,
  RichTextEditorLinkControlProps
>((props, ref) => {
  const { icon, ...others } = useProps("RichTextEditorLinkControl", {}, props);

  const { editor, unstyled } = useRichTextEditorContext();
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();

  const classes = {
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
        colorScheme === "dark" ? rgba(theme.colors.dark[7], 0.5) : theme.white,
      border: `${rem(1)} solid ${
        colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[4]
      }`,
      height: rem(24),
      width: rem(24),
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      borderRadius: theme.radius,

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      "&[data-active]": {
        backgroundColor: theme.colors.background,
        borderColor: theme.colors.border,
        color: theme.colors.color,
        // FIXME MANTINE V7 MIGRATION
        //...theme.fn.hover({ background: colors.hover }),
      },
    },

    linkEditorSave: {
      borderTopLeftRadius: 0,
      borderBottomLeftRadius: 0,
    },
  };

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
          //unstyled={unstyled}
          {...others}
          ref={ref}
        />
      </Popover.Target>

      <Popover.Dropdown
        style={{
          backgroundColor:
            colorScheme === "dark" ? theme.colors.dark[7] : theme.white,
        }}
      >
        <div style={classes.linkEditor}>
          <EsiSearchSelect
            categories={["solar_system"]}
            placeholder="Search SolarSystem"
            type="url"
            value={SolarSystemId}
            onChange={setSolarSystemId}
            styles={{ input: classes.linkEditorInput }}
            onKeyDown={handleInputKeydown}
            unstyled={unstyled}
          />

          <Button
            variant="default"
            onClick={setLink}
            style={classes.linkEditorSave}
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
