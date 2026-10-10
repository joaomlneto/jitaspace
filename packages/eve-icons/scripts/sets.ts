/**
 * Which EVE client files become icons, and what each one is called.
 *
 * Every icon has one ID, `<set>/<name>`, derived mechanically from the file it
 * comes from: size suffixes (`_16px`, `_64`, `_small`) are dropped — one ID
 * covers every size the client ships — along with words the set already says
 * (`_logo`, `killmarks_`, `mastery_`…). CCP's own spellings, typos included,
 * are kept so an ID can always be traced back to its file. The one exception
 * is the window icons, whose filenames run words together (`chatchannels`),
 * so they are named from {@link WINDOW_NAMES}.
 *
 * Read by `scripts/sync.ts` (which fetches the files) and `scripts/generate.ts`
 * (which names the components).
 */

export interface IconSet {
  /** First segment of every icon ID in the set, e.g. `system`. */
  id: string;
  /** Prefix of every component name in the set, e.g. `System`. */
  component: string;
  label: string;
  description: string;
  /** Lower-case `res:/` folder the set's files live in, with trailing slash. */
  folder: string;
  /**
   * Maps a file path relative to {@link folder} (lower-case, extension
   * included) to an icon name, or `null` when the file is not part of the set.
   */
  name: (file: string) => string | null;
}

/** `foo_bar baz` → `foo-bar-baz`. */
export function kebab(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
}

/** Drop the extension, refusing anything that is not a top-level PNG. */
function pngStem(file: string): string | null {
  if (file.includes("/") || !file.endsWith(".png")) return null;
  return file.slice(0, -".png".length);
}

/** Drop a trailing pixel-size suffix such as `_16px`. */
function stripPx(stem: string): string {
  return stem.replace(/_\d+px$/, "");
}

/** A set whose files are named `<name>_<size>px.png`, plus optional rewrites. */
function sized(rewrite: (stem: string) => string = (stem) => stem) {
  return (file: string) => {
    const stem = pngStem(file);
    return stem === null ? null : kebab(rewrite(stripPx(stem)));
  };
}

/** A set made of a fixed list of files. */
function listed(names: Record<string, string>) {
  return (file: string) => names[file] ?? null;
}

/**
 * Names for `res:/ui/texture/windowicons/`, keyed by file stem. The stems run
 * words together, so each gets a hand-split name. A file missing from this
 * table still becomes an icon (under its kebab-cased stem); `sync` reports it
 * so a name can be added here.
 */
