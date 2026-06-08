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
 *
 * ReDoS safety: the text uses (?:[^<]|<(?!\/?color))* rather than .*?. Forbidding
 * the text from containing `<color`/`</color` is what keeps it linear — with the
 * /g flag the engine retries at every `<color=` occurrence, and if the text could
 * swallow other `<color=` tokens those retries would overlap into O(n²) scanning
 * on adversarial input. Other tags (<b>, <font>, …) are still allowed in the text.
 */
export const convertEveColorTags = (body: string): string =>
  body.replace(
    /<color=(0x[0-9a-fA-F]+)>((?:[^<]|<(?!\/?color))*)<\/color>/g,
    (_, color: string, text: string) => `<font color="${color}">${text}</font>`,
  );

/**
 * EVE mail bodies use <url=HREF>TEXT</url> for hyperlinks instead of standard
 * HTML <a> tags. Convert them to <a href="HREF">TEXT</a> so TipTap's Link
 * extension can parse and render them correctly.
 *
 * ReDoS safety: the href uses [^<>]* (cannot consume `<` or `>`) and the text
 * uses (?:[^<]|<(?!\/?url))*, which forbids the text from swallowing another
 * `<url`/`</url` token. That non-overlap is what keeps it linear under the /g
 * flag — see convertEveColorTags. Nested formatting tags in the link label
 * (<font>, <b>, …) are still permitted.
 */
export const convertEveUrlTags = (body: string): string =>
  body.replace(
    /<url=([^<>]*)>((?:[^<]|<(?!\/?url))*)<\/url>/g,
    '<a href="$1">$2</a>',
  );

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
