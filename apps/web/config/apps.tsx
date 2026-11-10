import React from "react";
import { IconBrandDiscordFilled } from "@tabler/icons-react";

import type { ESIScope } from "@jitaspace/esi-metadata";
import type { EveIconProps } from "@jitaspace/eve-icons";
import {
  AccessGroupsIcon,
  AgencyIcon,
  AgentFinderIcon,
  AlliancesIcon,
  AssetsIcon,
  AttributesIcon,
  CalendarIcon,
  CharacterSheetIcon,
  ContactsIcon,
  ContractsIcon,
  EveMailIcon,
  FactionalWarfareIcon,
  FittingIcon,
  HelpIcon,
  IncursionsIcon,
  InfoIcon,
  ItemsIcon,
  JournalIcon,
  LPStoreIcon,
  MapIcon,
  MarketIcon,
  PlanetsIcon,
  ScopeNetworkIcon,
  ShipsIcon,
  SkillsIcon,
  SystemFreelanceProjectsIcon,
  VotesIcon,
  WalletIcon,
  WarReportIcon,
  WarsIcon,
  WindowGiftIcon,
  WindowMercenaryIcon,
} from "@jitaspace/eve-icons";

import { env } from "~/env";

/**
 * Everything "Your freelance jobs" can use. Corporation jobs are gated on the
 * Project_Manager role, which is only known once the roles scope is granted.
 */
export const FREELANCE_SCOPES: ESIScope[] = [
  "esi-characters.read_freelance_jobs.v1",
  "esi-corporations.read_freelance_jobs.v1",
  "esi-characters.read_corporation_roles.v1",
];

const FreelanceIcon = (props: EveIconProps) => (
  <SystemFreelanceProjectsIcon color="currentColor" {...props} />
);

export interface AppScopeSet {
  reason: string;
  description?: string;
  scopes: ESIScope[];
}

export interface JitaApp {
  name: string;
  description: string;
  url?: string;
  /**
   * The app's page for one corporation or alliance, for the menus that list a
   * single entity's apps. Falls back to `url`.
   */
  subjectUrl?: (subjectId: number) => string;
  onClick?: () => void;
  Icon: (props: EveIconProps) => React.ReactElement;
  hotKey?: string[];
  scopes: {
    required?: AppScopeSet[];
    optional?: AppScopeSet[];
  };
}

