import { type LinkProps } from "next/link";

import { type ESIScope } from "@jitaspace/esi-client";
import {
  CalendarIcon,
  EveMailIcon,
  SkillsIcon,
  type EveIconProps,
} from "@jitaspace/eve-icons";

export type JitaApp = {
  name: string;
  description: string;
  url: LinkProps["href"];
  icon: React.FC<EveIconProps>;
  tags?: string[];
  scopes: {
    required?: ESIScope[];
    optional?: {
      reason: string;
      description?: string;
      scopes: ESIScope[];
    }[];
  };
};

export const jitaApps: Record<string, JitaApp> = {
  mail: {
    name: "EveMail",
    description:
      "Access your EVE Online correspondence whilst out of the game.",
    url: "/mail",
    icon: EveMailIcon,
    scopes: {
      required: ["esi-mail.read_mail.v1"],
      optional: [
        {
          reason: "Organize Mail",
          description:
            "Required to delete messages, marking them as read and unread and assigning and unassigning labels. It also allows you to create and delete labels.",
          scopes: ["esi-mail.organize_mail.v1"],
        },
        {
          reason: "Sending Mail",
          description:
            "In addition to the base permission to send EveMails, we also require permissions to use the EVE Search API and to read your contacts.",
          scopes: [
            "esi-mail.send_mail.v1",
            "esi-search.search_structures.v1",
            "esi-characters.read_contacts.v1",
          ],
        },
      ],
    },
  },
  calendar: {
    name: "Calendar",
    description:
      "View upcoming events and meetings on your EVE Online calendar.",
    url: "/calendar",
    icon: CalendarIcon,
    tags: ["beta"],
    scopes: {
      required: ["esi-calendar.read_calendar_events.v1"],
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
    description:
      "Manage your skills and skills points on your EVE Online character.",
    url: "/skills",
    icon: SkillsIcon,
    tags: ["beta"],
    scopes: {
      required: ["esi-skills.read_skills.v1", "esi-skills.read_skillqueue.v1"],
    },
  },
};
