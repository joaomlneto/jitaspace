import { Link } from "@mantine/tiptap";
import { mergeAttributes } from "@tiptap/core";

// FIXME: These should be configurable
const renderEveHref = (href: string) => {
  const PREFIX = "showinfo:";
  if (href.startsWith(PREFIX)) {
    const targetType = href.slice(PREFIX.length).split("//");
    if (targetType.length === 1) {
      return `https://everef.net/type/${targetType[0]}`;
    }
    switch (targetType[0]) {
      case "1373":
      case "1374":
      case "1375":
      case "1376":
      case "1377":
      case "1378":
      case "1379":
      case "1380":
      case "1381":
      case "1382":
      case "1383":
      case "1384":
      case "1385":
      case "1386":
      case "34574":
        return `/character/${targetType[1]}`;
      case "2":
        return `http://evemaps.dotlan.net/corp/${targetType[1]}`;
      case "5":
        return `http://evemaps.dotlan.net/system/${targetType[1]}`;
      case "52678":
        return `http://evemaps.dotlan.net/station/${targetType[1]}`;
    }

    return href;
  }
  return href;
};

export const EveLink = Link.extend({
  renderHTML({ HTMLAttributes }) {
    //console.log("EveLink HTMLAttributes:", HTMLAttributes);
    return [
      "a",
      mergeAttributes(this.options.HTMLAttributes, {
        ...HTMLAttributes,
        href: renderEveHref(String(HTMLAttributes?.href ?? "")),
      }),
      0,
    ];
  },
});
