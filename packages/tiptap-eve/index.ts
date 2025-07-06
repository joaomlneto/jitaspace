"use client";

import { DependencyList } from "react";
import HardBreak from "@tiptap/extension-hard-break";
import TextStyle from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import { EditorOptions, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { EveFontColor, EveLink } from "./Extensions";

export const useEveEditor = (
  options: Partial<EditorOptions> & {
    immediatelyRender?: boolean;
    shouldRerenderOnTransaction?: boolean;
  },
  deps?: DependencyList | undefined,
) => {
  return useEditor(
    {
      extensions: [
        StarterKit.configure({}),
        HardBreak.extend({
          addKeyboardShortcuts() {
            return {
              Enter: () => this.editor.commands.setHardBreak(),
            };
          },
        }),
        TextStyle,
        Underline,
        EveLink,
        EveFontColor,
      ],
      ...options,
    },
    deps,
  );
};

export * from "./utils";
