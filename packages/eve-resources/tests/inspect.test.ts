import { describe, expect, it } from "@jest/globals";

import { inspectBinary } from "../src/decode";

const bytesOf = (s: string): Uint8Array =>
  new Uint8Array([...s].map((c) => c.charCodeAt(0)));

describe("inspectBinary", () => {
  it("reports magic bytes, size, and a hex dump", () => {
    const r = inspectBinary(
      new Uint8Array([0x56, 0x54, 0x41, 0x00, 0x01, 0x02]),
    );
    expect(r.byteLength).toBe(6);
    expect(r.sampledBytes).toBe(6);
    expect(r.magicAscii).toBe("VTA·"); // 0x00 is non-printable → ·
    expect(r.magicHex).toBe("56 54 41 00");
    expect(r.hexDumpBytes).toBe(6);
    expect(r.hexDump).toContain("00000000");
    expect(r.hexDump).toContain("56 54 41 00");
  });

  it("uses the provided total size when only a leading slice is sampled", () => {
    const r = inspectBinary(new Uint8Array(64), 9_567_340);
    expect(r.byteLength).toBe(9_567_340);
    expect(r.sampledBytes).toBe(64);
  });

  it("extracts distinct printable runs of length >= 4", () => {
    const r = inspectBinary(bytesOf("BlobAggFile\0\0NavMesh\0abc\0NavMesh\0"));
    expect(r.strings).toContain("BlobAggFile");
    expect(r.strings).toContain("NavMesh");
    expect(r.strings).not.toContain("abc"); // shorter than 4 chars
    expect(r.strings.filter((s) => s === "NavMesh")).toHaveLength(1); // deduped
  });

  it("computes the printable ratio", () => {
    const r = inspectBinary(new Uint8Array([65, 66, 67, 0, 0, 0, 0, 0])); // 3 of 8
    expect(r.printableRatio).toBeCloseTo(0.375, 3);
  });

  it("limits the hex dump to the requested byte count", () => {
    const r = inspectBinary(new Uint8Array(1000), 1000, 64);
    expect(r.hexDumpBytes).toBe(64);
    expect(r.hexDump.split("\n")).toHaveLength(4); // 64 bytes / 16 per row
  });

  it("handles an empty buffer without dividing by zero", () => {
    const r = inspectBinary(new Uint8Array(0), 0);
    expect(r.printableRatio).toBe(0);
    expect(r.strings).toEqual([]);
    expect(r.magicAscii).toBe("");
    expect(r.hexDump).toBe("");
  });
});
