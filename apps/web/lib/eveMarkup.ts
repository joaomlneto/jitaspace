/**
 * EVE's rich text (descriptions, titles and the like are stored as in-game
 * HTML) as plain text: tags dropped, a line break kept as a space, and
 * whitespace collapsed.
 *
 * A pure module on purpose, so Client Components can import it too —
 * `lib/metadata.ts` sits beside a `"use cache"` function and they cannot.
 *
 * It scans characters rather than running a tag regex, because a single
 * `replace(/<[^<>]*>/g, "")` pass is not a sanitizer: `<scr<b>ipt>` loses only
 * the inner tag and leaves `<script>` behind (CodeQL's
 * js/incomplete-multi-character-sanitization). Here a `<` is never copied, so
 * the result cannot contain one.
 *
 * A tag is what the old regex matched: `<`, then anything but `<` or `>`, then
 * `>`. A stray `<` that turns out not to open one — another `<` comes first, or
 * the text ends — is dropped alone, and the text after it kept: `I <3 Jita`
 * reads `I 3 Jita`, not `I`.
 */
export function stripEveMarkup(html: string): string {
  let out = "";
  let tag: string | null = null;
  for (const ch of html) {
    if (ch === "<") {
      if (tag !== null) out += tag;
      tag = "";
    } else if (tag !== null && ch === ">") {
      // `a<br>b` must not run the two words together.
      if (/^br\b/i.test(tag)) out += " ";
      tag = null;
    } else if (tag !== null) tag += ch;
    else out += ch;
  }
  if (tag !== null) out += tag;
  return out.replace(/\s+/g, " ").trim();
}
