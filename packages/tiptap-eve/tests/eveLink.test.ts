import { isAllowedUri } from "@tiptap/extension-link";

import { renderEveHref } from "../Extensions/EveLink";

describe("renderEveHref", () => {
  describe("regular URLs", () => {
    it("passes through https URLs unchanged", () => {
      expect(renderEveHref("https://example.com")).toBe("https://example.com");
    });

    it("passes through https URLs with paths unchanged", () => {
      expect(renderEveHref("https://example.com/some/path?query=1")).toBe(
        "https://example.com/some/path?query=1",
      );
    });

    it("passes through http URLs unchanged", () => {
      expect(renderEveHref("http://example.com")).toBe("http://example.com");
    });

    it("passes through empty string unchanged", () => {
      expect(renderEveHref("")).toBe("");
    });

    it("passes through unrecognized protocols unchanged", () => {
      expect(renderEveHref("ftp://example.com")).toBe("ftp://example.com");
    });
  });

  describe("showinfo links — type lookup only (no ID)", () => {
    it("converts showinfo with only a type ID to /type/:typeId", () => {
      expect(renderEveHref("showinfo:34")).toBe("/type/34");
    });

    it("converts showinfo with any unrecognized single type ID to /type/:typeId", () => {
      expect(renderEveHref("showinfo:9999")).toBe("/type/9999");
    });
  });

  describe("showinfo links — named entity types", () => {
    it.each([
      ["corporations (type 2)", "showinfo:2//98000001", "/corporation/98000001"],
      ["regions (type 3)", "showinfo:3//10000002", "/region/10000002"],
      ["constellations (type 4)", "showinfo:4//20000020", "/constellation/20000020"],
      ["solar systems (type 5)", "showinfo:5//30000142", "/system/30000142"],
      ["alliances (type 16159)", "showinfo:16159//498125261", "/alliance/498125261"],
    ])("converts %s", (_name, input, expected) => {
      expect(renderEveHref(input)).toBe(expected);
    });
  });

  describe("showinfo links — characters", () => {
    const CHARACTER_TYPE_IDS = [
      1373, 1374, 1375, 1376, 1377, 1378, 1379, 1380, 1381, 1382, 1383, 1384,
      1385, 1386, 34574,
    ];

    it.each(CHARACTER_TYPE_IDS)(
      "converts character type %i to /character/:id",
      (typeId) => {
        expect(renderEveHref(`showinfo:${typeId}//93345033`)).toBe(
          "/character/93345033",
        );
      },
    );
  });

  describe("showinfo links — stations", () => {
    const STATION_TYPE_SAMPLE = [
      54, // Caldari Administrative Station
      56,
      57,
      58,
      59,
      1529,
      1530,
      1531,
      71361, // Astrahus
      74397, // Keepstar
    ];

    it.each(STATION_TYPE_SAMPLE)(
      "converts station type %i to /station/:id",
      (typeId) => {
        expect(renderEveHref(`showinfo:${typeId}//60004588`)).toBe(
          "/station/60004588",
        );
      },
    );

    it("converts a citadel-era structure type (52678) to /station/:id", () => {
      expect(renderEveHref("showinfo:52678//1029490")).toBe("/station/1029490");
    });
  });

  describe("showinfo links — unrecognized types with ID", () => {
    it("returns original href for unrecognized type with // separator", () => {
      expect(renderEveHref("showinfo:9999//12345")).toBe(
        "showinfo:9999//12345",
      );
    });

    it("returns original href for type 6 (not a recognized type) with ID", () => {
      expect(renderEveHref("showinfo:6//12345")).toBe("showinfo:6//12345");
    });
  });

  describe("warreport links", () => {
    it.each([
      ["numeric ID", "warreport:1234567", "/war/1234567"],
      ["small numeric ID", "warreport:42", "/war/42"],
    ])("converts warreport with %s", (_name, input, expected) => {
      expect(renderEveHref(input)).toBe(expected);
    });
  });

  describe("killreport links", () => {
    it("converts killreport:id:hash to /kill/:id?hash=:hash", () => {
      expect(
        renderEveHref(
          "killreport:13807613:1d88cad6ae072bbba76dd5708e7bdb4f7e57dd46",
        ),
      ).toBe("/kill/13807613?hash=1d88cad6ae072bbba76dd5708e7bdb4f7e57dd46");
    });

    it("converts killreport with a different ID and hash", () => {
      expect(
        renderEveHref(
          "killreport:99999999:abcdef1234567890abcdef1234567890abcdef12",
        ),
      ).toBe("/kill/99999999?hash=abcdef1234567890abcdef1234567890abcdef12");
    });

    it("converts killreport with only an ID (no hash)", () => {
      expect(renderEveHref("killreport:13807613")).toBe("/kill/13807613");
    });
  });

  describe("recruitmentad links", () => {
    it("converts recruitmentad:corpId//adId to /corporation/:corpId", () => {
      expect(renderEveHref("recruitmentad:98645206//155600")).toBe(
        "/corporation/98645206",
      );
    });

    it("ignores the ad ID — only the corporation ID matters", () => {
      expect(renderEveHref("recruitmentad:12345678//999")).toBe(
        "/corporation/12345678",
      );
    });
  });

  describe("contract links", () => {
    it("converts contract:0//contractId to /contract/:contractId", () => {
      expect(renderEveHref("contract:0//196428637")).toBe(
        "/contract/196428637",
      );
    });

    it("ignores the first segment — only the contract ID matters", () => {
      expect(renderEveHref("contract:98000001//987654321")).toBe(
        "/contract/987654321",
      );
    });
  });

  describe("pass-through links (intercepted by click handler or app routing)", () => {
    // Schemes are normalised to lowercase by convertEveUrlTags before TipTap
    // stores them, so renderEveHref only ever receives lowercase schemes here.
    it.each([
      ["joinchannel (negative ID)", "joinchannel:-26572540"],
      ["joinchannel (positive ID)", "joinchannel:12345678"],
      ["helppointer", "helppointer:neocom.airCareerProgram"],
      ["fitting", "fitting:33470:31047;1:31011;1::"],
      ["localsvc", "localsvc:method=OpenFWWindow"],
      ["opportunity", "opportunity:epic_arcs:40"],
      ["careerprogramnode", "careerprogramnode:7:410:None"],
      ["fleet", "fleet:1021212278338"],
      [
        "shipskinlisting",
        "shipskinlisting:fe7ec0c3-2d02-4d3b-9cd4-b41221941951",
      ],
    ])("passes %s hrefs through unchanged", (_name, href) => {
      expect(renderEveHref(href)).toBe(href);
    });
  });

  describe("showinfo links — edge cases", () => {
    it("returns /type/ for showinfo: with no type ID", () => {
      // "showinfo:" → slice → "" → split("//") → [""] → length 1 → /type/
      expect(renderEveHref("showinfo:")).toBe("/type/");
    });

    it("returns /type/:typeId when a named-entity type has no // entity segment", () => {
      // Without "//", type 2 is treated as a generic inventory type, not a corporation
      expect(renderEveHref("showinfo:2")).toBe("/type/2");
      expect(renderEveHref("showinfo:5")).toBe("/type/5");
      expect(renderEveHref("showinfo:1373")).toBe("/type/1373");
      expect(renderEveHref("showinfo:16159")).toBe("/type/16159");
    });

    it("passes through showinfo with a non-numeric type ID unchanged", () => {
      // parseInt("abc") = NaN, not in any type list → falls through
      expect(renderEveHref("showinfo:abc//12345")).toBe("showinfo:abc//12345");
    });

    it("handles showinfo with empty entity ID after //", () => {
      // character type with empty entity → /character/
      expect(renderEveHref("showinfo:1373//")).toBe("/character/");
      // corporation type with empty entity → /corporation/
      expect(renderEveHref("showinfo:2//")).toBe("/corporation/");
    });

    it("ignores extra segments beyond the first entity ID", () => {
      // split("//") produces > 2 elements — only [0] and [1] are used
      expect(renderEveHref("showinfo:1373//93345033//extra")).toBe(
        "/character/93345033",
      );
    });
  });
});

