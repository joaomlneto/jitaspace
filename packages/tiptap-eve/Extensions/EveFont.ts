import { getMarkAttributes, Mark, mergeAttributes } from "@tiptap/core";

export const fromEveColor = (eveColor: string | null | undefined): string => {
  // A <font> tag may carry no `color` attribute (e.g. `<font size="14">`
  // section headers, which are extremely common in EVE descriptions and mail).
  // TipTap then renders this mark with the attribute's default value of `null`,
  // so guard against null/undefined/empty before touching `.length`. Without
  // this, renderHTML throws and crashes the whole MailMessageViewer (e.g. the
  // Description tab on /type/44992).
  if (!eveColor) return "";
  if (eveColor.length === 9) {
    // 0x0RRGGBB — single-digit alpha prefix, strip "0x0"
    return `#${eveColor.slice(3)}`;
  }
  if (eveColor.length === 10 && eveColor.startsWith("0x")) {
    // 0xAARRGGBB — two-digit alpha, strip "0xAA"
    return `#${eveColor.slice(4)}`;
  }
  return eveColor;
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
    if (HTMLAttributes.size) {
      styles.push(`font-size:${HTMLAttributes.size}pt`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const cssColor = fromEveColor(HTMLAttributes.color);
    if (cssColor) {
      styles.push(`color:${cssColor}`);
    }
    return [
      "span",
      mergeAttributes(
        { ...this.options.HTMLAttributes },
        { ...HTMLAttributes, style: styles.join(";") },
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
