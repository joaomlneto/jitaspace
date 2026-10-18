import { describe, expect, it } from "@jest/globals";

import {
  contactRowKey,
  contactSourceKey,
  toContactRows,
} from "~/components/Contacts/contactRows";

const CHARACTER_ID = 90000001;
const OTHER_CHARACTER_ID = 90000002;
const CORPORATION_ID = 98000001;

describe("toContactRows", () => {
  it("tags each contact with its source", () => {
    const [row] = toContactRows(
      "corporation",
      [
        {
          contact_id: 1,
          contact_type: "character",
          standing: 10,
          is_watched: true,
          subjectId: CORPORATION_ID,
        },
      ],
      [],
    );

    expect(row?.source).toEqual({
      kind: "corporation",
      subjectId: CORPORATION_ID,
    });
    expect(row?.is_watched).toBe(true);
    expect(row?.is_blocked).toBeUndefined();
  });

  it("resolves label ids against the contact's own source", () => {
    // Label 3 exists on both characters under different names: each contact
    // must get its own character's name for it.
    const rows = toContactRows(
      "character",
      [
        {
          contact_id: 1,
          contact_type: "character",
          standing: 5,
          label_ids: [3],
          subjectId: CHARACTER_ID,
        },
        {
          contact_id: 2,
          contact_type: "character",
          standing: 5,
          label_ids: [3],
          subjectId: OTHER_CHARACTER_ID,
        },
      ],
      [
        { label_id: 3, label_name: "Friends", subjectId: CHARACTER_ID },
        { label_id: 3, label_name: "Enemies", subjectId: OTHER_CHARACTER_ID },
      ],
    );

    expect(rows.map((row) => row.labelNames)).toEqual([
      ["Friends"],
      ["Enemies"],
    ]);
  });

  it("falls back to the label id when the source does not list it", () => {
    const [row] = toContactRows(
      "character",
      [
        {
          contact_id: 1,
          contact_type: "character",
          standing: 5,
          label_ids: [3, 999],
          subjectId: CHARACTER_ID,
        },
      ],
      [{ label_id: 3, label_name: "Friends", subjectId: CHARACTER_ID }],
    );

    expect(row?.labelNames).toEqual(["Friends", "999"]);
  });

  it("gives a contact without label_ids no label names", () => {
    const [row] = toContactRows(
      "alliance",
      [
        {
          contact_id: 1,
          contact_type: "faction",
          standing: -5,
          subjectId: 99000001,
        },
      ],
      [],
    );

    expect(row?.labelNames).toEqual([]);
  });
});

describe("contact keys", () => {
  it("distinguishes the same contact held by two sources", () => {
    const [fromCharacter] = toContactRows(
      "character",
      [
        {
          contact_id: 1,
          contact_type: "character",
          standing: 5,
          subjectId: CHARACTER_ID,
        },
      ],
      [],
    );
    const [fromCorporation] = toContactRows(
      "corporation",
      [
        {
          contact_id: 1,
          contact_type: "character",
          standing: 5,
          subjectId: CORPORATION_ID,
        },
      ],
      [],
    );

    expect(fromCharacter && contactRowKey(fromCharacter)).not.toEqual(
      fromCorporation && contactRowKey(fromCorporation),
    );
  });

  it("keys a source by kind and id", () => {
    expect(contactSourceKey({ kind: "alliance", subjectId: 99000001 })).toBe(
      "alliance:99000001",
    );
  });
});
