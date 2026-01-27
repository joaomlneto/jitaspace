import { forwardRef } from "react";
import { UnstyledButton, useProps } from "@mantine/core";
import {
  useRichTextEditorContext
  
} from "@mantine/tiptap";
import type {RichTextEditorControlProps} from "@mantine/tiptap";
import cx from "clsx";

import classes from "./Control.module.css";


const defaultProps: Partial<RichTextEditorControlProps> = {
  interactive: true,
};

export const Control = forwardRef<
  HTMLButtonElement,
  RichTextEditorControlProps
>((props, ref) => {
  const {
    className,
    active,
    children,
    interactive,
    classNames: _classNames,
    styles: _styles,
    vars: _vars,
    ...others
  } = useProps("RichTextEditorControl", defaultProps, props);
  const { unstyled } = useRichTextEditorContext();

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
      unstyled={unstyled}
      {...others}
    >
      {children}
    </UnstyledButton>
  );
});
Control.displayName = "CharacterLink";
