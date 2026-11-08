import { describe, expect, it } from "@jest/globals";

import {
  categoryHref,
  decodeHtmlEntities,
  entityHref,
  fieldId,
  notificationSubject,
  notificationTarget,
  parseNotificationFields,
  titleParts,
} from "~/components/Notifications/notificationDetails";

// Shaped like ESI's notification `text`: YAML, with CCP's Python-flavoured
// tags and anchors, inconsistent key casing and nested values.
const KILL_REPORT = `killMailHash: 8f5a1c0e9d7b6a5f4e3d2c1b0a9f8e7d6c5b4a39
killMailID: 123456789
victimShipTypeID: 670
`;
const CORP_INVITE = `applicationText: 'Join us!'
charID: 2112625428
corpID: 98000001
invokingCharID: 2112000000
`;
const WAR_DECLARED = `againstID: 98000001
cost: 100000000
declaredByID: 99005338
delayHours: 24
hostileState: false
warHQ: <b>Jita IV - Moon 4</b>
`;
const STRUCTURE_ATTACK = `allianceID: 99005338
armorPercentage: 100.0
charID: 2112000000
shieldPercentage: 41.5
solarsystemID: 30000142
structureID: &id001 1035466617946
structureShowInfoData:
- showinfo
- 35832
- *id001
structureTypeID: 35832
`;

const SENT_AT = "2026-10-08T12:00:00Z";
const target = (type: string, text: string, senderId = 1000125) =>
  notificationTarget({
    type,
    senderId,
    timestamp: SENT_AT,
    fields: parseNotificationFields(text),
  });
const href = (type: string, text: string, senderId = 1000125) => {
  const result = target(type, text, senderId);
  return result && "href" in result ? result.href : undefined;
};

describe("parseNotificationFields", () => {
  it("reads top-level scalars, lower-casing keys and dropping anchors and quotes", () => {
    const fields = parseNotificationFields(STRUCTURE_ATTACK);
    expect(fields.get("solarsystemid")).toBe("30000142");
    expect(fields.get("structureid")).toBe("1035466617946");
    expect(fields.get("shieldpercentage")).toBe("41.5");
    // The nested list's items are not fields, and its key has no scalar value.
    expect(fields.has("structureshowinfodata")).toBe(false);
    expect(fields.has("- showinfo")).toBe(false);

    expect(parseNotificationFields(CORP_INVITE).get("applicationtext")).toBe(
      "Join us!",
    );
  });

  it("skips values it can't read whole: block scalars and multi-line quotes", () => {
    const fields = parseNotificationFields(
      [
        "subject: >-",
        "  Raise tax",
        "  and buy a Keepstar",
        "body: |",
        "  line",
        "title: 'Raise tax and",
        "  buy a Keepstar'",
        "ok: 'It''s fine'",
      ].join("\n"),
    );
    expect(fields.has("subject")).toBe(false);
    expect(fields.has("body")).toBe(false);
    expect(fields.has("title")).toBe(false);
    // A doubled single quote is YAML's escaped quote.
    expect(fields.get("ok")).toBe("It's fine");
  });

  it("drops Python tags in front of a value", () => {
    const fields = parseNotificationFields("amount: !!python/long 15000000\n");
    expect(fieldId(fields, "amount")).toBe(15000000);
  });

  it("survives a missing or empty text", () => {
    expect(parseNotificationFields(undefined).size).toBe(0);
    expect(parseNotificationFields("").size).toBe(0);
  });

  it("only returns positive integer ids, trying keys in order", () => {
    const fields = parseNotificationFields(
      "a: 0\nb: 12.5\nc: abc\nd: 42\ne: 7\n",
    );
    expect(fieldId(fields, "a", "b", "c", "d", "e")).toBe(42);
    expect(fieldId(fields, "missing")).toBeUndefined();
  });
});

describe("entityHref", () => {
  it.each([
    [99005338, "/alliance/99005338"],
    [98000001, "/corporation/98000001"],
    [1000125, "/corporation/1000125"],
    [2112625428, "/character/2112625428"],
    [30000142, "/system/30000142"],
    [60003760, "/station/60003760"],
    [20000020, "/constellation/20000020"],
    [10000002, "/region/10000002"],
  ])("links %i to %s", (id, path) => {
    expect(entityHref(id)).toBe(path);
  });

  it("does not guess at ids it cannot place", () => {
    expect(entityHref(1035466617946)).toBeUndefined();
    expect(entityHref(undefined)).toBeUndefined();
  });
});

