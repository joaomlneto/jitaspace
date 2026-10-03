/**
 * Minimal Python pickle reader for the plain-data `.pickle` files EVE ships as
 * resources. It handles dicts, lists, tuples, strings, ints, bools, floats,
 * None, and the memo (PUT/GET) — not class instances or `__reduce__`.
 */
import { gunzipIfNeeded } from "./gzip";

const MARK = Symbol("pickle-mark");

/**
 * Hard ceiling for decoding a pickle inline (client-side). The localization
 * tables under `res:/localizationfsd/` reach ~145 MB; this leaves headroom for
 * those while still rejecting anything pathological that would exhaust the
 * browser/webview heap. Larger files fall back to Download.
 */
export const MAX_PICKLE_DECODE_BYTES = 256 * 1024 * 1024;

interface PickleGlobal {
  __pickleGlobal__: string;
}

/** Apply a REDUCE: `func(*args)` for the handful of globals EVE schemas use. */
function applyReduce(func: unknown, args: unknown): unknown {
  const name = (func as Partial<PickleGlobal>).__pickleGlobal__;
  // OrderedDict(([[k, v], ...],)) → a plain object preserving insertion order.
  // The reduce args are a tuple; OrderedDict/set take a single iterable arg.
  const tuple = Array.isArray(args) ? (args as unknown[]) : [];
  const single =
    tuple.length === 1 && Array.isArray(tuple[0])
      ? (tuple[0] as unknown[])
      : tuple;

  if (name === "collections OrderedDict") {
    const obj: Record<string, unknown> = {};
    for (const pair of single) {
      if (Array.isArray(pair) && pair.length >= 2) {
        const kv = pair as unknown[];
        obj[String(kv[0])] = kv[1];
      }
    }
    return obj;
  }
  if (name === "__builtin__ set" || name === "__builtin__ frozenset") {
    return single;
  }
  throw new Error(
    `Unsupported pickle global in REDUCE: ${name ?? "<unknown>"}`,
  );
}

function unescapeReprString(raw: string): string {
  // `raw` is a Python repr including the surrounding quote characters.
  const body = raw.slice(1, raw.length - 1);
  let out = "";
  for (let j = 0; j < body.length; j++) {
    const c = body[j];
    if (c !== "\\") {
      out += c;
      continue;
    }
    const next = body[j + 1] ?? "";
    j++;
    switch (next) {
      case "n":
        out += "\n";
        break;
      case "t":
        out += "\t";
        break;
      case "r":
        out += "\r";
        break;
      case "\\":
        out += "\\";
        break;
      case "'":
        out += "'";
        break;
      case '"':
        out += '"';
        break;
      case "x": {
        out += String.fromCharCode(parseInt(body.substr(j + 1, 2), 16));
        j += 2;
        break;
      }
      default:
        out += next;
    }
  }
  return out;
}

