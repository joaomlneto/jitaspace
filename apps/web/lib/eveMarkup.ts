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
 * - Any other `<` is text (`CEO <3`, `<-`) and is kept, unless only
 *   whitespace follows it (it is then the start of a tag cut off) or what ends
 *   up after it would make it open a tag (`<<b>script`).
 *
 * Linear in the input: the result is built as an array and joined once.
 */
export function stripEveMarkup(html: string): string {
  const chars = Array.from(html);
  const out: string[] = [];
  let i = 0;
  while (i < chars.length) {
    const ch = chars[i] ?? "";
    if (ch === "<") {
      i = readAngleBracket(chars, i, out);
    } else {
      appendText(out, ch);
      i++;
    }
  }
  // A text `<` with only whitespace after it is a tag cut off.
  while (out.length > 0 && isTrailingJunk(out.at(-1))) out.pop();
  return out.join("").replace(/\s+/g, " ").trim();
}

/**
 * Reads the `<` at `start` — a tag, an unclosed tag or a text `<` — writing
 * whatever it contributes to `out`, and returns the index to continue from.
 */
function readAngleBracket(
  chars: string[],
  start: number,
  out: string[],
): number {
  let end = start + 1;
  while (end < chars.length && chars[end] !== "<" && chars[end] !== ">") {
    end++;
  }
  if (chars[end] === ">") {
    // `a<br>b` must not run the two words together.
    if (/^br\b/i.test(chars.slice(start + 1, end).join(""))) out.push(" ");
    return end + 1;
  }
  if (looksLikeTag(chars[start + 1])) return end;
  out.push("<");
  return start + 1;
}

function appendText(out: string[], ch: string): void {
  // No text `<` may end up opening a tag with what follows it — however many
  // of them precede it (`<<<b>script`).
  if (looksLikeTag(ch)) {
    while (out.at(-1) === "<") out.pop();
  }
  out.push(ch);
}

function looksLikeTag(next: string | undefined): boolean {
  return next !== undefined && /^[\p{L}/!?]$/u.test(next);
}

function isTrailingJunk(piece: string | undefined): boolean {
  return piece === "<" || (piece !== undefined && /^\s$/u.test(piece));
}
