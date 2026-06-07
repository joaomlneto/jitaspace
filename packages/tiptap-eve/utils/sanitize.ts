/**
 * EVE mail bodies use \r\n as line separators inside their rich-text format.
 * Browsers collapse these as whitespace, so they must be converted to <br>
 * tags before the content is parsed by TipTap or rendered as HTML.
 *
 * A double \r\n\r\n (blank line between paragraphs) becomes <br><br>,
 * matching the in-game two-line-break spacing.
 */
export const convertEveMailLineBreaks = (body: string): string =>
  body.replace(/\r\n/g, "<br>");

/**
 * EVE mail bodies use <color=0xAARRGGBB>TEXT</color> for coloured text.
 * Convert to <font color="0xAARRGGBB">TEXT</font> so TipTap's EveFontColor
 * extension can parse and apply the colour via fromEveColor.
 */
export const convertEveColorTags = (body: string): string =>
  body.replace(
    /<color=(0x[0-9a-fA-F]+)>(.*?)<\/color>/gs,
    (_, color: string, text: string) => `<font color="${color}">${text}</font>`,
  );

/**
 * EVE mail bodies use <url=HREF>TEXT</url> for hyperlinks instead of standard
 * HTML <a> tags. Convert them to <a href="HREF">TEXT</a> so TipTap's Link
 * extension can parse and render them correctly.
 *
 * The scheme part is lowercased because linkifyjs v4 (used by TipTap v3)
 * requires all-lowercase scheme names. EVE Online uses camelCase schemes
 * (e.g. "warReport:", "joinChannel:") that must be normalised here before the
 * content reaches TipTap.
 */
export const convertEveUrlTags = (body: string): string =>
  body.replace(/<url=([^>]*)>(.*?)<\/url>/gs, (_, href: string, text: string) => {
    const normalizedHref = href.replace(/^[A-Za-z][A-Za-z0-9]*(?=:)/, (scheme) =>
      scheme.toLowerCase(),
    );
    return `<a href="${normalizedHref}">${text}</a>`;
  });

export const sanitizeFormattedEveString = (str: string): string => {
  // FIXME: IS THIS CORRECT? THIS WILL CONSIDER THAT THE WHOLE THING IS A "UNICODE BLOCK".
  //        THIS MIGHT BREAK BADLY IF MULTIPLE BLOCKS ARE ALLOWED TO EXIST WITHIN THE STRING!
  if (str.startsWith("u'") && str.endsWith("'")) {
    str = str.slice(2, -1);
    str = str.replaceAll(/\\x[0-9a-fA-F]{2}/g, (str) => {
      const charCode = parseInt(str.slice(2), 16);
      return String.fromCharCode(charCode);
    });
    str = str.replaceAll(/\\'/g, "'");
  }
  // replace unicode escape sequences with actual characters
  str = str.replaceAll(/\\u[0-9a-fA-F]{4}/g, (s) =>
    decodeURIComponent(JSON.parse(`"${s}"`) as string),
  );
  return str;
};
