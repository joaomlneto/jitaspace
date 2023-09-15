import React from "react";
import { type LinkProps } from "next/link";
import { openSpotlight } from "@mantine/spotlight";

import { type ESIScope } from "@jitaspace/esi-client";
import {
  AssetsIcon,
  CalendarIcon,
  ContactsIcon,
  EveMailIcon,
  FittingIcon,
  ItemsIcon,
  LPStoreIcon,
  MapIcon,
  PeopleAndPlacesIcon,
  SkillsIcon,
  type EveIconProps,
} from "@jitaspace/eve-icons";
import { TotalUnreadMailsIndicator } from "@jitaspace/ui";

export type AppScopeSet = {
  reason: string;
  description?: string;
  scopes: ESIScope[];
};

export type JitaApp = {
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
};

export const jitaApps: Record<string, JitaApp> = {
  mail: {
    name: "EveMail",
    description: "Access your correspondence whilst out of the game.",
    url: "/mail",
    Icon: (props) => (
      <TotalUnreadMailsIndicator position="bottom-end" offset={8}>
        <EveMailIcon {...props} />
      </TotalUnreadMailsIndicator>
    ),
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
    description:
      "View and manage your character's, corporation's and alliance's contacts.",
    url: "/contacts",
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
    description: "View and manage your and your corporation's assets.",
    url: "/assets",
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
};

export const universeApps: Record<string, JitaApp> = {
  search: {
    name: "Search",
    description: "Search new eden for people and places.",
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
  },
  lpstore: {
    name: "LP Store",
    description: "Search through the available LP Store offers.",
    url: "/lp-store",
    Icon: (props) => React.createElement(LPStoreIcon, props),
    hotKey: ["⌘", "P"],
    scopes: {},
  },
  map: {
    name: "Map",
    description: "View the EVE Universe Map.",
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
];
