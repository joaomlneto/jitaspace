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

import { ItemsIcon } from "@jitaspace/eve-icons";
import { EsiSearchSelect, TypeAvatar } from "@jitaspace/ui";

import {
  ControlBase,
  type RichTextEditorControlBaseProps,
} from "~/components/EveMail/Editor/ControlBase";

export interface RichTextEditorLinkControlProps
  extends Partial<RichTextEditorControlBaseProps> {
  /** Props added to Popover component */
  popoverProps?: Partial<PopoverProps>;
}

const ItemTypeLinkIcon: RichTextEditorControlBaseProps["icon"] = ({
  size,
  ...others
  // @ts-expect-error FIXME MANTINE V7 MIGRATION
}) => <ItemsIcon width={px(size)} {...others} />;

export const ItemTypeLinkControl = forwardRef<
  HTMLButtonElement,
  RichTextEditorLinkControlProps
>((props, ref) => {
  const { icon, ...others } = useProps("RichTextEditorLinkControl", {}, props);

  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const { editor, unstyled } = useRichTextEditorContext();

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

  const [itemTypeId, setItemTypeId] = useInputState("");
  const [opened, { open, close }] = useDisclosure(false);

  const handleOpen = () => {
    open();
    const linkData = editor?.getAttributes("link");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    setItemTypeId(linkData?.href || "");
  };

  const handleClose = () => {
    close();
    setItemTypeId("");
  };

  const setLink = () => {
    handleClose();
    itemTypeId === ""
      ? editor?.chain().focus().extendMarkRange("link").unsetLink().run()
      : editor
          ?.chain()
          .focus()
          .extendMarkRange("link")
          .setLink({
            href: `showinfo:${itemTypeId}`,
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
          icon={icon || ItemTypeLinkIcon}
          aria-label="Link ItemType"
          title="Link ItemType"
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
            categories={["inventory_type"]}
            placeholder="Search Item Type"
            type="url"
            value={itemTypeId}
            onChange={setItemTypeId}
            styles={{ input: classes.linkEditorInput }}
            onKeyDown={handleInputKeydown}
            unstyled={unstyled}
            leftSection={
              <TypeAvatar size={24} typeId={itemTypeId} variant="render" />
            }
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
ItemTypeLinkControl.displayName = "ItemTypeLinkControl";
