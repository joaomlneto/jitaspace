/**
 * Serializes a DOM node produced by TipTap's getHTML() back to EVE Online's
 * rich-text mail format.
 *
 * Mapping:
 *   <p>…</p>           → …\r\n         (each paragraph ends with CRLF)
 *   <br>               → \r\n
 *   <strong>/<b>       → <b>…</b>
 *   <em>/<i>           → <i>…</i>
 *   <u>                → <u>…</u>
 *   <s>                → <s>…</s>
 *   <a href="…">       → <url=…>…</url>
 *   <span color="0x…"> → <color=0x…>…</color>  (EveFontColor stores the
 *                         original EVE color string in the `color` attribute)
 */
function nodeToEveMail(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  const inner = Array.from(el.childNodes).map(nodeToEveMail).join("");

  switch (tag) {
    case "body":
    case "div":
      return inner;

    case "p":
      return `${inner}\r\n`;

    case "br":
      return "\r\n";

    case "strong":
    case "b":
      return `<b>${inner}</b>`;

    case "em":
    case "i":
      return `<i>${inner}</i>`;

    case "u":
      return `<u>${inner}</u>`;

    case "s":
      return `<s>${inner}</s>`;

    case "a": {
      const href = el.getAttribute("href") ?? "";
      return `<url=${href}>${inner}</url>`;
    }

    case "span": {
      // EveFontColor stores the original EVE color string (e.g. "0xffFF0000")
      // as a `color` HTML attribute alongside the CSS style.  Use it directly
      // so the round-trip is lossless.
      const color = el.getAttribute("color");
      if (color) {
        return `<color=${color}>${inner}</color>`;
      }
      return inner;
    }

    default:
      return inner;
  }
}

/**
 * Converts the HTML produced by TipTap's `editor.getHTML()` back to the
 * EVE Online rich-text mail format.
 *
 * The result can be sent directly to the ESI mail endpoint.
 *
 * @example
 * const eveBody = htmlToEveMail(editor.getHTML());
 */
export const htmlToEveMail = (html: string): string => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const result = nodeToEveMail(doc.body);
  // Strip the trailing \r\n that comes from the last <p> block so the output
  // matches what EVE itself puts in mail bodies.
  return result.replace(/\r\n$/, "");
};
