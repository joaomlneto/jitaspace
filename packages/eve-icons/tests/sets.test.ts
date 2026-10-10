import { describe, expect, it } from "@jest/globals";

import {
  classify,
  componentName,
  ICON_SETS,
  kebab,
  label,
  pascal,
} from "../scripts/sets";

const id = (path: string) => {
  const match = classify(path);
  return match ? `${match.set.id}/${match.name}` : null;
};

describe("classify", () => {
  it.each([
    ["res:/ui/texture/windowicons/chatchannels.png", "window/chat-channels"],
    [
      "res:/ui/texture/windowicons/auto moon miner.png",
      "window/auto-moon-miner",
    ],
    ["res:/ui/texture/windowicons/lpstore_24px.png", "window/lp-store"],
    ["res:/ui/texture/windowicons/brandnewwindow.png", "window/brandnewwindow"],
    [
      "res:/ui/texture/eveicon/system_icons/arrow_down_16px.png",
      "system/arrow-down",
    ],
    [
      "RES:/UI/Texture/EveIcon/System_Icons/Arrow_Down_16px.png",
      "system/arrow-down",
    ],
    [
      "res:/ui/texture/eveicon/faction_logos/amarr_logo_64px.png",
      "faction/amarr",
    ],
    [
      "res:/ui/texture/eveicon/faction_logos/amarr_logo_w_letters_256px.png",
      "faction/amarr-lettered",
    ],
    [
      "res:/ui/texture/eveicon/faction_logos/amarr_logo_256_w_letters_256px.png",
      "faction/amarr-lettered",
    ],
    [
      "res:/ui/texture/eveicon/killmark_icons/killmarks_jove_2_16px.png",
      "killmark/jove-2",
    ],
    [
      "res:/ui/texture/eveicon/masteries/mastery_level_4_64px.png",
      "mastery/level-4",
    ],
    [
      "res:/ui/texture/eveicon/bracket_icons/skyhook_bracket_16px.png",
      "bracket/skyhook",
    ],
    [
      "res:/ui/texture/crimewatch/crimewatch_suspectcriminal_small.png",
      "crimewatch/suspectcriminal",
    ],
    [
      "res:/ui/texture/crimewatch/crimewatch_limitedengagement_64.png",
      "crimewatch/limitedengagement",
    ],
    [
      "res:/ui/texture/classes/shiptree/groupicons/frigate_64.png",
      "shipclass/frigate",
    ],
    ["res:/ui/texture/classes/shiptree/tech/tech2.png", "shiptech/t2"],
    ["res:/ui/texture/classes/shiptree/tech/navy.png", "shiptech/navy"],
    ["res:/ui/texture/icons/22_32_3.png", "attribute/intelligence"],
    ["res:/ui/texture/icons/7_64_15.png", "misc/unknown"],
    ["res:/ui/texture/plex/plex_20_solid_white.png", "misc/plex"],
  ])("%s → %s", (path, expected) => {
    expect(id(path)).toBe(expected);
  });

  it.each([
    "res:/ui/texture/windowicons/sub/folder.png",
    "res:/ui/texture/eveicon/system_icons/readme.txt",
    "res:/ui/texture/eveicon/types/pattern_64px.png",
    "res:/ui/texture/icons/22_32_6.png",
    "res:/ui/texture/shared/arrowleft.png",
  ])("leaves %s out", (path) => {
    expect(classify(path)).toBeNull();
  });
});

describe("naming helpers", () => {
  it("kebab-cases file stems", () => {
    expect(kebab(" Arrow_Down  now ")).toBe("arrow-down-now");
  });

  it("builds component names", () => {
    expect(pascal("level-4")).toBe("Level4");
    const shipClass = ICON_SETS.find((set) => set.id === "shipclass")!;
    expect(componentName(shipClass, "mining-barge")).toBe(
      "ShipClassMiningBargeIcon",
    );
  });

  it("builds labels", () => {
    expect(label("arrow-down")).toBe("Arrow down");
  });

  it("gives every set a distinct ID and component prefix", () => {
    expect(new Set(ICON_SETS.map((set) => set.id)).size).toBe(ICON_SETS.length);
    expect(new Set(ICON_SETS.map((set) => set.component)).size).toBe(
      ICON_SETS.length,
    );
  });
});
