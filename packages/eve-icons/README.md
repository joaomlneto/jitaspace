# @jitaspace/eve-icons

EVE Online's UI icons as React components: window icons, the client's
modern glyph library, faction logos, masteries, ship-tree glyphs and more,
taken straight from the live game client.

> **Unofficial, and the artwork is not MIT.** The code is MIT-licensed; the
> icons are © CCP hf. (Fenris Creations), used under the
> [EVE Developer License Agreement](https://developers.eveonline.com/license-agreement).
> Read [LICENSE](./LICENSE) before using them.

## Usage

```tsx
import {
  FactionCaldariIcon,
  SystemArrowDownIcon,
  WindowCalendarIcon,
} from "@jitaspace/eve-icons";

<WindowCalendarIcon size={32} />

// Single-colour glyphs can be tinted with any CSS colour:
<SystemArrowDownIcon size={16} color="currentColor" />

// Fill a positioned parent, like next/image's `fill`:
<div style={{ position: "relative", width: 48, height: 48 }}>
  <FactionCaldariIcon fill />
</div>
```

Every component renders an `<img>` and accepts its attributes, plus:

| Prop             | Description                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| `size`           | Width in CSS pixels. Defaults to the icon's smallest native size.                                        |
| `width`/`height` | Set either one and the other follows the icon's aspect ratio.                                            |
| `fill`           | Fill the nearest positioned ancestor.                                                                    |
| `color`          | Tint the icon. Works only on single-colour glyphs (`Icon.icon.monochrome`); full-colour icons ignore it. |
| `alt`            | Defaults to the icon's name. Pass `""` for a decorative icon.                                            |

The artwork is inlined as data URIs, so the package works with any bundler and
an app only ships the icons it imports. Each icon carries every native size;
the component sends the smallest one that stays sharp at twice the rendered
size.

## Naming

Each icon has an ID, `<set>/<name>`, and a component named after it:
`system/arrow-down` is `SystemArrowDownIcon`. The ID follows the client
file it came from, minus size suffixes and words the set already implies, and
keeps CCP's own spellings (typos included) so it can always be traced back. The
names from before this package was generated (`CalendarIcon`, `WalletIcon`, …)
still work as aliases.

`EVE_ICONS` lists every icon (ID, set, component name, sizes, whether it can
be tinted) without loading any artwork. `EVE_ICON_SETS` describes the sets.

| Set          | Contents                                         |
| ------------ | ------------------------------------------------ |
| `window`     | Neocom and window-header icons                   |
| `system`     | 16px glyphs for UI controls                      |
| `control`    | Ship and fleet commands                          |
| `category`   | Activity and content categories                  |
| `faction`    | Faction emblems, plus lettered 256px variants    |
| `killmark`   | Killmark tallies                                 |
| `mastery`    | Ship mastery badges                              |
| `career`     | AIR career paths                                 |
| `service`    | Alpha / Omega                                    |
| `bracket`    | In-space brackets for newer structures           |
| `settings`   | Settings window sections                         |
| `product`    | 64px feature icons                               |
| `theatre`    | Theatres of war                                  |
| `crimewatch` | Timers and legal states                          |
| `race`       | Empire race emblems                              |
| `shipclass`  | Ship-tree hull classes                           |
| `shiprole`   | Ship-tree roles and bonuses                      |
| `shiptech`   | Navy / Tech II / Tech III badges                 |
| `attribute`  | Character attributes                             |
| `misc`       | PLEX, the unknown-item placeholder, the CCP logo |

## Updating the icons

The PNGs in `assets/` and their index, `manifest.json`, are the source of
truth. Components are generated from them into `src/generated/` (gitignored),
on install and ahead of every build, type-check, lint and test.

```bash
pnpm --filter @jitaspace/eve-icons icons:sync    # fetch from the live client, then regenerate
pnpm --filter @jitaspace/eve-icons kubb:generate # regenerate only (offline)
```

`icons:sync` reads Tranquility's current resource index, downloads every file
`scripts/sets.ts` selects, checks each against the index's MD5, and rewrites
`assets/` and `manifest.json`. It reports icons that were added or removed.
A removed or renamed icon is a breaking change for anyone importing it, so
review the diff before committing. New window icons get their name from the
file until someone adds a hand-split one to `WINDOW_NAMES` in
`scripts/sets.ts`; the sync lists them.
