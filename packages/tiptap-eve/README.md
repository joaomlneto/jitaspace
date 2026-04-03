# @jitaspace/tiptap-eve

[Tiptap](https://tiptap.dev) rich-text editor configured for EVE Online in-game HTML.

## Overview

Provides a `useEveEditor` hook that returns a Tiptap editor instance pre-configured with the extensions and formatting rules needed to read and write EVE Online in-game HTML (as used in EVE mails, corporation bulletins, etc.).

## Usage

```tsx
import { useEveEditor } from "@jitaspace/tiptap-eve";
import { RichTextEditor } from "@mantine/tiptap";

function EveMailComposer({ content }: { content: string }) {
  const editor = useEveEditor({ content });
  return <RichTextEditor editor={editor}>...</RichTextEditor>;
}
```

## Dependencies

- `@tiptap/react` + `@tiptap/starter-kit` — Core editor
- `@mantine/tiptap` — Mantine editor UI components
- Various `@tiptap/*` extension packages for formatting support
