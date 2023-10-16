import { ESIScope } from "./scopes";

export const scopeDescriptions: {
  [scope in ESIScope]: string;
} = {
  //publicData: "Allows access to public data.",
  "esi-alliances.read_contacts.v1":
    "Allows reading of an alliance's contact list and standings.",
  "esi-assets.read_assets.v1":
    "Allows reading a list of assets that the character owns",
  "esi-assets.read_corporation_assets.v1":
    "Allows reading of a character's corporation's assets, if the character has roles to do so.",
  "esi-bookmarks.read_character_bookmarks.v1":
    "Allows reading of a character's bookmarks and bookmark folders",
  "esi-bookmarks.read_corporation_bookmarks.v1":
    "Allows reading of a corporations's bookmarks and bookmark folders",
  "esi-calendar.read_calendar_events.v1":
    "Allows reading a character's calendar, including corporation events",
  "esi-calendar.respond_calendar_events.v1":
    "Allows updating of a character's calendar event responses",
  "esi-characters.read_agents_research.v1":
    "Allows reading a character's research status with agents",
  "esi-characters.read_blueprints.v1":
    "Allows reading a character's blueprints",
  //"esi-characters.read_chat_channels.v1":
  //  "Allows reading a character's chat channels",
  "esi-characters.read_contacts.v1":
    "Allows reading of a characters contacts list, and calculation of CSPA charges.",
  "esi-characters.read_corporation_roles.v1":
    "Allows reading the character's corporation roles",
  "esi-characters.read_fatigue.v1":
    "Allows reading a character's jump fatigue information",
  "esi-characters.read_fw_stats.v1":
    "Allows reading of a character's faction warfare statistics",
  "esi-characters.read_loyalty.v1":
    "Allows reading a character's loyalty points",
  "esi-characters.read_medals.v1": "Allows reading a character's medals",
  "esi-characters.read_notifications.v1":
    "Allows reading a character's pending contact notifications",
  "esi-characters.read_opportunities.v1":
    "Allows reading opportunities of a character",
  "esi-characters.read_standings.v1": "Allows reading a character's standings.",
  "esi-characters.read_titles.v1": "Allows reading titles given to a character",
  "esi-characters.write_contacts.v1": "Allows management of contacts",
  //"esi-characterstats.read.v1":
  //  "Allows reading a characters aggregated statistics from the past year.",
  "esi-clones.read_clones.v1":
    "Allows reading the locations of a character's jump clones and their implants.",
  "esi-clones.read_implants.v1":
    "Allows reading a character's active clone's implants",
  "esi-contracts.read_character_contracts.v1":
    "Allows reading a character's contracts",
  "esi-contracts.read_corporation_contracts.v1":
    "Allows reading a corporation's contracts",
  "esi-corporations.read_blueprints.v1":
    "Allows reading a corporation's blueprints",
  "esi-corporations.read_contacts.v1":
    "Allows reading of a character's corporation's contacts, if the character has roles to do so.",
  "esi-corporations.read_container_logs.v1":
    "Allows reading of a corporation's ALSC logs",
  "esi-corporations.read_corporation_membership.v1":
    "Allows reading a list of the ID's and roles of a character's fellow corporation members",
  "esi-corporations.read_divisions.v1":
    "Allows reading of a character's corporation's division names, if the character has roles to do so.",
  "esi-corporations.read_facilities.v1":
    "Allows reading a corporation's facilities",
  "esi-corporations.read_fw_stats.v1":
    "Allows reading of a corporation's faction warfare statistics",
  "esi-corporations.read_medals.v1":
    "Allows reading medals created and issued by a corporation",
  "esi-corporations.read_standings.v1":
    "Allows reading a corporation's standings",
  "esi-corporations.read_starbases.v1":
    "Allows reading of a character's corporation's starbase (POS) information, if the character has roles to do so.",
  "esi-corporations.read_structures.v1":
    "Allows reading a character's corporation's structure information.",
  "esi-corporations.read_titles.v1":
    "Allows reading of a character's corporation's titles, if the character has roles to do so.",
  "esi-corporations.track_members.v1":
    "Allows tracking members' activities in a corporation",
  "esi-fittings.read_fittings.v1": "Allows reading information about fittings",
  "esi-fittings.write_fittings.v1": "Allows manipulating fittings",
  "esi-fleets.read_fleet.v1": "Allows reading information about fleets",
  "esi-fleets.write_fleet.v1": "Allows manipulating fleets",
  "esi-industry.read_character_jobs.v1":
    "Allows reading a character's industry jobs",
  "esi-industry.read_character_mining.v1":
    "Allows reading a character's personal mining activity",
  "esi-industry.read_corporation_jobs.v1":
    "Allows reading of a character's corporation's industry jobs, if the character has roles to do so.",
  "esi-industry.read_corporation_mining.v1":
    "Allows reading and observing a corporation's mining activity",
  "esi-killmails.read_corporation_killmails.v1":
    "Allows reading of a corporation's kills and losses",
  "esi-killmails.read_killmails.v1":
    "Allows reading of a character's kills and losses",
  "esi-location.read_location.v1":
    "Allows reading of a character's active ship location",
  "esi-location.read_online.v1": "Allows reading a character's online status",
  "esi-location.read_ship_type.v1":
    "Allows reading of a character's active ship class",
  "esi-mail.organize_mail.v1":
    "Allows updating the character's mail labels and unread status. Also allows deleting of the character's mail.",
  "esi-mail.read_mail.v1": "Allows reading of the character's inbox and mails.",
  "esi-mail.send_mail.v1": "Allows sending of mail on the character's behalf.",
  "esi-markets.read_character_orders.v1":
    "Allows reading a character's market orders",
  "esi-markets.read_corporation_orders.v1":
    "Allows reading of a character's corporation's market orders, if the character has roles to do so.",
  "esi-markets.structure_markets.v1":
    "Allows reading market data from a structure, if the user has market access to that structure",
  "esi-planets.manage_planets.v1":
    "Allows reading a list of a characters planetary colonies, and the details of those colonies",
  "esi-planets.read_customs_offices.v1":
    "Allow reading of corporation owned customs offices",
  "esi-search.search_structures.v1":
    "Allows searching over all structures that a character can see in the structure browser.",
  "esi-skills.read_skillqueue.v1":
    "Allows reading of a character's currently training skill queue.",
  "esi-skills.read_skills.v1":
    "Allows reading of a character's currently known skills.",
  "esi-ui.open_window.v1": "Allows open window in game client remotely",
  "esi-ui.write_waypoint.v1":
    "Allows manipulating waypoints in game client remotely",
  "esi-universe.read_structures.v1":
    "Allows querying the location and type of structures that the character has docking access at.",
  "esi-wallet.read_character_wallet.v1":
    "Allows reading of a character's wallet, journal and transaction history.",
  //"esi-wallet.read_corporation_wallet.v1": "EVE Mobile legacy scope",
  "esi-wallet.read_corporation_wallets.v1":
    "Allows reading of a character's corporation's wallets, journal and transaction history, if the character has roles to do so.",
};

export function getScopeDescription(scope: ESIScope): string {
  return scopeDescriptions[scope] ?? "";
}