export const WINDOW_NAMES: Record<string, string> = {
  abyssalfilament: "abyssal-filament",
  accessgroups: "access-groups",
  achievements: "achievements",
  agent: "agent",
  agentfinder: "agent-finder",
  aggression: "aggression",
  aircareerprogram: "air-career-program",
  alliances: "alliances",
  assets: "assets",
  assetscorp: "corporation-assets",
  attention: "attention",
  attributes: "attributes",
  augmentations: "augmentations",
  "auto moon miner": "auto-moon-miner",
  basicservices: "basic-services",
  biography: "biography",
  bleedchannel: "bleed-channel",
  bountyoffice: "bounty-office",
  browser: "browser",
  browserbookmarks: "browser-bookmarks",
  calculator: "calculator",
  calendar: "calendar",
  capitalnavigation: "capital-navigation",
  cargo: "cargo",
  cargocontainer: "cargo-container",
  cargocontainerlocked: "cargo-container-locked",
  cargoscan: "cargo-scan",
  certificates: "certificates",
  channeloperator: "channel-operator",
  charactersheet: "character-sheet",
  charcustomization: "character-customization",
  chatchannel: "chat-channel",
  chatchannels: "chat-channels",
  clonebay: "clone-bay",
  color_picker: "color-picker",
  combatlog: "combat-log",
  commandcenterhold: "command-center-hold",
  comparetool: "compare-tool",
  compression: "compression",
  concord: "concord",
  contacts: "contacts",
  container: "container",
  contractauction: "contract-auction",
  contractcourier: "contract-courier",
  contractitemexchange: "contract-item-exchange",
  contracts: "contracts",
  corpdeliveries: "corporation-deliveries",
  corphangar: "corporation-hangar",
  corpmap: "corporation-map",
  corporation: "corporation",
  corporationdecorations: "corporation-decorations",
  corporationlocations: "corporation-locations",
  corporationmembers: "corporation-members",
  corporationstandings: "corporation-standings",
  criminal: "criminal",
  criticalstate: "critical-state",
  decompression: "decompression",
  decorations: "decorations",
  directoryactivities: "directory-activities",
  directoryindustry: "directory-industry",
  directoryinventory: "directory-inventory",
  directorymarket: "directory-market",
  directoryparagonservices: "directory-paragon-services",
  directorypersonal: "directory-personal",
  directoryservices: "directory-services",
  directoryship: "directory-ship",
  directorysocial: "directory-social",
  directoryutilities: "directory-utilities",
  docking: "docking",
  dogtags: "dog-tags",
  dronebay: "drone-bay",
  drones: "drones",
  employmenthistory: "employment-history",
  ess: "ess",
  evemail: "evemail",
  evemailcompose: "evemail-compose",
  evemailtag: "evemail-tag",
  event_icon: "event",
  evermark_24px: "evermark",
  evermark_64px: "evermark",
  factionalwarfare: "factional-warfare",
  fitting: "fitting",
  fittingmanagement: "fitting-management",
  fleet: "fleet",
  folder: "folder",
  folder_cargo: "cargo-folder",
  forward: "forward",
  fuelbay: "fuel-bay",
  gashold: "gas-hold",
  gift: "gift",
  goaldeliveries: "goal-deliveries",
  grouplist: "group-list",
  help: "help",
  hidestatus: "hide-status",
  hidewindows: "hide-windows",
  hypernet: "hypernet",
  icehold: "ice-hold",
  incursions: "incursions",
  industry: "industry",
  info: "info",
  insider: "insider",
  insurance: "insurance",
  insurgencies: "insurgencies",
  isis: "isis",
  itemhangar: "item-hangar",
  items: "items",
  journal: "journal",
  jukebox: "jukebox",
  jumpclones: "jump-clones",
  killreport: "kill-report",
  killrights: "kill-rights",
  limitedengagement: "limited-engagement",
  locations: "locations",
  lockedcontainer: "locked-container",
  log: "log",
  logout: "logout",
  loudspeaker_icon: "loudspeaker",
  loudspeaker_icon32: "loudspeaker",
  loudspeaker_icon58: "loudspeaker",
  lpstore: "lp-store",
  lpstore_24px: "lp-store",
  map: "map",
  market: "market",
  marketdeliveries: "market-deliveries",
  marketorders: "market-orders",
  medical: "medical",
  member: "member",
  memberdelay: "member-delay",
  mercenary: "mercenary",
  mercenaryadd: "mercenary-add",
  mercenaryally: "mercenary-ally",
  mercenaryattention: "mercenary-attention",
  mineralhold: "mineral-hold",
  miningledger: "mining-ledger",
  mischold: "misc-hold",
  moon_material_bay: "moon-material-bay",
  moondrill: "moon-drill",
  moondrillscheduler: "moon-drill-scheduler",
  mutation: "mutation",
  mutualwars: "mutual-wars",
  navigation: "navigation",
  nes: "nes",
  newspost: "news-post",
  note: "note",
  notegroup: "note-group",
  notepad: "notepad",
  offices: "offices",
  opportunities: "opportunities",
  opportunitiestree: "opportunities-tree",
  orehold: "ore-hold",
  other: "other",
  overview: "overview",
  paint_tool: "paint-tool",
  peopleandplaces: "people-and-places",
  personaldeliveries: "personal-deliveries",
  personalization: "personalization",
  personallocations: "personal-locations",
  personalstandings: "personal-standings",
  planetarycommodities: "planetary-commodities",
  planets: "planets",
  politics: "politics",
  projectdiscovery: "project-discovery",
  provinggrounds: "proving-grounds",
  question: "question",
  quitgame: "quit-game",
  reactions: "reactions",
  recruitment: "recruitment",
  redeem: "redeem",
  redeemingqueue: "redeeming-queue",
  repairshop: "repair-shop",
  reply: "reply",
  replyall: "reply-all",
  reprocess: "reprocess",
  reprocessing: "reprocessing",
  research: "research",
  restriction: "restriction",
  salvagehold: "salvage-hold",
  sanctionableactions: "sanctionable-actions",
  satellite: "satellite",
  scopenetwork: "scope-network",
  searchmarket: "search-market",
  securitystatus: "security-status",
  settings: "settings",
  shiphangar: "ship-hangar",
  ships: "ships",
  shipscan: "ship-scan",
  skills: "skills",
  skins: "skins",
  skyhook: "skyhook",
  skyhook_reagent: "skyhook-reagent",
  smallfolder: "small-folder",
  sovereignty: "sovereignty",
  "sovereignty hub": "sovereignty-hub",
  standings: "standings",
  station: "station",
  stationcontainer: "station-container",
  stationcontainerlocked: "station-container-locked",
  stop: "stop",
  structurebrowser: "structure-browser",
  subsystems: "subsystems",
  surrender: "surrender",
  surrenderattention: "surrender-attention",
  systems: "systems",
  terminate: "terminate",
  theagency: "agency",
  tipoftheday: "tip-of-the-day",
  trainingqueue: "training-queue",
  triglavianrace: "triglavian-race",
  triglavians: "triglavians",
  tutorial: "tutorial",
  uihelper: "ui-helper",
  upsell: "upsell",
  votes: "votes",
  wallet: "wallet",
  warning: "warning",
  warreport: "war-report",
  wars: "wars",
};

