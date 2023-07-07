import { getMarkAttributes, Mark, mergeAttributes } from "@tiptap/core";

const fromEveColor = (eveColor: string): string => {
  if (eveColor.length === 9) {
    return `#${eveColor.slice(3)}`;
  }
  return eveColor;
};

export interface FontColorMarkOptions {
  HTMLAttributes: Record<string, any>;
}

export const EveFontColor = Mark.create<FontColorMarkOptions>({
  name: "EVEFontMark",
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
    return [
      "span",
      mergeAttributes(
        { ...this.options.HTMLAttributes },
        {
          ...HTMLAttributes,
          style: `font-size:${HTMLAttributes.size}pt;color:${fromEveColor(
            HTMLAttributes.color,
          )}`,
        },
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
