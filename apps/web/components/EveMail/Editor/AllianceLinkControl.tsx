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

import { AlliancesIcon } from "@jitaspace/eve-icons";
import { AllianceAvatar, EsiSearchSelect } from "@jitaspace/ui";

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

const AllianceLinkIcon: RichTextEditorControlBaseProps["icon"] = ({
  size,
  ...others
}) => <AlliancesIcon width={px(size)} {...others} />;

export const AllianceLinkControl = forwardRef<
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

  const [allianceId, setAllianceId] = useInputState("");
  const [opened, { open, close }] = useDisclosure(false);

  const handleOpen = () => {
    open();
    const linkData = editor?.getAttributes("link");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    setAllianceId(linkData?.href || "");
  };

  const handleClose = () => {
    close();
    setAllianceId("");
  };

  const setLink = () => {
    handleClose();
    allianceId === ""
      ? editor.chain().focus().extendMarkRange("link").unsetLink().run()
      : editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({
            href: `showinfo:16159//${allianceId}`,
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
          icon={icon || AllianceLinkIcon}
          aria-label="Link Alliance"
          title="Link Alliance"
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
            categories={["alliance"]}
            placeholder="Search Alliance"
            type="url"
            value={allianceId}
            onChange={setAllianceId}
            classNames={{ input: classes.linkEditorInput }}
            onKeyDown={handleInputKeydown}
            unstyled={unstyled}
            icon={<AllianceAvatar size={24} allianceId={allianceId} />}
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
AllianceLinkControl.displayName = "AllianceLinkControl";