export const characterApps: Record<string, JitaApp> = {
  mail: {
    name: "EveMail",
    description: "Access your correspondence whilst out of the game.",
    url: "/mail",
    Icon: (props) => <EveMailIcon {...props} />,
    scopes: {
      required: [
        {
          reason: "Read Mail",
          description: "Read EveMail",
          scopes: ["esi-mail.read_mail.v1"],
        },
      ],
      optional: [
        {
          reason: "Organize Mail",
          description:
            "Organize labels, assign labels to messages, delete messages.",
          scopes: ["esi-mail.organize_mail.v1"],
        },
        {
          reason: "Send Mail",
          description: "Send EVEMails, lookup recipients to send messages to.",
          scopes: ["esi-mail.send_mail.v1", "esi-search.search_structures.v1"],
        },
        {
          reason: "Link structures",
          description:
            "Link player-owned structures you can see in the mails you write.",
          scopes: ["esi-universe.read_structures.v1"],
        },
        {
          reason: "Lookup recipient in contacts",
          description: "Lookup recipient in contacts when sending email.",
          scopes: ["esi-characters.read_contacts.v1"],
        },
        {
          reason: "Compose EveMail in-game",
          description: "Allows you to continue composing your EveMail in-game.",
          scopes: ["esi-ui.open_window.v1"],
        },
      ],
    },
  },
  calendar: {
    name: "Calendar",
    description: "View upcoming events and meetings on your calendar.",
    url: "/calendar",
    Icon: (props) => React.createElement(CalendarIcon, props),
    scopes: {
      required: [
        {
          reason: "Read Calendar Events",
          description: "Allows you to read calendar events.",
          scopes: ["esi-calendar.read_calendar_events.v1"],
        },
      ],
      optional: [
        {
          reason: "Respond to Calendar Events",
          description: "Allows you to respond to events on your calendar.",
          scopes: ["esi-calendar.respond_calendar_events.v1"],
        },
      ],
    },
  },
  contacts: {
    name: "Contacts",
    description: "View your character, corporation and alliance contacts.",
    url: "/contacts",
    Icon: (props: EveIconProps) => React.createElement(ContactsIcon, props),
    scopes: {
      optional: [
        {
          reason: "Read Character Contacts",
          scopes: ["esi-characters.read_contacts.v1"],
        },
        {
          reason: "Read Corporation Contacts",
          scopes: ["esi-corporations.read_contacts.v1"],
        },
        {
          reason: "Read Alliance Contacts",
          scopes: ["esi-alliances.read_contacts.v1"],
        },
        {
          reason: "Update Character Contacts",
          scopes: ["esi-characters.write_contacts.v1"],
        },
      ],
    },
  },
  fittings: {
    name: "Fittings",
    description: "View and manage your character's ship fittings.",
    url: "/fittings",
    Icon: (props: EveIconProps) => React.createElement(FittingIcon, props),
    scopes: {
      required: [
        {
          reason: "Read Character Fittings",
          scopes: ["esi-fittings.read_fittings.v1"],
        },
      ],
      optional: [
        {
          reason: "Update Character Fittings",
          scopes: ["esi-fittings.write_fittings.v1"],
        },
      ],
    },
  },
  accessLists: {
    name: "Access Lists",
    description:
      "Browse the access lists your characters manage, and who each one allows or blocks.",
    url: "/access-lists",
    Icon: (props) => React.createElement(AccessGroupsIcon, props),
    scopes: {
      required: [
        {
          reason: "Read Access Lists",
          description:
            "Read the access lists your characters are a Manager or Admin of, with their members.",
          scopes: ["esi-access.read_lists.v1"],
        },
      ],
    },
  },
  skills: {
    name: "Skills",
    description: "Manage your skills and skills points on your characters.",
    url: "/skills",
    Icon: (props) => React.createElement(SkillsIcon, props),
    scopes: {
      required: [
        { reason: "Read Skills", scopes: ["esi-skills.read_skills.v1"] },
        {
          reason: "Read Skill Queue",
          scopes: ["esi-skills.read_skillqueue.v1"],
        },
      ],
    },
  },
  assets: {
    name: "Assets",
    description:
      "Browse everything your character owns — drill into ships, containers and stations.",
    url: "/assets/character",
    Icon: (props) => React.createElement(AssetsIcon, props),
    scopes: {
      required: [
        {
          reason: "View your character assets",
          scopes: ["esi-assets.read_assets.v1"],
        },
      ],
    },
  },
  wallet: {
    name: "Wallet",
    description: "View your character's and your corporation's wallet.",
    url: "/wallet",
    Icon: (props) => React.createElement(WalletIcon, props),
    scopes: {
      optional: [
        {
          reason: "View your character wallet",
          scopes: ["esi-wallet.read_character_wallet.v1"],
        },
        {
          reason: "View your corporation wallet",
          scopes: ["esi-wallet.read_corporation_wallets.v1"],
        },
      ],
    },
  },
  mercenaryTacticalOperations: {
    name: "Mercenary Operations",
    description:
      "See the Mercenary Tactical Operations your Mercenary Dens are offering.",
    url: "/mercenary-tactical-operations",
    Icon: (props) => React.createElement(WindowMercenaryIcon, props),
    scopes: {
      required: [
        {
          reason: "Read Mercenary Tactical Operations",
          scopes: ["esi-activities.read_character.v1"],
        },
      ],
      // The den locations (esi-structures.read_character.v1) are not listed
      // as optional: getEnabledApps treats an app with optional sets as
      // needing one of them, which would hide this app from a character that
      // granted only the activities scope. They are in extraJitaFeatures, so
      // the login modal asks for them, and the page asks for them itself.
    },
  },
  planetaryInteraction: {
    name: "Planetary Interaction",
    description:
      "Track your colonies: extractor programs, factories, storage and daily production.",
    url: "/planetary-interaction",
    Icon: (props) => React.createElement(PlanetsIcon, props),
    scopes: {
      required: [
        {
          reason: "View your planetary colonies",
          scopes: ["esi-planets.manage_planets.v1"],
        },
      ],
      // The corporation's customs offices are in extraJitaFeatures, not here
      // as optional: getEnabledApps would then hide this app from every
      // character that is not a Director.
    },
  },
  freelance: {
    name: "Freelance Jobs",
    description:
      "Track the freelance jobs your characters have joined and the ones your corporations have posted.",
    url: "/freelance/mine",
    Icon: FreelanceIcon,
    scopes: {
      optional: [
        {
          reason: "Read your freelance jobs",
          description: "The jobs your characters are participating in.",
          scopes: ["esi-characters.read_freelance_jobs.v1"],
        },
        {
          reason: "Read your corporation's freelance jobs",
          description:
            "Every job your corporation has posted, and who joined it. Needs the Project Manager role.",
          scopes: [
            "esi-corporations.read_freelance_jobs.v1",
            "esi-characters.read_corporation_roles.v1",
          ],
        },
      ],
    },
  },
};