describe("EveLink protocol configuration", () => {
  // EveLink registers all EVE-specific schemes as lowercase — linkifyjs v4
  // (used by TipTap v3) rejects any scheme containing uppercase letters.
  // TipTap's setLink command calls isAllowedUri before applying the mark —
  // if it returns false the command silently no-ops. These tests verify that
  // our protocol list unlocks all EVE-specific schemes.
  const eveProtocols = [
    "showinfo",
    "warreport",
    "killreport",
    "recruitmentad",
    "contract",
    "joinchannel",
    "helppointer",
    "shipskinlisting",
    "fitting",
    "localsvc",
    "opportunity",
    "careerprogramnode",
    "fleet",
  ];

  const EVE_PROTOCOL_SAMPLES: [string, string][] = [
    ["showinfo", "showinfo:1373//93345033"],
    ["warreport", "warreport:42"],
    [
      "killreport",
      "killreport:13807613:1d88cad6ae072bbba76dd5708e7bdb4f7e57dd46",
    ],
    ["recruitmentad", "recruitmentad:98645206//155600"],
    ["contract", "contract:0//196428637"],
    ["joinchannel", "joinchannel:-26572540"],
    ["helppointer", "helppointer:neocom.airCareerProgram"],
    [
      "shipskinlisting",
      "shipskinlisting:fe7ec0c3-2d02-4d3b-9cd4-b41221941951",
    ],
    ["fitting", "fitting:33470:31047;1::"],
    ["localsvc", "localsvc:method=OpenFWWindow"],
    ["opportunity", "opportunity:epic_arcs:40"],
    ["careerprogramnode", "careerprogramnode:7:410:None"],
    ["fleet", "fleet:1021212278338"],
  ];

  it.each(EVE_PROTOCOL_SAMPLES)(
    "allows %s: URLs when the protocol is listed",
    (_, url) => {
      expect(isAllowedUri(url, eveProtocols)).toBeTruthy();
    },
  );

  it.each(EVE_PROTOCOL_SAMPLES)(
    "rejects %s: URLs when no EVE protocols are configured",
    (_, url) => {
      expect(isAllowedUri(url, [])).toBeFalsy();
    },
  );

  it("still allows standard https: URLs regardless of the protocol list", () => {
    expect(isAllowedUri("https://example.com", eveProtocols)).toBeTruthy();
    expect(isAllowedUri("https://example.com", [])).toBeTruthy();
  });

  it("still allows http: URLs regardless of the protocol list", () => {
    expect(isAllowedUri("http://example.com", eveProtocols)).toBeTruthy();
    expect(isAllowedUri("http://example.com", [])).toBeTruthy();
  });

  it("allows all showinfo: variants (different entity types)", () => {
    const urls = [
      "showinfo:2//98000001", // corporation
      "showinfo:3//10000002", // region
      "showinfo:4//20000020", // constellation
      "showinfo:5//30000142", // solar system
      "showinfo:16159//498125261", // alliance
      "showinfo:1373//93345033", // character
      "showinfo:1529//60004588", // station
      "showinfo:34", // inventory type
    ];
    for (const url of urls) {
      expect(isAllowedUri(url, eveProtocols)).toBeTruthy();
    }
  });
});
