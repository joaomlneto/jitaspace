import React, { forwardRef } from "react";
import { UnstyledButton, useProps } from "@mantine/core";
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

  /*
  const { classes, cx } = useStyles(undefined, {
    name: "RichTextEditor",
    classNames,
    // @ts-expect-error annoying type conversion issue
    styles,
    unstyled,
    variant,
  });*/

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
