import React, { forwardRef } from "react";
import {
  rem,
  UnstyledButton,
  useMantineColorScheme,
  useMantineTheme,
  useProps,
} from "@mantine/core";
import {
  useRichTextEditorContext,
  type RichTextEditorControlProps,
} from "@mantine/tiptap";

/**
 * THIS IS COPIED FROM MANTINE... WE JUST WANT TO MAKE MORE CONTROLS!
 */
const defaultProps: Partial<RichTextEditorControlProps> = {
  interactive: true,
};

export const Control = forwardRef<
  HTMLButtonElement,
  RichTextEditorControlProps
>((props, ref) => {
  const { className, active, children, interactive, ...others } = useProps(
    "RichTextEditorControl",
    defaultProps,
    props,
  );
  const { unstyled } = useRichTextEditorContext();

  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const classes = {
    control: {
      backgroundColor:
        colorScheme === "dark" ? theme.colors.dark[6] : theme.white,
      minWidth: rem(26),
      height: rem(26),
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      border: `${rem(1)} solid ${
        colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[4]
      }`,
      borderRadius: theme.radius,
      cursor: "default",

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      "&[data-interactive]": {
        cursor: "pointer",
        // FIXME MANTINE V7 MIGRATION
        /*
        ...theme.fn.hover({
          backgroundColor:
            theme.colorScheme === "dark"
              ? theme.colors.dark[5]
              : theme.colors.gray[0],
        }),*/
      },

      "&[data-active]": {
        backgroundColor: theme.colors.background,
        color: theme.colors.color,

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        "&:hover": {
          // FIXME MANTINE V7 MIGRATION
          //...theme.fn.hover({ backgroundColor: colors.hover }),
        },
      },
    },
  };

  return (
    /* @ts-expect-error FIXME MANTINE V7 MIGRATION */
    <UnstyledButton
      // FIXME MANTINE V7 MIGRATION
      //classNames={{ root: classes.control }}
      data-rich-text-editor-control
      // @ts-expect-error: property can be overwritten
      tabIndex={interactive ? 0 : -1}
      data-interactive={interactive || undefined}
      data-active={active || undefined}
      // @ts-expect-error: property can be overwritten
      aria-pressed={(active && interactive) || undefined}
      // @ts-expect-error: property can be overwritten
      aria-hidden={!interactive || undefined}
      ref={ref}
      unstyled={unstyled}
      {...others}
    >
      {children}
    </UnstyledButton>
  );
});
Control.displayName = "CharacterLink";