describe("notificationTarget", () => {
  it("opens a kill report's killmail, with its hash", () => {
    expect(href("KillReportVictim", KILL_REPORT)).toBe(
      "/kill/123456789?hash=8f5a1c0e9d7b6a5f4e3d2c1b0a9f8e7d6c5b4a39",
    );
    expect(href("KillReportFinalBlow", "killMailID: 5\n")).toBe("/kill/5");
  });

  it("opens the corporation a character was invited to", () => {
    expect(href("CorpAppInvitedMsg", CORP_INVITE)).toBe(
      "/corporation/98000001",
    );
  });

  it("opens the applicant, for an application to your corporation", () => {
    expect(href("CorpAppNewMsg", CORP_INVITE)).toBe("/character/2112625428");
  });

  it("finds the war from its sides, falling back to the declarer", () => {
    // No war notification names its war: they carry the two sides only.
    for (const type of ["WarDeclared", "AllWarDeclaredMsg", "WarInvalid"]) {
      expect(target(type, WAR_DECLARED)).toEqual({
        war: { aggressorId: 99005338, defenderId: 98000001, at: SENT_AT },
        fallback: { href: "/alliance/99005338" },
      });
    }
  });

  it("links the one side it knows rather than guessing at a war", () => {
    // An aggressor alone matches any of its wars, so there is no lookup.
    expect(
      target("AllyJoinedWarDefenderMsg", "aggressorID: 99005338\nallyID: 1\n"),
    ).toEqual({ href: "/alliance/99005338" });
  });

  it("finds a surrendered war with its sides either way round", () => {
    // Surrender notices name both sides without saying who declared.
    expect(
      target(
        "WarSurrenderOfferMsg",
        "iskValue: 1.0\nownerID1: 98000001\nownerID2: 99005338\n",
      ),
    ).toEqual({
      war: {
        aggressorId: 98000001,
        defenderId: 99005338,
        eitherWay: true,
        at: SENT_AT,
      },
      fallback: { href: "/corporation/98000001" },
    });
    expect(
      target(
        "OfferedSurrender",
        "charID: 1\nentityID: 98000001\nofferedID: 99005338\n",
      ),
    ).toMatchObject({ war: { eitherWay: true, defenderId: 99005338 } });
  });

  it("reads DeclareWar's declarer from entityID", () => {
    expect(
      target(
        "DeclareWar",
        "charID: 2112625428\ndefenderID: 98000001\nentityID: 99005338\n",
      ),
    ).toEqual({
      war: { aggressorId: 99005338, defenderId: 98000001, at: SENT_AT },
      fallback: { href: "/alliance/99005338" },
    });
  });

  it("sends faction warfare to the faction, not into the war rules", () => {
    expect(
      href("FacWarCorpJoinRequestMsg", "corpID: 98000001\nfactionID: 500001\n"),
    ).toBe("/faction/500001");
    expect(href("FWCharRankGainMsg", "factionID: 500003\nnewRank: 4\n")).toBe(
      "/faction/500003",
    );
  });

  it.each([
    ["BountyPlacedChar", "bounty: 5000000.0\nbountyPlacerID: 2112625428\n"],
    ["KillRightAvailable", "charID: 2112625428\nprice: 1000.0\n"],
    [
      "CloneActivationMsg2",
      "cloneStationID: 60003760\npodKillerID: 2112625428\n",
    ],
    ["GiftReceived", "message: hi\nsenderCharID: 2112625428\n"],
  ])("links %s to the character it is about", (type, text) => {
    expect(href(type, text)).toBe("/character/2112625428");
  });

  it("passes over a structure id to a field that has a page", () => {
    // An Upwell structure's id is outside every id range: no page, so the
    // system gets its turn.
    expect(
      href(
        "CloneRevokedMsg2",
        "corpID: 98000001\nstationID: 1035466617946\nsolarSystemID: 30000142\n",
      ),
    ).toBe("/system/30000142");
  });

  it("links a moved clone to its new station", () => {
    expect(
      href(
        "CloneMovedMsg",
        "corpID: 98000001\nnewStationID: 60003760\nstationID: 60008494\n",
      ),
    ).toBe("/station/60003760");
  });

  it("links a war party when the notification does not say who declared", () => {
    expect(
      href("WarSurrenderOfferMsg", "ownerID1: 99005338\nownerID2: 1\n"),
    ).toBeUndefined();
    expect(href("CorpWarSurrenderMsg", "againstID: 98000001\n")).toBe(
      "/corporation/98000001",
    );
  });

  it("opens a biomassed member's character", () => {
    expect(
      href(
        "CharTerminationMsg",
        "charID: 2112625428\ncorpID: 98000001\nroleName: Director\nsecurity: 5.0\n",
      ),
    ).toBe("/character/2112625428");
  });

  it("opens the system a structure is in", () => {
    expect(href("StructureUnderAttack", STRUCTURE_ATTACK)).toBe(
      "/system/30000142",
    );
    expect(href("SovStructureReinforced", "solarSystemID: 30000142\n")).toBe(
      "/system/30000142",
    );
  });

  it("opens a contact notification's sender", () => {
    expect(href("ContactAdd", "level: 10\n", 2112625428)).toBe(
      "/character/2112625428",
    );
  });

  it("leaves a legacy id to be resolved, rather than guessing its kind", () => {
    // Goonswarm Federation: an alliance, numbered among the characters.
    expect(target("CorpAppInvitedMsg", "corpID: 1354830081\n")).toEqual({
      entityId: 1354830081,
    });
    // A war's legacy declarer is the fallback, resolved the same way.
    expect(
      target("WarDeclared", "declaredByID: 1354830081\nagainstID: 98000001\n"),
    ).toMatchObject({ fallback: { entityId: 1354830081 } });
  });

  it("never asks to resolve a place: those ids are unambiguous", () => {
    expect(
      target("StructureUnderAttack", "solarsystemID: 1\n"),
    ).toBeUndefined();
  });

  it("is not a link without a rule, or without the field its rule reads", () => {
    expect(
      href("InsurancePayoutMsg", "amount: 5\nitemID: 1\n"),
    ).toBeUndefined();
    expect(href("KillReportVictim", "victimShipTypeID: 670\n")).toBeUndefined();
    // "Warning" is not a war: faction warfare warnings carry no war parties.
    expect(href("FWCorpWarningMsg", "")).toBeUndefined();
  });
});

