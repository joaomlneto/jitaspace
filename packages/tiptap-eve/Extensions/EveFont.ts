import { getMarkAttributes, Mark, mergeAttributes } from "@tiptap/core";

export const fromEveColor = (eveColor: string | null | undefined): string => {
  // A <font> tag may carry no `color` attribute (e.g. `<font size="14">`
  // section headers, which are extremely common in EVE descriptions and mail).
  // TipTap then renders this mark with the attribute's default value of `null`,
  // so guard against null/undefined/empty before touching `.length`. Without
  // this, renderHTML throws and crashes the whole MailMessageViewer (e.g. the
  // Description tab on /type/44992).
  if (!eveColor) return "";
  if (eveColor.length === 9 && eveColor.startsWith("0x")) {
    // 0x0RRGGBB — single-digit alpha prefix, strip "0x0"
    return `#${eveColor.slice(3)}`;
  }
  if (eveColor.length === 10 && eveColor.startsWith("0x")) {
    // 0xAARRGGBB — two-digit alpha, strip "0xAA"
    return `#${eveColor.slice(4)}`;
  }
  if (/^#[0-9a-fA-F]{3,8}$/.test(eveColor)) {
    // Already a plain CSS hex color.
    return eveColor;
  }
  // Reject anything else. `color` comes from attacker-controlled EVE HTML (other
  // players' mail bodies and character bios); returning it unchanged would let a
  // value like "blue;position:fixed;inset:0;background:url(https://attacker)"
  // break out of the `color:` declaration and inject arbitrary inline CSS.
  return "";
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
      styles.push(`color:${cssColor}`);
      // Preserve the ORIGINAL EVE color string on the span only when it passed
      // validation, so htmlToEveMail can losslessly round-trip composed mail
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