export const corporationApps: Record<string, JitaApp> = {
  contacts: {
    name: "Contacts",
    description: "View and manage your corporation's contacts.",
    url: "/contacts",
    subjectUrl: (id) => `/contacts?sources=corporation:${id}`,
    Icon: (props: EveIconProps) => React.createElement(ContactsIcon, props),
    scopes: {
      // Only the corporation's own contacts scope: the link opens /contacts
      // filtered to this corporation, which needs that list to be readable.
      optional: [
        {
          reason: "Read Corporation Contacts",
          scopes: ["esi-corporations.read_contacts.v1"],
        },
      ],
    },
  },
  customsOffices: {
    name: "Customs Offices",
    description: "Review your corporation's customs office taxes and access.",
    url: "/planetary-interaction/customs-offices",
    subjectUrl: (id) =>
      `/planetary-interaction/customs-offices?corporations=${id}`,
    Icon: (props: EveIconProps) => React.createElement(PlanetsIcon, props),
    scopes: {
      optional: [
        {
          reason: "Read Corporation Customs Offices",
          description:
            "Only a corporation's Directors can read them, so your roles are read too.",
          scopes: [
            "esi-planets.read_customs_offices.v1",
            "esi-characters.read_corporation_roles.v1",
          ],
        },
      ],
    },
  },
  freelance: {
    name: "Freelance Jobs",
    description: "Every freelance job your corporation has posted.",
    url: "/freelance/mine",
    subjectUrl: (id) => `/freelance/mine?sources=corporation:${id}`,
    Icon: FreelanceIcon,
    scopes: {
      // The link opens the list filtered to this corporation, so it needs that
      // corporation's jobs to be readable.
      optional: [
        {
          reason: "Read your corporation's freelance jobs",
          scopes: [
            "esi-corporations.read_freelance_jobs.v1",
            "esi-characters.read_corporation_roles.v1",
          ],
        },
      ],
    },
  },
  /*
  assets: {
    name: "Assets",
    description: "View and manage your corporation's assets.",
    url: "/assets/corporation",
    Icon: (props) => React.createElement(AssetsIcon, props),    scopes: {
      optional: [
        {
          reason: "View your character assets",
          scopes: ["esi-assets.read_assets.v1"],
        },
        {
          reason: "View your corporation assets",
          scopes: [
            "esi-characters.read_corporation_roles.v1",
            "esi-assets.read_corporation_assets.v1",
          ],
        },
      ],
    },
  },*/
};

