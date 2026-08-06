import { getMarkAttributes, Mark, mergeAttributes } from "@tiptap/core";

// EVE writes colors alpha-FIRST (ARGB) — the opposite of CSS's #RRGGBBAA. Both
// notations EVE uses follow that order: `0xAARRGGBB` in mail (<color=0x…>) and
// `#AARRGGBB` in type descriptions and character bios (<font color="#…">).
//
// The alpha byte is dropped rather than translated to an rgba() alpha. EVE uses
// it to dim text against the client's near-black UI; compositing it against an
// arbitrary web background instead only pushes already-pale text further toward
// invisible. Dropping it matches what the `0x` branch has always done.
const EVE_ARGB = /^(?:0x|#)[0-9a-fA-F]{2}([0-9a-fA-F]{6})$/;
// 0x0RRGGBB — the single-alpha-digit variant, seen only with the `0x` prefix.
const EVE_SHORT_ARGB = /^0x[0-9a-fA-F]([0-9a-fA-F]{6})$/;
// A plain CSS hex color. Only the 3- and 6-digit lengths: 8 digits is claimed by
// EVE_ARGB above, and 4/5/7 digits are either ambiguous or not valid CSS at all
// (the browser drops `color:#abcde` silently, which reads as a rendering bug).
const CSS_HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const fromEveColor = (eveColor: string | null | undefined): string => {
  // A <font> tag may carry no `color` attribute (e.g. `<font size="14">`
  // section headers, which are extremely common in EVE descriptions and mail).
  // TipTap then renders this mark with the attribute's default value of `null`,
  // so guard against null/undefined/empty. Without this, renderHTML throws and
  // crashes the whole MailMessageViewer (e.g. the Description tab on /type/44992).
  if (!eveColor) return "";

  const argb = EVE_ARGB.exec(eveColor) ?? EVE_SHORT_ARGB.exec(eveColor);
  if (argb) return `#${argb[1]}`;

  if (CSS_HEX.test(eveColor)) return eveColor;

  // Reject anything else. `color` comes from attacker-controlled EVE HTML (other
  // players' mail bodies and character bios); returning it unchanged would let a
  // value like "blue;position:fixed;inset:0;background:url(https://attacker)"
  // break out of the `color:` declaration and inject arbitrary inline CSS.
  return "";
};

/** Expands `#rgb` to `#rrggbb`. Any other input is returned unchanged. */
const toSixDigitHex = (hex: string): string =>
  hex.replace(/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/, "#$1$1$2$2$3$3");

// Channel value at or above which a color counts as EVE's "plain text" white.
const NEAR_WHITE = 0xe0;

/**
 * True when a decoded color is EVE's default body-text white.
 *
 * EVE's palette is authored for the game client's near-black UI, where a
 * near-white `<font color>` is not a deliberate highlight — it is just "normal
 * text" (`#bfffffff` is the standard color of EVE descriptions and mail). Pinning
 * that to literal white makes the text invisible on JitaSpace's light theme, so
 * callers drop it and let the surrounding theme's foreground color apply.
 *
 * On the dark theme this is a visual no-op: EVE's `#bfffffff` composites to about
 * rgb(200,200,200) over the app background, which is Mantine's dark text color.
 */
export const isEveDefaultTextColor = (cssHex: string): boolean => {
  const hex = toSixDigitHex(cssHex);
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return false;
  const rgb = Number.parseInt(hex.slice(1), 16);
  return (
    ((rgb >> 16) & 0xff) >= NEAR_WHITE &&
    ((rgb >> 8) & 0xff) >= NEAR_WHITE &&
    (rgb & 0xff) >= NEAR_WHITE
  );
};

export interface FontColorMarkOptions {
  HTMLAttributes: Record<string, unknown>;
}

export const EveFontColor = Mark.create<FontColorMarkOptions>({
  name: "EVEFontMark",
  // Render outside Link (priority 1000) so that CSS anchor-color rules can
  // override inherited color on the <a> element directly.
  priority: 1001,
  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      color: "",
      size: 0,
    };
  },

  parseHTML() {
    return [
      {
        tag: "font",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const styles: string[] = [];

    // `size` and `color` come from attacker-controlled EVE HTML (other players'
    // mail bodies and character bios), so both are validated before they reach
    // the inline `style`, and neither raw value is spread onto the <span> as a
    // DOM attribute — otherwise a payload like
    // `<font size="14pt;position:fixed;inset:0;background:url(https://attacker)">`
    // would break out of the declaration and inject page-wide CSS.
    const { color, size, ...safeAttributes } = HTMLAttributes;

    const fontSize = Number.parseFloat(String(size));
    if (Number.isFinite(fontSize) && fontSize > 0) {
      // Clamp so a single tag cannot blow up the layout (and can never be a
      // vector for anything other than a plain numeric point size).
      styles.push(`font-size:${Math.min(fontSize, 72)}pt`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const cssColor = fromEveColor(color);
    if (cssColor) {
      // Emit no `color` declaration for EVE's default body-text white so the
      // text inherits the theme's foreground instead — see isEveDefaultTextColor.
      if (!isEveDefaultTextColor(cssColor)) {
        styles.push(`color:${cssColor}`);
      }
      // Preserve the ORIGINAL EVE color string on the span whenever it passed
      // validation — including the white that is deliberately not rendered — so
      // htmlToEveMail can losslessly round-trip composed mail
      // (<span color="0x…"> → <color=0x…>). Invalid/attacker values are dropped.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      safeAttributes.color = color;
    }

    return [
      "span",
      mergeAttributes(
        { ...this.options.HTMLAttributes },
        { ...safeAttributes, style: styles.join(";") },
      ),
      0,
    ];
  },

  addCommands() {
    return {
      removeEmptyTextStyle:
        () =>
        ({ state, commands }) => {
          const attributes = getMarkAttributes(state, this.type);
          const hasStyles = Object.entries(attributes).some(
            ([, value]) => !!value,
          );

          if (hasStyles) {
            return true;
          }

          return commands.unsetMark(this.name);
        },
    };
  },
});
