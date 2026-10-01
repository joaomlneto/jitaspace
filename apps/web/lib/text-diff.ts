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

// Markup first, so a tag is never split into word and punctuation tokens.
const MARKUP = String.raw`<[^<>]*>|\{[^{}]*\}`;
const WORD_TOKENS = new RegExp(
  String.raw`${MARKUP}|\s+|[\p{L}\p{M}\p{N}_'’]+|[^\s]`,
  "gu",
);
const CHAR_TOKENS = new RegExp(String.raw`${MARKUP}|\s+|[^\s]`, "gu");

/** Split `text` into the tokens {@link diffText} compares. */
export function tokenize(text: string, mode: DiffMode): string[] {
  return text.match(mode === "char" ? CHAR_TOKENS : WORD_TOKENS) ?? [];
}

/**
 * Past this many cells (tokens × tokens) the changed middle is shown as one
 * deletion and one insertion rather than aligned: the alignment table would
 * cost more than it is worth in the browser. Common prefixes and suffixes are
 * trimmed first, so only a wholesale rewrite of a very long string gets here.
 */
const MAX_TABLE_CELLS = 4_000_000;

/** Merge adjacent parts with the same op. */
function pushPart(parts: DiffPart[], op: DiffPart["op"], text: string): void {
  if (!text) return;
  const last = parts.at(-1);
  if (last?.op === op) last.text += text;
  else parts.push({ op, text });
}

/** Longest-common-subsequence alignment of two token lists. */
function alignTokens(a: string[], b: string[], parts: DiffPart[]): void {
  const n = a.length;
  const m = b.length;
  if (n === 0 || m === 0 || n * m > MAX_TABLE_CELLS) {
    pushPart(parts, "delete", a.join(""));
    pushPart(parts, "insert", b.join(""));
    return;
  }
  // lengths[i * (m + 1) + j] = LCS length of a[i..] and b[j..].
  const width = m + 1;
  const lengths = new Uint32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lengths[i * width + j] =
        a[i] === b[j]
          ? (lengths[(i + 1) * width + j + 1] ?? 0) + 1
          : Math.max(
              lengths[(i + 1) * width + j] ?? 0,
              lengths[i * width + j + 1] ?? 0,
            );
    }
  }
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      pushPart(parts, "equal", a[i] ?? "");
      i++;
      j++;
    } else if (
      (lengths[(i + 1) * width + j] ?? 0) >= (lengths[i * width + j + 1] ?? 0)
    ) {
      pushPart(parts, "delete", a[i] ?? "");
      i++;
    } else {
      pushPart(parts, "insert", b[j] ?? "");
      j++;
    }
  }
  pushPart(parts, "delete", a.slice(i).join(""));
  pushPart(parts, "insert", b.slice(j).join(""));
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