export const allianceApps: Record<string, JitaApp> = {
  contacts: {
    name: "Contacts",
    description: "View and manage your alliance's contacts.",
    url: "/contacts",
    subjectUrl: (id) => `/contacts?sources=alliance:${id}`,
    Icon: (props: EveIconProps) => React.createElement(ContactsIcon, props),
    scopes: {
      optional: [
        {
          reason: "Read Alliance Contacts",
          scopes: ["esi-alliances.read_contacts.v1"],
        },
      ],
    },
  },
};

export const universeApps: Record<string, JitaApp> = {
  lpstore: {
    name: "LP Store",
    description: "Search through the available LP Store offers.",
    url: "/lp-store",
    Icon: (props) => React.createElement(LPStoreIcon, props),
    hotKey: ["⌘", "P"],
    scopes: {},
  },
  contracts: {
    name: "Contracts",
    description:
      "Browse public item exchanges, auctions and courier contracts, and your own.",
    url: "/contracts",
    Icon: (props) => <ContractsIcon {...props} />,
    scopes: {
      optional: [
        {
          reason: "See your contracts",
          description: "List the contracts your characters have issued",
          scopes: ["esi-contracts.read_character_contracts.v1"],
        },
        {
          reason: "See your corporation's contracts",
          description: "List the contracts issued for your corporations",
          scopes: ["esi-contracts.read_corporation_contracts.v1"],
        },
      ],
    },
  },
  wars: {
    name: "Active Wars",
    description: "View all active wars.",
    url: "/active-wars",
    Icon: (props) => <WarsIcon {...props} />,
    scopes: {},
  },
  militaryCampaigns: {
    name: "Military Campaigns",
    description:
      "Follow every military campaign and its objectives, and what your characters contributed.",
    url: "/military-campaigns",
    Icon: (props) => <WarReportIcon {...props} />,
    scopes: {},
  },
  incursions: {
    name: "Incursions",
    description:
      "Track active Sansha incursions, their spawn timeline and every past incursion since 2015.",
    url: "/incursions",
    Icon: (props) => <IncursionsIcon {...props} />,
    scopes: {},
  },
  csm: {
    name: "CSM 21",
    description:
      "Meet the candidates for the Council of Stellar Management, with their pitches, campaign threads and interviews.",
    url: "/csm",
    Icon: (props) => <VotesIcon {...props} />,
    scopes: {},
  },
  freelance: {
    name: "Freelance Jobs",
    description:
      "Browse the public freelance jobs: hauling, mining, combat and more, with their rewards and progress.",
    url: "/freelance",
    Icon: FreelanceIcon,
    scopes: {},
  },
  alliances: {
    name: "Alliances",
    description: "Browse every open alliance and its members.",
    url: "/alliances",
    Icon: (props) => <AlliancesIcon {...props} />,
    scopes: {},
  },
  factions: {
    name: "Factions",
    description:
      "Browse the empires, pirates and other powers of New Eden, with their territory and militias.",
    url: "/factions",
    Icon: (props) => <FactionalWarfareIcon {...props} />,
    scopes: {},
  },
  map: {
    name: "Map",
    description: "Browse the regions, constellations and solar systems.",
    url: "/regions",
    Icon: (props) => <MapIcon {...props} />,
    scopes: {},
  },
  inventory: {
    name: "Inventory",
    description:
      "Navigate EVE's inventory system, containing all items in the game.",
    url: "/categories",
    Icon: (props) => <ItemsIcon {...props} />,
    scopes: {},
  },
  typeLists: {
    name: "Type Lists",
    description:
      "Browse the named item lists the game uses to decide what its rules apply to.",
    url: "/type-lists",
    Icon: (props) => <ItemsIcon {...props} />,
    scopes: {},
  },
  shipTree: {
    name: "Ship Tree",
    description:
      "Browse every faction's ship tree and see which ships you can fly.",
    url: "/ship-tree",
    Icon: (props) => <ShipsIcon {...props} />,
    scopes: {},
  },
  agents: {
    name: "Agents",
    description: "Browse all agents in the EVE Universe",
    url: "/agents",
    Icon: (props) => <AgentFinderIcon {...props} />,
    scopes: {},
  },
  missions: {
    name: "Missions",
    description:
      "Browse every agent mission: objectives, rewards, briefings and epic arcs.",
    url: "/missions",
    Icon: (props) => <JournalIcon {...props} />,
    scopes: {},
  },
  epicArcs: {
    name: "Epic Arcs",
    description:
      "Browse the branching mission chains of the epic arcs, their agents, choices and endings.",
    url: "/epic-arcs",
    Icon: (props) => <JournalIcon {...props} />,
    scopes: {},
  },
  dungeons: {
    name: "Dungeons",
    description:
      "Browse combat sites, anomalies and mission pockets, with their ship restrictions.",
    url: "/dungeons",
    Icon: (props) => <AgencyIcon {...props} />,
    scopes: {},
  },
  travel: {
    name: "Travel Planner",
    description: "Plan your trip across New Eden and beyond",
    url: "/travel/jita/amarr",
    Icon: (props) => <MapIcon {...props} />,
    scopes: {},
  },
  market: {
    name: "Market",
    description: "Browse EVE's regional markets",
    url: "/market",
    Icon: (props) => <MarketIcon {...props} />,
    scopes: {},
  },
  dogma: {
    name: "Dogma",
    description: "View all attributes and effects in the game.",
    url: "/dogma",
    Icon: (props) => <AttributesIcon {...props} />,
    scopes: {},
  },
  /*
                                search: {
                                  name: "Search",
                                  description:
                                    "Search new eden for people and places. Keyboard shortcut: Ctrl+P",
                                  onClick: () => {
                                    openSpotlight();
                                  },
                                  Icon: (props) => React.createElement(PeopleAndPlacesIcon, props),
                                  hotKey: ["⌘", "P"],
                                  scopes: {
                                    required: [
                                      {
                                        reason: "Search for people and places",
                                        scopes: ["esi-search.search_structures.v1"],
                                      },
                                    ],
                                    optional: [
                                      {
                                        reason: "Search for structures",
                                        scopes: ["esi-universe.read_structures.v1"],
                                      },
                                    ],
                                  },
                                },*/
};

