/**
 * Ready-made comparisons offered while nothing is selected. The type ids were
 * checked against the SDE; names are looked up at render time, so a rename by
 * CCP never leaves a stale label here.
 */
export interface ComparePreset {
  key: string;
  label: string;
  description: string;
  typeIds: number[];
}

export const COMPARE_PRESETS: readonly ComparePreset[] = [
  {
    key: "t1-frigates",
    label: "Tech I frigates",
    description: "The four racial combat frigates new pilots start in.",
    typeIds: [587, 597, 603, 594],
  },
  {
    key: "exploration-frigates",
    label: "Exploration frigates",
    description: "Scanning hulls for relic and data sites.",
    typeIds: [605, 29248, 607, 586, 33468],
  },
  {
    key: "mining-barges",
    label: "Mining barges",
    description: "Yield, ore hold and tank traded against each other.",
    typeIds: [17480, 17478, 17476],
  },
  {
    key: "exhumers",
    label: "Exhumers",
    description: "The Tech II upgrades of the mining barges.",
    typeIds: [22546, 22548, 22544],
  },
  {
    key: "t3-cruisers",
    label: "Tech III cruisers",
    description: "Base hulls of the four strategic cruisers.",
    typeIds: [29984, 29986, 29990, 29988],
  },
  {
    key: "pirate-battleships",
    label: "Pirate battleships",
    description: "Faction hulls from the pirate factions.",
    typeIds: [17738, 17736, 17740, 17918, 17920],
  },
  {
    key: "5mn-microwarpdrives",
    label: "5MN microwarpdrives",
    description: "Tech II, faction and meta variants side by side.",
    typeIds: [440, 15747, 35658],
  },
  {
    key: "light-drones",
    label: "Light combat drones",
    description: "One per damage type.",
    typeIds: [2456, 2488, 2466, 2205],
  },
];
