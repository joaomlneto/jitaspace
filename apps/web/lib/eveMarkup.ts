/**
 * EVE's rich text (descriptions, titles and the like are stored as in-game
 * HTML) as plain text, the way the game client shows it: tags dropped,
 * character references decoded, a line break kept as a space, and whitespace
 * collapsed.
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
 * Character references in the text (`&lt;`, `&gt;`, `&amp;`, `&quot;`,
 * `&apos;`, `&nbsp;` and numeric ones) are decoded after tags are parsed, as
 * in HTML: authors escape brackets to show them (`&lt;CEO&gt;` reads `<CEO>`).
 * Unlike HTML, only those six names are known, in lower case; a reference
 * needs its `;`, with at most 10 characters before it; and numeric references
 * to C1 controls (`&#150;`) are not remapped to Windows-1252. Anything else
 * stays as written.
 *
 * It scans characters rather than running a tag regex, because a single
 * `replace(/<[^<>]*>/g, "")` pass is not a sanitizer: `<scr<b>ipt>` loses only
 * the inner tag and leaves `<script>` behind (CodeQL's
 * js/incomplete-multi-character-sanitization). Markup never reassembles into
 * a tag here: where the client would show a `<` from the markup right before
 * an ASCII letter, `/`, `!` or `?` — the only characters with which HTML opens
 * a tag — it is dropped instead. Text the author escaped comes back as the
 * text it encodes, as `textContent` would, so the result is plain text: render
 * it as text (React does), never as HTML.
 *
 * Linear in the input: the result is built as an array and joined once.
 */
export function stripEveMarkup(html: string): string {
  const chars = Array.from(html);
  const out: Piece[] = [];
  let i = 0;
  while (i < chars.length) {
    const ch = chars[i] ?? "";
    if (ch === "<") {
      i = readAngleBracket(chars, i, out);
    } else if (ch === "&") {
      i = readCharacterReference(chars, i, out);
    } else {
      appendText(out, ch);
      i++;
    }
  }
  return out
    .map((piece) => (piece === MARKUP_LT ? "<" : piece))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/** A `<` from the markup shown as text, which must never open a tag. */
const MARKUP_LT = Symbol("markup <");
type Piece = string | typeof MARKUP_LT;

/**
 * Reads the `<` at `start` — a tag, a `<` that never closes, or a text `<` —
 * writing whatever it contributes to `out`, and returns the index to continue
 * from.
 */
function readAngleBracket(
  chars: string[],
  start: number,
  out: Piece[],
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
  out.push(MARKUP_LT);
  return start + 1;
}

const NAMED_REFERENCES: Readonly<Record<string, string>> = {
  lt: "<",
  gt: ">",
  amp: "&",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * Reads the `&` at `start`, writing the character it references (or the `&`
 * itself, when it starts none), and returns the index to continue from.
 */
function readCharacterReference(
  chars: string[],
  start: number,
  out: Piece[],
): number {
  let end = start + 1;
  while (end - start <= 10 && /^[#0-9a-z]$/i.test(chars[end] ?? "")) end++;
  const decoded =
    chars[end] === ";"
      ? decodeReference(chars.slice(start + 1, end).join(""))
      : undefined;
  if (decoded === undefined) {
    appendText(out, "&");
    return start + 1;
  }
  appendText(out, decoded);
  return end + 1;
}

function decodeReference(name: string): string | undefined {
  const numeric = /^#(?:x([0-9a-f]+)|(\d+))$/i.exec(name);
  if (numeric) {
    const codePoint = numeric[1]
      ? Number.parseInt(numeric[1], 16)
      : Number.parseInt(numeric[2] ?? "", 10);
    const valid =
      codePoint > 0 &&
      codePoint <= 0x10ffff &&
      !(codePoint >= 0xd800 && codePoint <= 0xdfff);
    return valid ? String.fromCodePoint(codePoint) : "�";
  }
  return Object.hasOwn(NAMED_REFERENCES, name)
    ? NAMED_REFERENCES[name]
    : undefined;
}

function appendText(out: Piece[], text: string): void {
  // No `<` from the markup may end up opening a tag with what follows it —
  // however many of them precede it (`<<<b>script`).
  if (opensTag(text)) {
    while (out.at(-1) === MARKUP_LT) out.pop();
  }
  out.push(text);
}

/** Whether `<` followed by `ch` opens a tag in HTML. */
function opensTag(ch: string): boolean {
  return /^[a-z/!?]$/i.test(ch);
}
