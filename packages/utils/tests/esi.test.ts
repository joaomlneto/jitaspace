import { isSpecialLabelId, humanLabelName } from "../src/esi";

describe("isSpecialLabelId", () => {
  it("returns truthy for label_id 1 (Inbox)", () => {
    expect(isSpecialLabelId(1)).toBeTruthy();
  });

  it("returns truthy for label_id 2 (Sent)", () => {
    expect(isSpecialLabelId(2)).toBeTruthy();
  });

  it("returns truthy for label_id 4 (Corporation)", () => {
    expect(isSpecialLabelId(4)).toBeTruthy();
  });

  it("returns truthy for label_id 8 (Alliance)", () => {
    expect(isSpecialLabelId(8)).toBeTruthy();
  });

  it("returns falsy for a non-special id", () => {
    expect(isSpecialLabelId(99)).toBeFalsy();
  });

  it("returns falsy for id 0", () => {
    expect(isSpecialLabelId(0)).toBeFalsy();
  });

  it("returns falsy when id is undefined", () => {
    expect(isSpecialLabelId(undefined)).toBeFalsy();
  });

  it("returns falsy for a random large number", () => {
    expect(isSpecialLabelId(1000)).toBeFalsy();
  });
});

describe("humanLabelName", () => {
  it("returns 'Inbox' for label_id 1", () => {
    expect(humanLabelName({ label_id: 1 })).toBe("Inbox");
  });

  it("returns 'Sent' for label_id 2", () => {
    expect(humanLabelName({ label_id: 2 })).toBe("Sent");
  });

  it("returns 'Corporation' for label_id 4", () => {
    expect(humanLabelName({ label_id: 4 })).toBe("Corporation");
  });

  it("returns 'Alliance' for label_id 8", () => {
    expect(humanLabelName({ label_id: 8 })).toBe("Alliance");
  });

  it("returns the label name for a non-special id with a name", () => {
    expect(humanLabelName({ label_id: 42, name: "My Label" })).toBe("My Label");
  });

  it("returns the stringified label_id when name is absent and id is non-special", () => {
    expect(humanLabelName({ label_id: 99 })).toBe("99");
  });

  it("returns 'Unknown Label' when label is undefined", () => {
    expect(humanLabelName(undefined)).toBe("Unknown Label");
  });

  it("returns 'Unknown Label' when label object is empty", () => {
    expect(humanLabelName({})).toBe("Unknown Label");
  });

  it("returns name when label_id is undefined but name is provided", () => {
    expect(humanLabelName({ name: "Custom" })).toBe("Custom");
  });
});