export const ICON_SETS: readonly IconSet[] = [
  {
    id: "window",
    component: "Window",
    label: "Window icons",
    description:
      "The Neocom and window-header icons, one per in-game window or service.",
    folder: "res:/ui/texture/windowicons/",
    name: (file) => {
      const stem = pngStem(file);
      return stem === null ? null : (WINDOW_NAMES[stem] ?? kebab(stem));
    },
  },
  {
    id: "system",
    component: "System",
    label: "System icons",
    description:
      "16px glyphs for UI controls: arrows, carets, add, bell, sort, and so on.",
    folder: "res:/ui/texture/eveicon/system_icons/",
    name: sized(),
  },
  {
    id: "control",
    component: "Control",
    label: "Control icons",
    description:
      "Ship and fleet commands: approach, align to, fleet broadcasts, camera and probe formations.",
    folder: "res:/ui/texture/eveicon/control_icons/",
    name: sized(),
  },
  {
    id: "category",
    component: "Category",
    label: "Category icons",
    description:
      "Activity and content categories used by the Agency, opportunities and goals.",
    folder: "res:/ui/texture/eveicon/category_icons/",
    name: sized(),
  },
  {
    id: "faction",
    component: "Faction",
    label: "Faction logos",
    description:
      "Empire, pirate and NPC faction emblems, plus 256px variants with the faction's name lettered underneath.",
    folder: "res:/ui/texture/eveicon/faction_logos/",
    name: sized((stem) =>
      stem
        .replace(/_256_w_letters$/, "_w_letters")
        .replace(/_logo_w_letters$/, "_lettered")
        .replace(/_logo$/, ""),
    ),
  },
  {
    id: "killmark",
    component: "Killmark",
    label: "Killmarks",
    description: "Killmark tallies by faction, three tiers each.",
    folder: "res:/ui/texture/eveicon/killmark_icons/",
    name: sized((stem) => stem.replace(/^killmarks_/, "")),
  },
  {
    id: "mastery",
    component: "Mastery",
    label: "Masteries",
    description: "Ship mastery level badges 0–5, locked and Omega-locked.",
    folder: "res:/ui/texture/eveicon/masteries/",
    name: sized((stem) => stem.replace(/^mastery_/, "")),
  },
  {
    id: "career",
    component: "Career",
    label: "Career paths",
    description: "The AIR career-program paths.",
    folder: "res:/ui/texture/eveicon/career_icons/",
    name: sized(),
  },
  {
    id: "service",
    component: "Service",
    label: "Account services",
    description: "Alpha and Omega clone states, and auras.",
    folder: "res:/ui/texture/eveicon/service_icons/",
    name: sized(),
  },
  {
    id: "bracket",
    component: "Bracket",
    label: "Brackets",
    description:
      "In-space bracket glyphs for newer structures: skyhooks, sovereignty hubs, shipcasters.",
    folder: "res:/ui/texture/eveicon/bracket_icons/",
    name: sized((stem) => stem.replace(/_bracket$/, "")),
  },
  {
    id: "settings",
    component: "Settings",
    label: "Settings",
    description: "Settings window section icons.",
    folder: "res:/ui/texture/eveicon/settings_icons/",
    name: sized(),
  },
  {
    id: "product",
    component: "Product",
    label: "Product icons",
    description:
      "64px feature icons: probe scanner, directional scanner, projects.",
    folder: "res:/ui/texture/eveicon/product_icons/",
    name: sized(),
  },
  {
    id: "theatre",
    component: "Theatre",
    label: "Theatres of war",
    description: "Empire and pirate insurgency emblems.",
    folder: "res:/ui/texture/eveicon/theatres_of_war/",
    name: sized(),
  },
  {
    id: "crimewatch",
    component: "Crimewatch",
    label: "Crimewatch",
    description:
      "Timers and legal states: suspect, criminal, weapons timer, jump fatigue.",
    folder: "res:/ui/texture/crimewatch/",
    name: (file) => {
      const stem = pngStem(file);
      return stem === null
        ? null
        : kebab(stem.replace(/^crimewatch_/, "").replace(/_(small|64)$/, ""));
    },
  },
  {
    id: "race",
    component: "Race",
    label: "Races",
    description: "The four empire race emblems.",
    folder: "res:/ui/texture/race/",
    name: sized(),
  },
  {
    id: "shipclass",
    component: "ShipClass",
    label: "Ship classes",
    description: "Hull-class glyphs from the ship tree, frigate to titan.",
    folder: "res:/ui/texture/classes/shiptree/groupicons/",
    name: sized((stem) => stem.replace(/_64$/, "")),
  },
  {
    id: "shiprole",
    component: "ShipRole",
    label: "Ship roles",
    description:
      "Ship-tree role and bonus glyphs: armor, tackling, ECM and so on.",
    folder: "res:/ui/texture/classes/shiptree/attributes/",
    name: sized(),
  },
  {
    id: "shiptech",
    component: "ShipTech",
    label: "Ship tech levels",
    description: "Navy, Tech II and Tech III badges from the ship tree.",
    folder: "res:/ui/texture/classes/shiptree/tech/",
    name: sized((stem) => ({ tech2: "t2", tech3: "t3" })[stem] ?? stem),
  },
  {
    id: "attribute",
    component: "Attribute",
    label: "Character attributes",
    description: "The five character attributes.",
    folder: "res:/ui/texture/icons/",
    name: listed({
      "22_32_1.png": "charisma",
      "22_32_2.png": "willpower",
      "22_32_3.png": "intelligence",
      "22_32_4.png": "memory",
      "22_32_5.png": "perception",
    }),
  },
  {
    id: "misc",
    component: "Misc",
    label: "Miscellaneous",
    description:
      "Individual icons from elsewhere in the client: PLEX, the unknown-item placeholder, the CCP logo.",
    folder: "res:/ui/texture/",
    name: listed({
      "icons/7_64_15.png": "unknown",
      "icons/notifications/notificationicon_170.png": "ccp-games",
      "plex/plex_12_solid_white.png": "plex",
      "plex/plex_20_solid_white.png": "plex",
      "plex/plex_32_solid_white.png": "plex",
      "plex/plex_24_solid_yellow.png": "plex-yellow",
      "plex/plex_32_solid_yellow.png": "plex-yellow",
      "plex/plex_32_gradient_yellow.png": "plex-gradient-yellow",
      "plex/plex_128_gradient_yellow.png": "plex-gradient-yellow",
      "plex/plex_128_gradient_white.png": "plex-gradient-white",
    }),
  },
];

