import { describe, expect, it } from "@jest/globals";

import {
  dungeonDisplayName,
  formatMinutes,
  MISSION_MESSAGE_SLOTS,
  missionKind,
  missionMessageRank,
  missionMessageSlot,
  missionVariableLabel,
  renderMissionText,
} from "~/lib/missions";

const noObjective = {
  killDungeonId: null,
  killObjectiveTypeId: null,
  killObjectiveQuantity: null,
  killDropItemInMissionContainerTypeId: null,
  courierObjectiveTypeId: null,
  courierObjectiveQuantity: null,
};

describe("missionKind", () => {
  it("calls a mission with a dungeon an encounter", () => {
    expect(missionKind({ ...noObjective, killDungeonId: 213 })).toBe("kill");
  });

  it("calls a kill block holding only a quantity an encounter", () => {
    // Mission 16414 "Waste Not": `killMission: { objectiveQuantity: 0 }`.
    expect(missionKind({ ...noObjective, killObjectiveQuantity: 0 })).toBe(
      "kill",
    );
  });

  it("calls a mission with a courier block a courier mission", () => {
    expect(
      missionKind({
        ...noObjective,
        courierObjectiveTypeId: 34,
        courierObjectiveQuantity: 100,
      }),
    ).toBe("courier");
  });

  it("calls a mission with neither block other", () => {
    expect(missionKind(noObjective)).toBe("other");
  });
});

describe("formatMinutes", () => {
  it.each([
    [10080, "7 days"],
    [1440, "1 day"],
    [720, "12 hours"],
    [90, "1 hour 30 minutes"],
    [1, "1 minute"],
    // Two largest units only.
    [1501, "1 day 1 hour"],
    [129600, "90 days"],
    [0, "0 minutes"],
  ])("formats %d minutes as %s", (minutes, expected) => {
    expect(formatMinutes(minutes)).toBe(expected);
  });
});

describe("dungeonDisplayName", () => {
  it("uses the dungeons.yaml name when there is one", () => {
    expect(dungeonDisplayName({ dungeonId: 43, name: "Guristas Den" })).toBe(
      "Guristas Den",
    );
  });

  it("falls back to the id for a dungeon dungeons.yaml does not describe", () => {
    expect(dungeonDisplayName({ dungeonId: 213, name: null })).toBe(
      "Dungeon 213",
    );
  });
});

describe("mission message slots", () => {
  it("has one slot per key", () => {
    const keys = MISSION_MESSAGE_SLOTS.map((slot) => slot.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("orders the briefing before the dialogue, and the offer before the outcome", () => {
    const order = [
      "messages.mission.briefing",
      "messages.mission.offered.agentsays",
      "messages.mission.accept.charsays",
      "messages.mission.completed.agentsays",
      "messages.mission.offerexpired.email.body",
    ].map(missionMessageRank);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("knows who says each dialogue line", () => {
    expect(missionMessageSlot("messages.mission.ask.charsays").speaker).toBe(
      "pilot",
    );
    expect(
      missionMessageSlot("messages.mission.offered.agentsays").speaker,
    ).toBe("agent");
  });

  it("keeps a key it does not know, last, labelled by its id", () => {
    const slot = missionMessageSlot("messages.mission.newthing.agentsays");
    expect(slot).toMatchObject({
      label: "mission.newthing.agentsays",
      section: "dialogue",
    });
    expect(missionMessageRank(slot.key)).toBe(MISSION_MESSAGE_SLOTS.length);
  });
});

describe("renderMissionText", () => {
  it("turns newlines into line breaks", () => {
    expect(renderMissionText("one\ntwo\r\nthree")).toBe("one<br>two<br>three");
  });

  it("labels a placeholder the SDE cannot fill", () => {
    expect(
      renderMissionText("They are in {[location]dungeonLocationID.name}."),
    ).toBe("They are in <i>[Mission Location]</i>.");
  });

  it("fills a placeholder it has a value for", () => {
    expect(
      renderMissionText("Bring me {[item]objectiveTypeID.name}.", {
        objectiveTypeID: "Tritanium",
      }),
    ).toBe("Bring me <b>Tritanium</b>.");
  });

  it("puts the quantity in front of a quantityName", () => {
    expect(
      renderMissionText(
        "Haul {[item]objectiveTypeID.quantityName, quantity=objectiveQuantity}.",
        { objectiveTypeID: "Tritanium", objectiveQuantity: 12000 },
      ),
    ).toBe("Haul <b>12,000 x Tritanium</b>.");
  });

  it("adds the article for nameWithArticle", () => {
    expect(
      renderMissionText(
        "For {[npcOrganization]agentFactionID.nameWithArticle}!",
        { agentFactionID: "Caldari State" },
      ),
    ).toBe("For <b>the Caldari State</b>!");
  });

  it("formats a numeric placeholder", () => {
    expect(
      renderMissionText("{[numeric]rewardQuantity} ISK", {
        rewardQuantity: 250000,
      }),
    ).toBe("<b>250,000</b> ISK");
  });

  it("escapes a filled-in value", () => {
    expect(
      renderMissionText("{[character]player.name}", { player: "<b>x</b>" }),
    ).toBe("<b>&lt;b&gt;x&lt;/b&gt;</b>");
  });

  it("leaves EVE markup and other braces alone", () => {
    expect(renderMissionText("<b>Hi</b> {not a placeholder}")).toBe(
      "<b>Hi</b> {not a placeholder}",
    );
  });
});

describe("missionVariableLabel", () => {
  it("humanizes a variable it has no label for", () => {
    expect(missionVariableLabel("agentStationID")).toBe("Agent's Station");
    expect(missionVariableLabel("someNewThingID")).toBe("Some New Thing");
  });
});
