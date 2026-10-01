/**
 * A token-level diff of two versions of a localization string, for showing
 * what changed between builds.
 *
 * Text is split into words (or, for languages written without spaces between
 * words, single characters), runs of whitespace and punctuation. EVE markup —
 * tags such as `<color=0xffffffff>` and `</b>`, and `{…}` placeholders such as
 * `{[character]player.name}` — is always one token, so a changed tag reads as
 * one replaced tag rather than as scattered changed characters.
 */

export type DiffMode = "word" | "char";

export type DiffPart =
  | { op: "equal"; text: string }
  | { op: "insert"; text: string }
  | { op: "delete"; text: string };

/**
 * Chinese and Japanese put no spaces between words, so word tokens would be
 * whole sentences; they are compared character by character. Korean does use
 * spaces, so it is diffed by word like the rest.
 */
const CHAR_LANGUAGES = new Set(["zh", "ja"]);

export function diffModeForLanguage(lang: string): DiffMode {
  return CHAR_LANGUAGES.has(lang.toLowerCase().split("-")[0] ?? "")
    ? "char"
    : "word";
}

// Markup first, so a tag is never split into word and punctuation tokens. A
// tag starts with a letter (`<b>`, `</color>`, `<a href=…>`), so prose such
// as "range < 10 km and speed > 5" is not mistaken for one.
const MARKUP = String.raw`<\/?[A-Za-z][^<>]*>|\{[^{}]*\}`;
const WORD_TOKENS = new RegExp(
  String.raw`${MARKUP}|\s+|[\p{L}\p{M}\p{N}_'’]+|[^\s]`,
  "gu",
);
// In character mode, Latin words and numbers inside Chinese or Japanese text
// stay whole; every other run is split into characters below.
const LATIN_RUN = String.raw`[\p{Script=Latin}\p{M}\p{Nd}_'’]+`;
const CHAR_CHUNKS = new RegExp(
  String.raw`${MARKUP}|\s+|${LATIN_RUN}|[^\s<{\p{Script=Latin}\p{M}\p{Nd}_'’]+|[^\s]`,
  "gu",
);
const SPLIT_CHUNK = new RegExp(
  String.raw`^[^\s<{\p{Script=Latin}\p{M}\p{Nd}_'’]{2,}$`,
  "u",
);

const graphemes =
  typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : undefined;

/**
 * A run's user-perceived characters, so an emoji sequence or a character
 * with combining marks is one token rather than several code points.
 */
function splitCharacters(run: string): string[] {
  if (!graphemes) return Array.from(run);
  return Array.from(graphemes.segment(run), (segment) => segment.segment);
}

/** Split `text` into the tokens {@link diffText} compares. */
export function tokenize(text: string, mode: DiffMode): string[] {
  if (mode === "word") return text.match(WORD_TOKENS) ?? [];
  return (text.match(CHAR_CHUNKS) ?? []).flatMap((chunk) =>
    SPLIT_CHUNK.test(chunk) ? splitCharacters(chunk) : [chunk],
  );
}

/**
 * Past this many edits between the two versions the changed middle is shown
 * as one deletion and one insertion rather than aligned. The alignment costs
 * time in proportion to the length times the number of edits, so a few small
 * edits anywhere in a long string are always aligned; only a near-total
 * rewrite of a long string gets here, where an alignment would be noise.
 */
const MAX_EDITS = 1_000;

/** Merge adjacent parts with the same op. */
function pushPart(parts: DiffPart[], op: DiffPart["op"], text: string): void {
  if (!text) return;
  const last = parts.at(-1);
  if (last?.op === op) last.text += text;
  else parts.push({ op, text });
}

/**
 * Myers' O(ND) shortest edit script between two token lists. `trace[d]` is the
 * furthest-reaching x on each diagonal k (−d−1 … d+1) before edit `d`; walking
 * it backwards from the end recovers the edits. Undefined past `MAX_EDITS`.
 */
function shortestEditTrace(
  a: readonly string[],
  b: readonly string[],
): Int32Array[] | undefined {
  const n = a.length;
  const m = b.length;
  const maxEdits = Math.min(n + m, MAX_EDITS);
  const offset = maxEdits + 1;
  const furthest = new Int32Array(2 * maxEdits + 3);
  const trace: Int32Array[] = [];
  for (let d = 0; d <= maxEdits; d++) {
    trace.push(furthest.slice(offset - d - 1, offset + d + 2));
    for (let k = -d; k <= d; k += 2) {
      const down =
        k === -d ||
        (k !== d &&
          (furthest[offset + k - 1] ?? 0) < (furthest[offset + k + 1] ?? 0));
      let x = down
        ? (furthest[offset + k + 1] ?? 0)
        : (furthest[offset + k - 1] ?? 0) + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      furthest[offset + k] = x;
      if (x >= n && y >= m) return trace;
    }
  }
  return undefined;
}

/** Align two token lists, appending the edits to `parts` in reading order. */
function alignTokens(
  a: readonly string[],
  b: readonly string[],
  parts: DiffPart[],
): void {
  const trace =
    a.length > 0 && b.length > 0 ? shortestEditTrace(a, b) : undefined;
  if (!trace) {
    pushPart(parts, "delete", a.join(""));
    pushPart(parts, "insert", b.join(""));
    return;
  }
  // Walk back from the end, collecting the edits in reverse.
  const reversed: DiffPart[] = [];
  let x = a.length;
  let y = b.length;
  for (let d = trace.length - 1; d >= 0; d--) {
    const before = trace[d] ?? new Int32Array();
    const at = (k: number) => before[k + d + 1] ?? 0;
    const k = x - y;
    const down = k === -d || (k !== d && at(k - 1) < at(k + 1));
    const previousK = down ? k + 1 : k - 1;
    const previousX = at(previousK);
    const previousY = previousX - previousK;
    while (x > previousX && y > previousY) {
      reversed.push({ op: "equal", text: a[x - 1] ?? "" });
      x--;
      y--;
    }
    if (d > 0) {
      if (down) reversed.push({ op: "insert", text: b[y - 1] ?? "" });
      else reversed.push({ op: "delete", text: a[x - 1] ?? "" });
    }
    x = previousX;
    y = previousY;
  }
  for (let index = reversed.length - 1; index >= 0; index--) {
    const part = reversed[index];
    if (part) pushPart(parts, part.op, part.text);
  }
}

/**
 * The parts that turn `from` into `to`: unchanged text, deletions and
 * insertions, in reading order. A missing side (a string added or removed)
 * diffs against the empty string.
 */
export function diffText(
  from: string | undefined,
  to: string | undefined,
  mode: DiffMode,
): DiffPart[] {
  const a = tokenize(from ?? "", mode);
  const b = tokenize(to ?? "", mode);

  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }

  const parts: DiffPart[] = [];
  pushPart(parts, "equal", a.slice(0, start).join(""));
  alignTokens(a.slice(start, endA), b.slice(start, endB), parts);
  pushPart(parts, "equal", a.slice(endA).join(""));
  return parts;
}
