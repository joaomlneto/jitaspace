import { gzipSync } from "node:zlib";
import { describe, expect, it } from "@jest/globals";

import { decodePickleBytes, unpickle } from "../src/index";

/**
 * Assemble a pickle byte stream from literal parts: a `number` is one raw byte,
 * a `string` contributes its (latin-1) char codes. Lets us write authentic
 * Python 2.7 pickles by hand, mixing ASCII opcodes with binary fields.
 */
function pk(...parts: (string | number)[]): Uint8Array {
  const out: number[] = [];
  for (const part of parts) {
    if (typeof part === "number") out.push(part);
    else for (const ch of part) out.push(ch.charCodeAt(0) & 0xff);
  }
  return new Uint8Array(out);
}

describe("unpickle — protocol 0 (ASCII)", () => {
  it("decodes a dict of string/int (the embedded-schema shape)", () => {
    // (d S'type'\n S'int'\n s S'min'\n I0\n s .
    const bytes = pk(
      "(d",
      "S'type'\n",
      "S'int'\n",
      "s",
      "S'min'\n",
      "I0\n",
      "s",
      ".",
    );
    expect(unpickle(bytes)).toEqual({ type: "int", min: 0 });
  });

  it("decodes mixed scalars: string, int, float, bool, None, nested list", () => {
    const bytes = pk(
      "(d",
      "S'name'\n",
      "S'Jita'\n",
      "s",
      "S'id'\n",
      "I30000142\n",
      "s",
      "S'sec'\n",
      "F0.5\n",
      "s",
      "S'hi'\n",
      "I01\n",
      "s", // I01 → true
      "S'n'\n",
      "N",
      "s", // None
      "S'lst'\n",
      "(l",
      "I1\n",
      "a",
      "I2\n",
      "a",
      "I3\n",
      "a",
      "s",
      ".",
    );
    expect(unpickle(bytes)).toEqual({
      name: "Jita",
      id: 30000142,
      sec: 0.5,
      hi: true,
      n: null,
      lst: [1, 2, 3],
    });
  });

  it("decodes I00 as false and a unicode (V) string", () => {
    expect(unpickle(pk("I00\n", "."))).toBe(false);
    expect(unpickle(pk("Vhello\n", "."))).toBe("hello");
  });

  it("APPENDS (e) extends a list from a marked group", () => {
    // (l ( I1 I2 I3 e .
    expect(unpickle(pk("(l", "(", "I1\n", "I2\n", "I3\n", "e", "."))).toEqual([
      1, 2, 3,
    ]);
  });

  it("PUT/GET (p/g) share the same memoized object", () => {
    // (l I1 a p0  ( g0 g0 t .   → a tuple of the same [1] twice
    const result = unpickle(
      pk("(l", "I1\n", "a", "p0\n", "(", "g0\n", "g0\n", "t", "."),
    );
    expect(result).toEqual([[1], [1]]);
    const [a, b] = result as unknown[];
    expect(a).toBe(b); // memo returns the identical reference
  });

  it("unescapes Python repr escapes inside STRING", () => {
    expect(unpickle(pk("S'a\\tb\\nc'\n", "."))).toBe("a\tb\nc");
  });

  it("builds an OrderedDict via GLOBAL + REDUCE, preserving order", () => {
    const bytes = pk(
      "ccollections\nOrderedDict\n",
      "(l",
      "(",
      "S'a'\n",
      "I1\n",
      "t",
      "a",
      "(",
      "S'b'\n",
      "I2\n",
      "t",
      "a",
      0x85, // TUPLE1 → wrap the pairs-list in a 1-tuple (the reduce args)
      "R", // REDUCE
      ".",
    );
    const result = unpickle(bytes) as Record<string, number>;
    expect(result).toEqual({ a: 1, b: 2 });
    expect(Object.keys(result)).toEqual(["a", "b"]);
  });
});

describe("unpickle — protocol 2 (binary)", () => {
  it("decodes EMPTY_DICT + BINUNICODE + BININT1 + SETITEM", () => {
    // \x80\x02 } q\x00 X\x01\x00\x00\x00 k q\x01 K\x01 s .
    const bytes = pk(
      0x80,
      2,
      "}",
      "q",
      0,
      "X",
      1,
      0,
      0,
      0,
      "k",
      "q",
      1,
      "K",
      1,
      "s",
      ".",
    );
    expect(unpickle(bytes)).toEqual({ k: 1 });
  });

  it("decodes TUPLE2, negative BININT4, big-endian BINFLOAT, NEWTRUE, None via SETITEMS", () => {
    const bytes = pk(
      0x80,
      2,
      "}",
      "(",
      "X",
      1,
      0,
      0,
      0,
      "t",
      "K",
      1,
      "K",
      2,
      0x86, // t: (1,2)
      "X",
      3,
      0,
      0,
      0,
      "neg",
      "J",
      0xfb,
      0xff,
      0xff,
      0xff, // neg: -5
      "X",
      1,
      0,
      0,
      0,
      "f",
      "G",
      0x40,
      0x04,
      0,
      0,
      0,
      0,
      0,
      0, // f: 2.5
      "X",
      1,
      0,
      0,
      0,
      "b",
      0x88, // b: True
      "X",
      1,
      0,
      0,
      0,
      "n",
      "N", // n: None
      "u",
      ".",
    );
    expect(unpickle(bytes)).toEqual({
      t: [1, 2],
      neg: -5,
      f: 2.5,
      b: true,
      n: null,
    });
  });

  it("decodes BININT2 (M) and SHORT_BINSTRING (U)", () => {
    expect(unpickle(pk("M", 0x10, 0x27, "."))).toBe(10000); // 0x2710
    expect(unpickle(pk("U", 3, "abc", "."))).toBe("abc");
  });

  it("decodes a signed LONG1 (\\x8a)", () => {
    // LONG1, length 2, value 0xFF 0xFF → -1 (two's complement)
    expect(unpickle(pk(0x8a, 2, 0xff, 0xff, "."))).toBe(-1);
    // LONG1, length 0 → 0
    expect(unpickle(pk(0x8a, 0, "."))).toBe(0);
  });
});

describe("unpickle — errors", () => {
  it("throws on an unsupported opcode", () => {
    expect(() => unpickle(pk(0xff, "."))).toThrow(/Unsupported pickle opcode/);
  });

  it("throws when the stream ends without STOP", () => {
    expect(() => unpickle(pk("I1\n"))).toThrow(/without STOP/);
  });
});

describe("decodePickleBytes", () => {
  // (d S'k'\n S'v'\n s .  → { k: "v" }
  const plain = pk("(d", "S'k'\n", "S'v'\n", "s", ".");

  it("decodes raw (uncompressed) pickle bytes like unpickle", async () => {
    await expect(decodePickleBytes(plain)).resolves.toEqual({ k: "v" });
  });

  it("gunzips a gzip-wrapped pickle before decoding", async () => {
    const gz = new Uint8Array(gzipSync(plain));
    expect([gz[0], gz[1]]).toEqual([0x1f, 0x8b]); // sanity: real gzip magic
    await expect(decodePickleBytes(gz)).resolves.toEqual({ k: "v" });
  });
});
