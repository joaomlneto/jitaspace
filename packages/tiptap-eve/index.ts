"use client";

import type { EditorOptions } from "@tiptap/react";
import type { DependencyList } from "react";
import HardBreak from "@tiptap/extension-hard-break";
import { TextStyle } from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { EveFontColor, EveLink } from "./Extensions";

export const useEveEditor = (
  options: Partial<EditorOptions> & {
    immediatelyRender?: boolean;
    shouldRerenderOnTransaction?: boolean;
  },
  deps?: DependencyList,
) => {
  return useEditor(
    {
      // TipTap 3 auto-detects Next.js and, unless this is set explicitly,
      // returns `null` on the first render to avoid SSR hydration mismatches
      // (it creates the editor in an effect after mount). Make that the
      // explicit contract so it also holds outside Next, and so consumers
      // know to tolerate a `null` editor on the first render. Callers can
      // still override it via `options`.
      immediatelyRender: false,
      extensions: [
        // TipTap 3's StarterKit now bundles Link, Underline and HardBreak.
        // Disable them here so they don't collide with the customized versions
        // (EveLink, the standalone Underline, and the HardBreak below) we add.
        StarterKit.configure({
          link: false,
          underline: false,
          hardBreak: false,
        }),
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

export * from "./Extensions";
export * from "./utils";