describe("categoryHref", () => {
  it.each([
    ["alliance", "/alliance/1354830081"],
    ["corporation", "/corporation/1354830081"],
    ["character", "/character/1354830081"],
    ["solar_system", "/system/1354830081"],
    ["inventory_type", "/type/1354830081"],
  ])("links a %s", (category, path) => {
    expect(categoryHref(category, 1354830081)).toBe(path);
  });

  it("does not link what it does not know, or has not resolved yet", () => {
    expect(categoryHref(undefined, 1)).toBeUndefined();
    expect(categoryHref("stargate", 1)).toBeUndefined();
  });
});

describe("notificationSubject", () => {
  const subject = (type: string, text: string) =>
    notificationSubject(type, parseNotificationFields(text));

  it("names what a notification is about", () => {
    expect(subject("KillReportVictim", KILL_REPORT)).toEqual([{ id: 670 }]);
    expect(subject("CharTerminationMsg", "charID: 2112625428\n")).toEqual([
      { id: 2112625428 },
    ]);
    expect(subject("CorpAppInvitedMsg", CORP_INVITE)).toEqual([
      "Invited to join ",
      { id: 98000001 },
    ]);
    expect(subject("WarDeclared", WAR_DECLARED)).toEqual([
      { id: 99005338 },
      " vs ",
      { id: 98000001 },
    ]);
    expect(subject("StructureUnderAttack", STRUCTURE_ATTACK)).toEqual([
      { id: 35832 },
      " in ",
      { id: 30000142 },
    ]);
  });

  it("shows free text, stripped of markup and entities", () => {
    expect(
      subject(
        "CorpVoteMsg",
        "body: x\nsubject: <b>Raise tax &amp; buy a Keepstar</b>\n",
      ),
    ).toEqual(["Raise tax & buy a Keepstar"]);
    expect(
      subject(
        "CorporationGoalCreated",
        "corporation_id: 1\ngoal_name: Stratios For the Grandmaster\n",
      ),
    ).toEqual(["Stratios For the Grandmaster"]);
  });

  it("names the ally and its enemy, never the ally as a war side", () => {
    expect(
      subject("AcceptedAlly", "allyID: 99005338\nenemyID: 98000001\n"),
    ).toEqual([{ id: 99005338 }, " against ", { id: 98000001 }]);
  });

  it("falls back to the system when a structure's type is missing", () => {
    expect(subject("StructureFuelAlert", "solarsystemID: 30000142\n")).toEqual([
      { id: 30000142 },
    ]);
  });

  it("says nothing rather than half a sentence", () => {
    expect(subject("CorpAppInvitedMsg", "charID: 1\n")).toBeUndefined();
    expect(subject("InsurancePayoutMsg", "amount: 5\n")).toBeUndefined();
  });
});

describe("titleParts", () => {
  it("decodes the HTML entities in CCP's display names", () => {
    expect(
      titleParts("Fuel Depleted &amp; Offline", parseNotificationFields("")),
    ).toEqual(["Fuel Depleted & Offline"]);
  });

  it("fills a placeholder from the notification's fields", () => {
    expect(
      titleParts("Quit {corp_name}", parseNotificationFields(CORP_INVITE)),
    ).toEqual(["Quit ", { id: 98000001 }]);
  });

  it("gives up on a placeholder it cannot fill", () => {
    expect(
      titleParts("Quit {corp_name}", parseNotificationFields("")),
    ).toBeUndefined();
    expect(
      titleParts("Hi {mystery}", parseNotificationFields(CORP_INVITE)),
    ).toBeUndefined();
  });
});

describe("decodeHtmlEntities", () => {
  it("decodes named and numeric entities, and leaves unknown ones", () => {
    expect(
      decodeHtmlEntities("a &lt;b&gt; &#39;c&#x27; &bogus; &#99999999;"),
    ).toBe("a <b> 'c' &bogus; &#99999999;");
  });
});
