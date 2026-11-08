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
 * js/incomplete-multi-character-sanitization). Here every `<` opens a tag and
 * is never copied, so the result cannot contain one.
 */
export function stripEveMarkup(html: string): string {
  let out = "";
  let tag: string | null = null;
  for (const ch of html) {
    if (ch === "<") tag = "";
    else if (tag !== null && ch === ">") {
      // `a<br>b` must not run the two words together.
      if (/^br\b/i.test(tag)) out += " ";
      tag = null;
    } else if (tag !== null) tag += ch;
    else out += ch;
  }
  return out.replace(/\s+/g, " ").trim();
}
