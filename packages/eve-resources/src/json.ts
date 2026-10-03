/**
 * Pretty-print a value as 2-space-indented JSON, but stop as soon as the output
 * reaches `cap` characters and append a truncation marker — *without* ever
 * building the full string for very large values.
 *
 * `JSON.stringify(huge, null, 2).slice(0, cap)` first materializes the whole
 * string (a 145 MB localization pickle decodes to ~165 MB of JSON, and the
 * stringify alone freezes the tab for seconds); this walks the value and bails
 * out the moment the budget is hit, so the JSON preview stays instant no matter
 * how large the decoded data is.
 *
 * Matches `JSON.stringify(value, null, 2)` for the plain JSON value types that
 * decoded resources produce (objects, arrays, strings, numbers, booleans,
 * null). As with `JSON.stringify`, `undefined`/function values are dropped from
 * objects and serialized as `null` inside arrays.
 */
export function stringifyCapped(value: unknown, cap: number): string {
  const chunks: string[] = [];
  let len = 0;
  // A mutable holder (rather than a bare `let`) so the "budget spent" flag reads
  // as a plain `boolean` everywhere — a closure-mutated `let` would otherwise be
  // narrowed to its initializer and flagged as an always-false condition.
  const state = { done: false };

  // Append a chunk; returns false once the budget is spent so callers stop
  // recursing/iterating.
  const push = (s: string): boolean => {
    if (state.done) return false;
    chunks.push(s);
    len += s.length;
    if (len >= cap) state.done = true;
    return !state.done;
  };

  // Quote a string, but never let a single pathologically long string blow the
  // budget by more than one chunk: slice it to the remaining room first.
  const quote = (s: string): string => {
    const room = cap - len + 16;
    return JSON.stringify(s.length > room ? s.slice(0, room) : s);
  };

  const write = (v: unknown, indent: string): void => {
    if (state.done) return;
    if (v === null) return void push("null");
    // Narrow on `typeof v` directly (not a cached copy) so each leaf type is
    // known without a cast.
    if (typeof v === "number" || typeof v === "boolean") {
      return void push(String(v));
    }
    if (typeof v === "bigint") return void push(v.toString());
    if (typeof v === "string") return void push(quote(v));

    if (Array.isArray(v)) {
      if (v.length === 0) return void push("[]");
      if (!push("[\n")) return;
      const inner = `${indent}  `;
      for (let i = 0; i < v.length; i++) {
        if (!push(inner)) return;
        write(v[i], inner);
        if (!push(i < v.length - 1 ? ",\n" : "\n")) return;
      }
      push(`${indent}]`);
      return;
    }

    if (typeof v === "object") {
      const entries = Object.entries(v as Record<string, unknown>).filter(
        ([, val]) => val !== undefined && typeof val !== "function",
      );
      if (entries.length === 0) return void push("{}");
      if (!push("{\n")) return;
      const inner = `${indent}  `;
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (entry === undefined) continue;
        const [k, val] = entry;
        if (!push(`${inner}${JSON.stringify(k)}: `)) return;
        write(val, inner);
        if (!push(i < entries.length - 1 ? ",\n" : "\n")) return;
      }
      push(`${indent}}`);
      return;
    }

    // undefined / function / symbol at the top level → `JSON.stringify` returns
    // `undefined`; emit `null` so the result is always valid text.
    push("null");
  };

  write(value, "");
  const text = chunks.join("");
  return state.done
    ? `${text.slice(0, cap)}\n\n… (truncated — use Download for the full file)`
    : text;
}
