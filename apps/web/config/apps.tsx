import React from "react";
import Image from "next/image";
import type {LinkProps} from "next/link";

import type { EveIconProps } from "@jitaspace/eve-icons";
import type {ESIScope} from "@jitaspace/esi-metadata";
import {
  AgentFinderIcon,
  AlliancesIcon,
  AssetsIcon,
  AttributesIcon,
  CalendarIcon,
  CharacterSheetIcon,
  ContactsIcon,
  CorporationIcon,
  EveMailIcon,
  FittingIcon,
  ItemsIcon,
  LPStoreIcon,
  MapIcon,
  MarketIcon,
  SkillsIcon,
  WalletIcon,
  WarsIcon,
} from "@jitaspace/eve-icons";

export interface AppScopeSet {
  reason: string;
  description?: string;
  scopes: ESIScope[];
}

export interface JitaApp {
  name: string;
  description: string;
  url?: LinkProps["href"];
  onClick?: () => void;
  Icon: (props: EveIconProps) => React.ReactElement;
  tags?: string[];
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
    description: "View and manage your character's contacts.",
    url: "/contacts/character",
    Icon: (props: EveIconProps) => React.createElement(ContactsIcon, props),
    tags: ["beta"],
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
    tags: ["beta"],
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
  skills: {
    name: "Skills",
    description: "Manage your skills and skills points on your characters.",
    url: "/skills",
    Icon: (props) => React.createElement(SkillsIcon, props),
    tags: ["beta"],
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
    description: "View and manage your character's assets.",
    url: "/assets/character",
    Icon: (props) => React.createElement(AssetsIcon, props),
    tags: ["beta"],
    scopes: {
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
  },
  wallet: {
    name: "Wallet",
    description: "View your character's and your corporation's wallet.",
    url: "/wallet/character",
    Icon: (props) => React.createElement(WalletIcon, props),
    tags: ["beta"],
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
  /*
  notifications: {
    name: "Notifications",
    description: "View your character in-game notifications",
    url: "/notifications",
    Icon: (props: EveIconProps) => React.createElement(MemberIcon, props),
    tags: ["beta"],
    scopes: {
      required: [
        {
          reason: "Read Character Notifications",
          description:
            "Allows you to read a character's in-game notifications.",
          scopes: ["esi-characters.read_notifications.v1"],
        },
      ],
    },
  },*/
};

export const corporationApps: Record<string, JitaApp> = {
  contacts: {
    name: "Contacts",
    description: "View and manage your corporation's contacts.",
    url: "/contacts/corporation",
    Icon: (props: EveIconProps) => React.createElement(ContactsIcon, props),
    tags: ["beta"],
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
  assets: {
    name: "Assets",
    description: "View and manage your corporation's assets.",
    url: "/assets/corporation",
    Icon: (props) => React.createElement(AssetsIcon, props),
    tags: ["beta"],
    scopes: {
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
  },
  wallet: {
    name: "Wallet",
    description: "View your corporation's wallet balance and transactions.",
    url: "/wallet/corporation",
    Icon: (props) => React.createElement(WalletIcon, props),
    tags: ["beta"],
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
};

export const allianceApps: Record<string, JitaApp> = {
  contacts: {
    name: "Contacts",
    description: "View and manage your alliance's contacts.",
    url: "/contacts/alliance",
    Icon: (props: EveIconProps) => React.createElement(ContactsIcon, props),
    tags: ["beta"],
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
  wars: {
    name: "Active Wars",
    description: "View all active wars.",
    url: "/active-wars",
    Icon: (props) => <WarsIcon {...props} />,
    scopes: {},
    tags: [],
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
  agents: {
    name: "Agents",
    description: "Browse all agents in the EVE Universe",
    url: "/agents",
    Icon: (props) => <AgentFinderIcon {...props} />,
    scopes: {},
    tags: ["beta"],
  },
  travel: {
    name: "Travel Planner",
    description: "Plan your trip across New Eden and beyond",
    url: "/travel/jita/amarr",
    Icon: (props) => <MapIcon {...props} />,
    scopes: {},
    tags: ["beta"],
  },
  market: {
    name: "Market",
    description: "Browse EVE's regional markets",
    url: "/market",
    Icon: (props) => <MarketIcon {...props} />,
    scopes: {},
    tags: ["beta"],
  },
  dogma: {
    name: "Dogma",
    description: "View all attributes and effects in the game.",
    url: "/dogma",
    Icon: (props) => <AttributesIcon {...props} />,
    scopes: {},
    tags: ["beta"],
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

export const devApps: Record<string, JitaApp> = {
  sde: {
    name: "SDE REST API",
    description:
      "A REST API with an OpenAPI specification for EVE Online's Static Data Export.",
    url: "https://sde.jita.space",
    Icon: (props) =>
      React.createElement(Image, {
        src: "https://images.evetech.net/types/60753/icon?size=64",
        alt: "SDE OpenAPI",
        ...props,
      }),
    hotKey: ["⌘", "P"],
    scopes: {},
  },
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
];

export const jitaApps: Record<
  string,
  {
    apps: Record<string, JitaApp>;
    name: string;
    Icon: (props: EveIconProps) => React.ReactElement;
  }
> = {
  character: {
    apps: characterApps,
    name: "Character",
    Icon: (props) => <CharacterSheetIcon {...props} />,
  },
  corporation: {
    apps: corporationApps,
    name: "Corporation",
    Icon: (props) => <CorporationIcon {...props} />,
  },
  alliance: {
    apps: allianceApps,
    name: "Alliance",
    Icon: (props) => <AlliancesIcon {...props} />,
  },
  universe: {
    apps: universeApps,
    name: "Universe",
    Icon: (props) => <MapIcon {...props} />,
  },
  developer: {
    apps: devApps,
    name: "Developer",
    Icon: (props) =>
      React.createElement(Image, {
        src: "https://images.evetech.net/types/60753/icon?size=64",
        alt: "SDE OpenAPI",
        ...props,
      }),
  },
};