export const extraJitaFeatures: AppScopeSet[] = [
  {
    reason: "Set in-game autopilot",
    scopes: ["esi-ui.write_waypoint.v1"],
  },
  {
    reason: "Open in-game windows",
    scopes: ["esi-ui.open_window.v1"],
  },
  {
    reason: "Read character online status",
    scopes: ["esi-location.read_online.v1"],
  },
  {
    reason: "Read current ship",
    scopes: ["esi-location.read_ship_type.v1"],
  },
  {
    reason: "Read character current location",
    scopes: ["esi-location.read_location.v1"],
  },
  {
    reason: "Read wallet balance",
    scopes: ["esi-wallet.read_character_wallet.v1"],
  },
  {
    reason: "Read agent research information",
    scopes: ["esi-characters.read_agents_research.v1"],
  },
  {
    reason: "Read character blueprints",
    scopes: ["esi-characters.read_blueprints.v1"],
  },
  {
    reason: "Read character jump fatigue",
    scopes: ["esi-characters.read_fatigue.v1"],
  },
  {
    reason: "Read character medals",
    scopes: ["esi-characters.read_medals.v1"],
  },
  {
    reason: "Read character titles",
    scopes: ["esi-characters.read_titles.v1"],
  },
  {
    reason: "Read character notifications",
    scopes: ["esi-characters.read_notifications.v1"],
  },
  {
    reason: "Read character corporation roles",
    scopes: ["esi-characters.read_corporation_roles.v1"],
  },
  {
    reason: "Read character standings",
    scopes: ["esi-characters.read_standings.v1"],
  },
  {
    reason: "Read character loyalty points",
    scopes: ["esi-characters.read_loyalty.v1"],
  },
  {
    reason: "View your character assets (and active ship fitting)",
    scopes: ["esi-assets.read_assets.v1"],
  },
  {
    // Here rather than as an optional scope of Mercenary Operations, which
    // would hide that app from a character without it (getEnabledApps). Being
    // in the login modal's default set also keeps a later login from dropping
    // it.
    reason: "Read where your Mercenary Dens are",
    scopes: ["esi-structures.read_character.v1"],
  },
  {
    // The Customs Offices corporation app needs this, but the login modal
    // asks only for the character apps' scopes and these extra features.
    // Not an optional scope of Planetary Interaction, for the same reason as
    // the Mercenary Dens above.
    reason: "Read your corporation's customs offices",
    description:
      "Only a corporation's Directors can read them, so your roles are read too.",
    scopes: [
      "esi-planets.read_customs_offices.v1",
      "esi-characters.read_corporation_roles.v1",
    ],
  },
];

