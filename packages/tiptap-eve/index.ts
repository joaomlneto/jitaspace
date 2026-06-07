"use client";

import { DependencyList } from "react";
import { Extension } from "@tiptap/core";
import { TextStyle } from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import { EditorOptions, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { EveFontColor, EveLink } from "./Extensions";

// Adds Enter → <br> on top of StarterKit's default Shift-Enter/Mod-Enter.
// Using Extension.create (not HardBreak.extend) avoids duplicate "hardBreak"
// extension names which caused a ProseMirror keyed-plugin RangeError.
const EnterHardBreak = Extension.create({
  name: "enterHardBreak",
  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.setHardBreak(),
    };
  },
});

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
        // TipTap 3's StarterKit bundles Link and Underline — disable them
        // so they don't collide with our custom EveLink and standalone Underline.
        StarterKit.configure({
          link: false,
          underline: false,
        }),
        EnterHardBreak,
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
