import { forwardRef } from "react";
import {
  createStyles,
  rem,
  UnstyledButton,
  useComponentDefaultProps,
} from "@mantine/core";
import {
  useRichTextEditorContext,
  type RichTextEditorControlProps,
} from "@mantine/tiptap";

/**
 * THIS IS COPIED FROM MANTINE... WE JUST WANT TO MAKE MORE CONTROLS!
 */

const useStyles = createStyles((theme) => {
  const colors = theme.fn.variant({ variant: "light" });
  return {
    control: {
      backgroundColor:
        theme.colorScheme === "dark" ? theme.colors.dark[6] : theme.white,
      minWidth: rem(26),
      height: rem(26),
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      border: `${rem(1)} solid ${
        theme.colorScheme === "dark"
          ? theme.colors.dark[4]
          : theme.colors.gray[4]
      }`,
      borderRadius: theme.fn.radius(),
      cursor: "default",

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      "&[data-interactive]": {
        cursor: "pointer",
        ...theme.fn.hover({
          backgroundColor:
            theme.colorScheme === "dark"
              ? theme.colors.dark[5]
              : theme.colors.gray[0],
        }),
      },

      "&[data-active]": {
        backgroundColor: colors.background,
        color: colors.color,

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        "&:hover": {
          ...theme.fn.hover({ backgroundColor: colors.hover }),
        },
      },
    },
  };
});

const defaultProps: Partial<RichTextEditorControlProps> = {
  interactive: true,
};

export const Control = forwardRef<
  HTMLButtonElement,
  RichTextEditorControlProps
>((props, ref) => {
  const { className, active, children, interactive, ...others } =
    useComponentDefaultProps("RichTextEditorControl", defaultProps, props);
  const { classNames, styles, unstyled, variant } = useRichTextEditorContext();

  const { classes, cx } = useStyles(undefined, {
    name: "RichTextEditor",
    classNames,
    // @ts-expect-error annoying type conversion issue
    styles,
    unstyled,
    variant,
  });
  return (
    <UnstyledButton
      className={cx(classes.control, className)}
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
      // @ts-expect-error: property can be overwritten
      unstyled={unstyled}
      {...others}
    >
      {children}
    </UnstyledButton>
  );
});
Control.displayName = "CharacterLink";
