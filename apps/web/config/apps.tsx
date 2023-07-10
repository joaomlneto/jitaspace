import React from "react";
import { type LinkProps } from "next/link";
import { openSpotlight } from "@mantine/spotlight";

import { type ESIScope } from "@jitaspace/esi-client";
import {
  CalendarIcon,
  EveMailIcon,
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
};
