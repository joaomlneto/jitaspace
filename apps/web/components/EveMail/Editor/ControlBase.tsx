import React, { forwardRef } from "react";
import { type RichTextEditorControlProps } from "@mantine/tiptap";

import { Control } from "./Control";

export interface RichTextEditorControlBaseProps
  extends RichTextEditorControlProps {
  icon: React.FC<{ size: number | string }>;
}

export const ControlBase = forwardRef<
  HTMLButtonElement,
  RichTextEditorControlBaseProps
>(({ active, icon: Icon, ...others }, ref) => (
  <Control active={active} ref={ref} {...others}>
    <Icon size="1rem" />
  </Control>
));

ControlBase.displayName = "ControlBase";
