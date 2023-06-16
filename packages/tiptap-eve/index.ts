import TextStyle from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { EveLink, FontColorMark } from "./Extensions";

export const useEveEditor: typeof useEditor = (options, ...others) =>
  useEditor(
    {
      extensions: [
        StarterKit,
        TextStyle,
        Underline,
        //Link,
        EveLink,
        //FontNode,
        FontColorMark,
      ],
      ...options,
    },
    ...others,
  );
