/**
 * EVE's rich text (descriptions, titles and the like are stored as in-game
 * HTML) as plain text, the way the game client shows it: tags dropped, a line
 * break kept as a space, and whitespace collapsed.
 *
 * A pure module on purpose, so Client Components can import it too —
 * `lib/metadata.ts` sits beside a `"use cache"` function and they cannot.
 *
 * What counts as a tag follows the client, as observed in-game (2026-11-08)
 * on production character titles:
 *
 * - `<` to the next `>`, with no `<` between, is a tag however malformed.
 *   Authors write `<\color>`, `<0xFFFF0000>` and `<"b">`, and the client hides
 *   them.
 * - A `<` that never closes hides everything after it. The client shows
 *   `CEO <3` as `CEO`; it also cleans up titles EVE cut off at about 100
 *   characters inside a tag (`Drone Master</color`).
 * - A `<` that meets another `<` before any `>` is text: the client shows
 *   `<大A<u>…` as `<大A`.
 *
 * It scans characters rather than running a tag regex, because a single
 * `replace(/<[^<>]*>/g, "")` pass is not a sanitizer: `<scr<b>ipt>` loses only
 * the inner tag and leaves `<script>` behind (CodeQL's
 * js/incomplete-multi-character-sanitization). Where the client would show a
 * text `<` right before an ASCII letter, `/`, `!` or `?` — the only
 * characters with which HTML opens a tag — it is dropped instead, so no tag
 * can form in the result.
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
  return out.join("").replace(/\s+/g, " ").trim();
}

/**
 * Reads the `<` at `start` — a tag, a `<` that never closes, or a text `<` —
 * writing whatever it contributes to `out`, and returns the index to continue
 * from.
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
  // Never closes: it hides the rest.
  if (end === chars.length) return end;
  if (chars[end] === ">") {
    // `a<br>b` must not run the two words together.
    if (/^br\b/i.test(chars.slice(start + 1, end).join(""))) out.push(" ");
    return end + 1;
  }
  // Another `<` comes first: this one is text.
  out.push("<");
  return start + 1;
}

function appendText(out: string[], ch: string): void {
  // No text `<` may end up opening a tag with what follows it — however many
  // of them precede it (`<<<b>script`).
  if (opensTag(ch)) {
    while (out.at(-1) === "<") out.pop();
  }
  out.push(ch);
}

/** Whether `<` followed by `ch` opens a tag in HTML. */
function opensTag(ch: string): boolean {
  return /^[a-z/!?]$/i.test(ch);
}
