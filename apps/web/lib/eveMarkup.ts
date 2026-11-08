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
 * js/incomplete-multi-character-sanitization). Here a `<` reaches the result
 * only as text, never followed by a letter, `/`, `!` or `?`, so no tag can
 * form in it: those are the only characters with which HTML opens one.
 *
 * What counts as a tag was settled against every production character title
 * holding a `<` (5,521 on 2026-11-08):
 *
 * - `<` to the next `>`, with no `<` between, is a tag — however malformed.
 *   Authors write `<\color>`, `<0xFFFF0000>` and `<"b">`, and expect them
 *   hidden, so HTML's stricter tag-open rule would leak them as text.
 * - A tag that never closes is dropped up to the next `<` or the end when it
 *   looks like one (a letter, `/`, `!` or `?` after the `<`): EVE cuts titles
 *   off at about 100 characters, often inside a tag (`Drone Master</color`),
 *   and authors leave them open (`</color<color=…>`).
 * - Any other `<` is text (`CEO <3`, `<-`) and is kept, unless it ends the
 *   title (where it is the start of a tag cut off) or what ends up after it
 *   would make it open a tag (`<<b>script`).
 */
export function stripEveMarkup(html: string): string {
  const chars = Array.from(html);
  let out = "";
  let i = 0;
  while (i < chars.length) {
    const ch = chars[i] ?? "";
    if (ch !== "<") {
      // A text `<` must not end up opening a tag with what follows it.
      if (out.endsWith("<") && looksLikeTag(ch)) out = out.slice(0, -1);
      out += ch;
      i++;
      continue;
    }
    let end = i + 1;
    while (end < chars.length && chars[end] !== "<" && chars[end] !== ">") {
      end++;
    }
    if (chars[end] === ">") {
      // `a<br>b` must not run the two words together.
      if (/^br\b/i.test(chars.slice(i + 1, end).join(""))) out += " ";
      i = end + 1;
    } else if (looksLikeTag(chars[i + 1])) {
      i = end;
    } else {
      if (i + 1 < chars.length) out += "<";
      i++;
    }
  }
  return out.replace(/\s+/g, " ").trim();
}

function looksLikeTag(next: string | undefined): boolean {
  return next !== undefined && /^[\p{L}/!?]$/u.test(next);
}
