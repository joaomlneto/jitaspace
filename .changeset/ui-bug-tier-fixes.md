---
"@jitaspace/ui": patch
"@jitaspace/eve-components": patch
---

Fix the remaining bug-tier findings from the `@jitaspace/ui` review.

**`SkillBar`'s `missingStrong` squares were invisible.** The style key was spelled `backGroundColor`, so React dropped it — and because those levels _are_ required they never reached the `notRequired` border branch either, leaving 8×8 boxes with no fill and no outline. The existing suite had full line coverage of this component and still missed it, because it never passed that `requirementType`.

**Avatars with no id showed a real, unrelated entity.** `EveImageServerAvatar` substituted entity id `1`, so an id-less `<CharacterAvatar />` rendered whatever portrait the image server has for character 1. The three call sites that do this use the avatar as a decorative glyph beside a menu item, where Mantine's own placeholder is what they want. It also interpolated the missing id into the alt text, so screen readers were read "characters undefined portrait". Both fixed; `alt` is now destructured so a caller's value can't be overwritten by the props spread, and no alt is emitted when there is no image to describe.

**`MailLabelColorSwatch` had no fallback colour.** `color ?? "primary"` is neither a CSS colour keyword nor a Mantine theme key, so the declaration was discarded and the swatch rendered blank. It now falls back to `var(--mantine-primary-color-filled)`. The test covering this asserted `toHaveStyle({ backgroundColor: "primary" })`, which passed against the broken component — jsdom discards the invalid declaration and jest-dom parses the expected value the same way, so it compared empty to empty. Rewritten to assert on the style attribute.

**Three icon-only ActionIcons had no accessible name.** `OpenInformationWindowActionIcon`, `OpenMarketWindowActionIcon` and `SetAutopilotDestinationActionIcon` rendered a button whose only child was an SVG, so assistive technology had nothing to announce. Each now carries an `aria-label` matching its tooltip. They also render the button inside a wrapper: a disabled ActionIcon gets `pointer-events: none`, so the tooltip explaining the button never opened in the state that most needs it — `disabled` fires whenever no handler is passed. Their props now extend `ActionIconProps`, so callers can set `size`, `color` and `variant`, which was previously impossible.

**`StandingsBadge` used unreadable text on two tiers.** The orange and red tiers forced black text over `#b53209` and `#800007`, measuring 3.4:1 and 1.9:1 against WCAG AA's 4.5:1 for normal text. Dropping the override lets the badge's default light text apply, at 6.1:1 and 10.9:1. The grey tier keeps black, which is the better of the two there (5.3:1 versus 4.0:1). Pinned by tests that compute the WCAG contrast ratio rather than asserting colour values.