/**
 * The package's component names from before it was generated, kept as aliases
 * so existing imports keep working. Each maps to the icon that replaced it.
 */
export const LEGACY_NAMES: Record<string, string> = {
  AccessGroupsIcon: "window/access-groups",
  AchievementsIcon: "window/achievements",
  ActivityTrackerIcon: "window/directory-activities",
  AgencyIcon: "window/agency",
  AgentFinderIcon: "window/agent-finder",
  AgentIcon: "window/agent",
  AggressionIcon: "window/aggression",
  AlliancesIcon: "window/alliances",
  AssetsIcon: "window/assets",
  AttentionIcon: "window/attention",
  AttributesIcon: "window/attributes",
  AugmentationsIcon: "window/augmentations",
  BiographyIcon: "window/biography",
  BleedChannelIcon: "window/bleed-channel",
  BountyOfficeIcon: "window/bounty-office",
  BrowserBookmarksIcon: "window/browser-bookmarks",
  BrowserIcon: "window/browser",
  CCPGamesIcon: "misc/ccp-games",
  CalculatorIcon: "window/calculator",
  CalendarIcon: "window/calendar",
  CapitalNavigationIcon: "window/capital-navigation",
  CargoContainerIcon: "window/cargo-container",
  CargoContainerLockedIcon: "window/cargo-container-locked",
  CargoFolderIcon: "window/cargo-folder",
  CargoIcon: "window/cargo",
  CargoScanIcon: "window/cargo-scan",
  CertificatesIcon: "window/certificates",
  ChannelOperatorIcon: "window/channel-operator",
  CharacterCustomizationIcon: "window/character-customization",
  CharacterSheetIcon: "window/character-sheet",
  CharismaAttributeSmallIcon: "attribute/charisma",
  ChatChannelIcon: "window/chat-channel",
  ChatChannelsIcon: "window/chat-channels",
  CloneBayIcon: "window/clone-bay",
  CombatLogIcon: "window/combat-log",
  CommandCenterHoldIcon: "window/command-center-hold",
  CompareToolIcon: "window/compare-tool",
  ConcordIcon: "window/concord",
  ContactsIcon: "window/contacts",
  ContainerIcon: "window/container",
  ContractAuctionIcon: "window/contract-auction",
  ContractCourierIcon: "window/contract-courier",
  ContractItemExchangeIcon: "window/contract-item-exchange",
  ContractsIcon: "window/contracts",
  CorporationAssetsIcon: "window/corporation-assets",
  CorporationDecorationsIcon: "window/corporation-decorations",
  CorporationDeliveriesIcon: "window/corporation-deliveries",
  CorporationHangarIcon: "window/corporation-hangar",
  CorporationIcon: "window/corporation",
  CorporationLocationsIcon: "window/corporation-locations",
  CorporationMapIcon: "window/corporation-map",
  CorporationMembersIcon: "window/corporation-members",
  CorporationStandingsIcon: "window/corporation-standings",
  CriminalIcon: "window/criminal",
  CriticalStateIcon: "window/critical-state",
  DecorationsIcon: "window/decorations",
  DockingIcon: "window/docking",
  DogTagsIcon: "window/dog-tags",
  DroneBayIcon: "window/drone-bay",
  DronesIcon: "window/drones",
  EmploymentHistoryIcon: "window/employment-history",
  EveMailIcon: "window/evemail",
  EveMailTagIcon: "window/evemail-tag",
  EvemailComposeIcon: "window/evemail-compose",
  FactionalWarfareIcon: "window/factional-warfare",
  FittingIcon: "window/fitting",
  FittingManagementIcon: "window/fitting-management",
  FleetIcon: "window/fleet",
  FolderIcon: "window/folder",
  ForwardIcon: "window/forward",
  FuelBayIcon: "window/fuel-bay",
  GasHoldIcon: "window/gas-hold",
  GroupListIcon: "window/group-list",
  GunneryIcon: "category/gunnery",
  HelpIcon: "window/help",
  HideStatusIcon: "window/hide-status",
  HideWindowsIcon: "window/hide-windows",
  IncursionsIcon: "window/incursions",
  IndustryIcon: "window/industry",
  InfoIcon: "window/info",
  InsiderIcon: "window/insider",
  InsuranceIcon: "window/insurance",
  IntelligenceAttributeSmallIcon: "attribute/intelligence",
  IsisIcon: "window/isis",
  ItemHangarIcon: "window/item-hangar",
  ItemsIcon: "window/items",
  JournalIcon: "window/journal",
  JukeboxIcon: "window/jukebox",
  JumpClonesIcon: "window/jump-clones",
  KillReportIcon: "window/kill-report",
  KillRightsIcon: "window/kill-rights",
  LPStoreIcon: "window/lp-store",
  LimitedEngagementIcon: "window/limited-engagement",
  LockedContainerIcon: "window/locked-container",
  LogIcon: "window/log",
  MapIcon: "window/map",
  MarketDeliveriesIcon: "window/market-deliveries",
  MarketIcon: "window/market",
  MedicalIcon: "window/medical",
  MemberDelayIcon: "window/member-delay",
  MemberIcon: "window/member",
  MemoryAttributeSmallIcon: "attribute/memory",
  MercenaryAddIcon: "window/mercenary-add",
  MercenaryAllyIcon: "window/mercenary-ally",
  MercenaryAttentionIcon: "window/mercenary-attention",
  MercenaryIcon: "window/mercenary",
  MineralHoldIcon: "window/mineral-hold",
  MiningLedgerIcon: "window/mining-ledger",
  MiscHoldIcon: "window/misc-hold",
  MoonDrillIcon: "window/moon-drill",
  MoonDrillSchedulerIcon: "window/moon-drill-scheduler",
  MutualWarsIcon: "window/mutual-wars",
  NesIcon: "window/nes",
  NewsPostIcon: "window/news-post",
  NoteGroupIcon: "window/note-group",
  NoteIcon: "window/note",
  NotepadIcon: "window/notepad",
  OfficesIcon: "window/offices",
  OpportunitiesTreeIcon: "window/opportunities-tree",
  OreHoldIcon: "window/ore-hold",
  OtherIcon: "window/other",
  PeopleAndPlacesIcon: "window/people-and-places",
  PerceptionAttributeSmallIcon: "attribute/perception",
  PersonalDeliveriesIcon: "window/personal-deliveries",
  PersonalLocationsIcon: "window/personal-locations",
  PersonalStandingsIcon: "window/personal-standings",
  PilotLicenseIcon: "misc/plex",
  PlanetaryCommoditiesIcon: "window/planetary-commodities",
  PlanetsIcon: "window/planets",
  PoliticsIcon: "window/politics",
  ProjectDiscoveryIcon: "window/project-discovery",
  QuestionIcon: "window/question",
  ReactionsIcon: "window/reactions",
  RecruitmentIcon: "window/recruitment",
  RedeemIcon: "window/redeem",
  RepairShopIcon: "window/repair-shop",
  ReplyAllIcon: "window/reply-all",
  ReplyIcon: "window/reply",
  ReprocessIcon: "window/reprocess",
  ReprocessingIcon: "window/reprocessing",
  ResearchIcon: "window/research",
  RestrictionIcon: "window/restriction",
  SalvageHoldIcon: "window/salvage-hold",
  SanctionableActionsIcon: "window/sanctionable-actions",
  SatelliteIcon: "window/satellite",
  ScopeNetworkIcon: "window/scope-network",
  SearchMarketIcon: "window/search-market",
  SecurityStatusIcon: "window/security-status",
  SettingsIcon: "window/settings",
  ShipHangarIcon: "window/ship-hangar",
  ShipScanIcon: "window/ship-scan",
  ShipsIcon: "window/ships",
  SkillsIcon: "window/skills",
  SkinsIcon: "window/skins",
  SmallFolderIcon: "window/small-folder",
  SovereigntyIcon: "window/sovereignty",
  StationContainerIcon: "window/station-container",
  StationContainerLockedIcon: "window/station-container-locked",
  StationIcon: "window/station",
  StopIcon: "window/stop",
  StructureBrowserIcon: "window/structure-browser",
  SubSystemsIcon: "window/subsystems",
  SurrenderAttentionIcon: "window/surrender-attention",
  SurrenderIcon: "window/surrender",
  Systems2Icon: "system/constellation",
  SystemsIcon: "window/systems",
  TerminateIcon: "window/terminate",
  TipOfTheDayIcon: "window/tip-of-the-day",
  TrainingQueueIcon: "window/training-queue",
  TutorialIcon: "window/tutorial",
  UnknownIcon: "misc/unknown",
  VotesIcon: "window/votes",
  WalletIcon: "window/wallet",
  WarReportIcon: "window/war-report",
  WarningIcon: "window/warning",
  WarsIcon: "window/wars",
  WillpowerAttributeSmallIcon: "attribute/willpower",
};

/** `level-4` → `Level4`. */
export function pascal(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

/** `arrow-down` → `Arrow down`. */
export function label(name: string): string {
  const words = name.replaceAll("-", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Component name for an icon: `system` + `arrow-down` → `SystemArrowDownIcon`. */
export function componentName(set: IconSet, name: string): string {
  return `${set.component}${pascal(name)}Icon`;
}

/**
 * Find the set and icon name for a `res:/` path, or `null` when no set claims
 * it. Paths are compared case-insensitively, as the client does.
 */
export function classify(path: string): { set: IconSet; name: string } | null {
  const lower = path.toLowerCase();
  for (const set of ICON_SETS) {
    if (!lower.startsWith(set.folder)) continue;
    const name = set.name(lower.slice(set.folder.length));
    if (name) return { set, name };
  }
  return null;
}