/**
 * Discord's own logo in its brand colour, where the other entries show EVE
 * icons. Takes the same props, so menus size it like the icons beside it.
 */
function DiscordLogo({ size, width, height }: EveIconProps) {
  return (
    <IconBrandDiscordFilled
      size={size ?? width ?? height}
      color="#5865F2"
      aria-hidden
    />
  );
}

/**
 * The site's own pages and community: the header's "About" menu, the mobile
 * drawer's section of the same name, and the footer's links. Discord is the
 * one external URL (see isExternalUrl), so it opens in a new tab.
 */
export const jitaSpaceApps: Record<string, JitaApp> = {
  about: {
    name: "About JitaSpace",
    description:
      "What JitaSpace is, who builds it, how to get in touch, and the privacy policy.",
    url: "/about",
    Icon: (props) => <InfoIcon {...props} />,
    scopes: {},
  },
  support: {
    name: "Support",
    description:
      "Ways to support JitaSpace: creator code, sponsorship or ISK in-game.",
    url: "/support",
    Icon: (props) => <WindowGiftIcon {...props} />,
    scopes: {},
  },
  status: {
    name: "Status",
    description:
      "EVE Online Tranquility server status and JitaSpace service health.",
    url: "/status",
    Icon: (props) => <ScopeNetworkIcon {...props} />,
    scopes: {},
  },
  discord: {
    name: "Discord",
    description:
      "Join the JitaSpace community: questions, feedback and bug reports.",
    url: env.NEXT_PUBLIC_DISCORD_INVITE_LINK,
    Icon: (props) => <DiscordLogo {...props} />,
    scopes: {},
  },
};

/** Whether an app's URL leaves the site, so menus open it in a new tab. */
export function isExternalUrl(url: string): boolean {
  return /^https?:\/\//.test(url);
}

export const jitaApps: Record<
  string,
  {
    apps: Record<string, JitaApp>;
    name: string;
    /** The group's heading in search. Defaults to "<name> Apps". */
    searchGroup?: string;
    Icon: (props: EveIconProps) => React.ReactElement;
  }
> = {
  character: {
    apps: characterApps,
    name: "Character",
    Icon: (props) => <CharacterSheetIcon {...props} />,
  },
  universe: {
    apps: universeApps,
    name: "Universe",
    Icon: (props) => <MapIcon {...props} />,
  },
  about: {
    apps: jitaSpaceApps,
    name: "About",
    searchGroup: "About",
    Icon: (props) => <HelpIcon {...props} />,
  },
};