export function unpickle(bytes: Uint8Array): unknown {
  const stack: unknown[] = [];
  const memo = new Map<number, unknown>();
  const latin1 = new TextDecoder("latin1");
  const utf8 = new TextDecoder("utf-8");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let i = 0;

  // Decode an n-byte little-endian two's-complement integer (Python LONG1/4).
  const readLongLE = (off: number, n: number): number => {
    let v = 0n;
    for (let k = n - 1; k >= 0; k--)
      v = (v << 8n) | BigInt(bytes[off + k] ?? 0);
    if (n > 0 && ((bytes[off + n - 1] ?? 0) & 0x80) !== 0)
      v -= 1n << BigInt(8 * n);
    return Number(v);
  };

  const readLine = (): string => {
    let s = "";
    while (i < bytes.length && bytes[i] !== 0x0a) {
      s += String.fromCharCode(bytes[i] ?? 0);
      i++;
    }
    i++; // consume newline
    return s;
  };
  const peek = (): unknown => stack[stack.length - 1];
  const popToMark = (): unknown[] => {
    const items: unknown[] = [];
    while (stack.length) {
      const v = stack.pop();
      if (v === MARK) break;
      items.push(v);
    }
    return items.reverse();
  };

  while (i < bytes.length) {
    const op = bytes[i++] ?? 0;
    switch (op) {
      case 0x28:
        stack.push(MARK);
        break; // (  MARK
      case 0x2e:
        return stack.pop(); // .  STOP
      case 0x30:
        stack.pop();
        break; // 0  POP
      case 0x4e:
        stack.push(null);
        break; // N  NONE
      case 0x88:
        stack.push(true);
        break; // NEWTRUE
      case 0x89:
        stack.push(false);
        break; // NEWFALSE
      case 0x73: {
        // s  SETITEM
        const v = stack.pop();
        const k = stack.pop();
        (peek() as Record<string, unknown>)[String(k)] = v;
        break;
      }
      case 0x75: {
        // u  SETITEMS
        const items = popToMark();
        const d = peek() as Record<string, unknown>;
        for (let j = 0; j + 1 < items.length; j += 2)
          d[String(items[j])] = items[j + 1];
        break;
      }
      case 0x61: {
        // a  APPEND
        const v = stack.pop();
        (peek() as unknown[]).push(v);
        break;
      }
      case 0x65: {
        // e  APPENDS
        const items = popToMark();
        const list = peek() as unknown[];
        for (const it of items) list.push(it);
        break;
      }
      case 0x64: {
        // d  DICT
        const items = popToMark();
        const d: Record<string, unknown> = {};
        for (let j = 0; j + 1 < items.length; j += 2)
          d[String(items[j])] = items[j + 1];
        stack.push(d);
        break;
      }
      case 0x7d:
        stack.push({});
        break; // }  EMPTY_DICT
      case 0x6c:
        stack.push(popToMark());
        break; // l  LIST
      case 0x5d:
        stack.push([]);
        break; // ]  EMPTY_LIST
      case 0x74:
        stack.push(popToMark());
        break; // t  TUPLE
      case 0x29:
        stack.push([]);
        break; // )  EMPTY_TUPLE
      case 0x53:
        stack.push(unescapeReprString(readLine()));
        break; // S  STRING
      case 0x56:
        stack.push(readLine());
        break; // V  UNICODE
      case 0x49: {
        // I  INT (00/01 are bools)
        const line = readLine();
        stack.push(
          line === "01" ? true : line === "00" ? false : parseInt(line, 10),
        );
        break;
      }
      case 0x4c: {
        // L  LONG
        const line = readLine();
        stack.push(parseInt(line.endsWith("L") ? line.slice(0, -1) : line, 10));
        break;
      }
      case 0x46:
        stack.push(parseFloat(readLine()));
        break; // F  FLOAT
      case 0x70:
        memo.set(parseInt(readLine(), 10), peek());
        break; // p  PUT
      case 0x67:
        stack.push(memo.get(parseInt(readLine(), 10)));
        break; // g  GET
      case 0x71:
        memo.set(bytes[i++] ?? 0, peek());
        break; // q  BINPUT
      case 0x68:
        stack.push(memo.get(bytes[i++] ?? 0));
        break; // h  BINGET
      case 0x4b:
        stack.push(bytes[i++] ?? 0);
        break; // K  BININT1
      case 0x55: {
        // U  SHORT_BINSTRING
        const n = bytes[i++] ?? 0;
        stack.push(latin1.decode(bytes.subarray(i, i + n)));
        i += n;
        break;
      }
      case 0x80:
        i++;
        break; // PROTO (skip version)
      case 0x63: {
        // c  GLOBAL
        const module = readLine();
        const qualname = readLine();
        stack.push({ __pickleGlobal__: `${module} ${qualname}` });
        break;
      }
      case 0x52: {
        // R  REDUCE
        const args = stack.pop();
        const func = stack.pop();
        stack.push(applyReduce(func, args));
        break;
      }
      case 0x62: {
        // b  BUILD
        const state = stack.pop();
        const obj = peek();
        if (
          state &&
          typeof state === "object" &&
          obj &&
          typeof obj === "object"
        ) {
          Object.assign(obj, state);
        }
        break;
      }
      // --- protocol 1/2/4 binary opcodes ---
      case 0x4a:
        stack.push(view.getInt32(i, true));
        i += 4;
        break; // J  BININT4
      case 0x4d:
        stack.push(view.getUint16(i, true));
        i += 2;
        break; // M  BININT2
      case 0x54: {
        // T  BINSTRING
        const n = view.getUint32(i, true);
        i += 4;
        stack.push(latin1.decode(bytes.subarray(i, i + n)));
        i += n;
        break;
      }
      case 0x58: {
        // X  BINUNICODE
        const n = view.getUint32(i, true);
        i += 4;
        stack.push(utf8.decode(bytes.subarray(i, i + n)));
        i += n;
        break;
      }
      case 0x8c: {
        // SHORT_BINUNICODE
        const n = bytes[i++] ?? 0;
        stack.push(utf8.decode(bytes.subarray(i, i + n)));
        i += n;
        break;
      }
      case 0x8a: {
        const n = bytes[i++] ?? 0;
        stack.push(readLongLE(i, n));
        i += n;
        break;
      } // LONG1
      case 0x8b: {
        const n = view.getUint32(i, true);
        i += 4;
        stack.push(readLongLE(i, n));
        i += n;
        break;
      } // LONG4
      case 0x47:
        stack.push(view.getFloat64(i, false));
        i += 8;
        break; // G  BINFLOAT (big-endian)
      case 0x85: {
        const a = stack.pop();
        stack.push([a]);
        break;
      } // TUPLE1
      case 0x86: {
        const b = stack.pop();
        const a = stack.pop();
        stack.push([a, b]);
        break;
      } // TUPLE2
      case 0x87: {
        const c = stack.pop();
        const b = stack.pop();
        const a = stack.pop();
        stack.push([a, b, c]);
        break;
      } // TUPLE3
      case 0x72:
        memo.set(view.getUint32(i, true), peek());
        i += 4;
        break; // r  LONG_BINPUT
      case 0x6a:
        stack.push(memo.get(view.getUint32(i, true)));
        i += 4;
        break; // j  LONG_BINGET
      case 0x94:
        memo.set(memo.size, peek());
        break; // MEMOIZE
      case 0x95:
        i += 8;
        break; // FRAME (skip length)
      case 0x93: {
        // STACK_GLOBAL
        const name = stack.pop();
        const mod = stack.pop();
        stack.push({ __pickleGlobal__: `${String(mod)} ${String(name)}` });
        break;
      }
      default:
        throw new Error(
          `Unsupported pickle opcode 0x${op.toString(16)} at offset ${i - 1}`,
        );
    }
  }
  throw new Error("pickle: reached end of data without STOP");
}

/**
 * Decode a `.pickle` file's raw bytes to a JS value: gunzip first if the CDN
 * handed back a gzip stream, then {@link unpickle}. This mirrors what the old
 * server-side route did via `fetchResourceBytes`, but is meant to run on the
 * client (browser / Tauri webview) after fetching the bytes through the
 * resource `file` proxy — keeping the multi-100 MB decode off the serverless
 * function.
 */
export async function decodePickleBytes(bytes: Uint8Array): Promise<unknown> {
  return unpickle(await gunzipIfNeeded(bytes));
}
