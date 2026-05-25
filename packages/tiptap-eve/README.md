# @jitaspace/tiptap-eve

[![npm version](https://img.shields.io/npm/v/@jitaspace/tiptap-eve)](https://www.npmjs.com/package/@jitaspace/tiptap-eve)
[![npm downloads](https://img.shields.io/npm/dm/@jitaspace/tiptap-eve)](https://www.npmjs.com/package/@jitaspace/tiptap-eve)
[![license](https://img.shields.io/npm/l/@jitaspace/tiptap-eve)](./LICENSE)

[Tiptap](https://tiptap.dev) rich-text editor configured for [EVE Online](https://www.eveonline.com) in-game HTML — EVE mails, corporation bulletins, and similar formatted content.

## Installation

```bash
npm install @jitaspace/tiptap-eve
# or
pnpm add @jitaspace/tiptap-eve
```

Requires `react` as a peer dependency.

## Overview

EVE Online uses a non-standard subset of HTML for rich text (bold, italic, underline, font color, hyperlinks with `showinfo:` and other custom protocols). This package provides:

- **`useEveEditor`** — a React hook wrapping Tiptap's `useEditor`, pre-configured with all EVE-compatible extensions
- **`EveLink`** / **`EveFontColor`** — individual Tiptap extensions for EVE link protocols and `<font color>` tags
- **`htmlToEveMail`** — serializes Tiptap's HTML output back to EVE's wire format
- **Parsing utilities** — convert EVE's raw format to standard HTML before loading into the editor

## Usage

### Basic editor

```tsx
import { useEveEditor } from "@jitaspace/tiptap-eve";

function EveMailComposer({ content }: { content: string }) {
  const editor = useEveEditor({ content });
  // Pass `editor` to any Tiptap-compatible UI, e.g. @mantine/tiptap or tiptap-react-ui
  return <YourRichTextEditor editor={editor} />;
}
```

### Parsing EVE mail body for display

EVE mail bodies need a few transformations before Tiptap can parse them:

```ts
import {
  convertEveMailLineBreaks,
  convertEveColorTags,
  convertEveUrlTags,
} from "@jitaspace/tiptap-eve";

const html = convertEveUrlTags(
  convertEveColorTags(
    convertEveMailLineBreaks(eveMailBody)
  )
);

const editor = useEveEditor({ content: html });
```

### Serializing back to EVE format

```ts
import { htmlToEveMail } from "@jitaspace/tiptap-eve";

const eveBody = htmlToEveMail(editor.getHTML());
// Send `eveBody` to the ESI mail endpoint
```

### Rendering EVE hrefs as app routes

```ts
import { renderEveHref } from "@jitaspace/tiptap-eve";

// "showinfo:5//30000142" → "/system/30000142"
// "warReport:123"        → "/war/123"
const appHref = renderEveHref(href);
```

## API

### `useEveEditor(options, deps?)`

A thin wrapper around Tiptap's `useEditor` with EVE extensions pre-loaded:

| Extension | Purpose |
|---|---|
| `StarterKit` | Core editing (bold, italic, lists, etc.) |
| `HardBreak` | Maps `Enter` to `<br>` (EVE uses `\r\n`, not `<p>`) |
| `TextStyle` | Base for font color marks |
| `Underline` | `<u>` support |
| `EveLink` | EVE custom link protocols (`showinfo:`, `warReport:`, etc.) |
| `EveFontColor` | EVE `<font color="0xAARRGGBB">` tags |

### `htmlToEveMail(html)`

Converts Tiptap's HTML output to EVE's wire format. Maps `<p>` → `\r\n`, `<a href>` → `<url=…>`, `<span color>` → `<color=…>`, etc.

### `convertEveMailLineBreaks(body)` / `convertEveColorTags(body)` / `convertEveUrlTags(body)`

Pre-processing utilities to normalize EVE mail HTML into standard HTML that Tiptap can parse.

### `sanitizeFormattedEveString(str)`

Handles EVE's legacy Python unicode string format (`u'...'`) and unicode escape sequences.

### `renderEveHref(href)`

Maps EVE's custom `showinfo:`, `warReport:`, `killReport:`, `recruitmentAd:`, and `contract:` link schemes to application routes.

### `fromEveColor(eveColor)`

Converts EVE's `0xAARRGGBB` color format to a CSS `#RRGGBB` hex string.

## Dependencies

- [`@tiptap/react`](https://tiptap.dev) + [`@tiptap/starter-kit`](https://tiptap.dev/docs/editor/extensions/functionality/starterkit) — Core editor
- [`@tiptap/extension-hard-break`](https://tiptap.dev/docs/editor/extensions/nodes/hard-break), [`@tiptap/extension-link`](https://tiptap.dev/docs/editor/extensions/marks/link), [`@tiptap/extension-text-style`](https://tiptap.dev/docs/editor/extensions/marks/text-style), [`@tiptap/extension-underline`](https://tiptap.dev/docs/editor/extensions/marks/underline) — Formatting extensions

## License

MIT
