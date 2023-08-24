import { ESIScope } from "./scopes";

/**
 * Code to generate this, considering `spec` contains the `swagger.json`:
 *
 * const paths = Object.keys(spec.paths);
 * const scopes = {}
 * for (const pathName of paths) {
 *   scopes[pathName] = {}
 * 	const path = spec.paths[pathName];
 * 	const methods = Object.entries(path)
 *   for (const [methodName, method] of methods) {
 *     scopes[pathName][methodName] = method.security?.flatMap(entry => entry.evesso).filter(x => x) ?? [];
 * 	}
 * }
 * console.log(scopes);
 */

export const endpointScopes: {
  [endpoint: string]: { [method: string]: ESIScope[] };
} = {
  "/alliances/": { get: [] },
  "/alliances/{alliance_id}/": { get: [] },
  "/alliances/{alliance_id}/contacts/": {
    get: ["esi-alliances.read_contacts.v1"],
  },
  "/alliances/{alliance_id}/contacts/labels/": {
    get: ["esi-alliances.read_contacts.v1"],
  },
  "/alliances/{alliance_id}/corporations/": { get: [] },
  "/alliances/{alliance_id}/icons/": { get: [] },
  "/characters/affiliation/": { post: [] },
  "/characters/{character_id}/": { get: [] },
  "/characters/{character_id}/agents_research/": {
    get: ["esi-characters.read_agents_research.v1"],
  },
  "/characters/{character_id}/assets/": { get: ["esi-assets.read_assets.v1"] },
  "/characters/{character_id}/assets/locations/": {
    post: ["esi-assets.read_assets.v1"],
  },
  "/characters/{character_id}/assets/names/": {
    post: ["esi-assets.read_assets.v1"],
  },
  "/characters/{character_id}/attributes/": {
    get: ["esi-skills.read_skills.v1"],
  },
  "/characters/{character_id}/blueprints/": {
    get: ["esi-characters.read_blueprints.v1"],
  },
  "/characters/{character_id}/bookmarks/": {
    get: ["esi-bookmarks.read_character_bookmarks.v1"],
  },
  "/characters/{character_id}/bookmarks/folders/": {
    get: ["esi-bookmarks.read_character_bookmarks.v1"],
  },
  "/characters/{character_id}/calendar/": {
    get: ["esi-calendar.read_calendar_events.v1"],
  },
  "/characters/{character_id}/calendar/{event_id}/": {
    get: ["esi-calendar.read_calendar_events.v1"],
    put: ["esi-calendar.respond_calendar_events.v1"],
  },
  "/characters/{character_id}/calendar/{event_id}/attendees/": {
    get: ["esi-calendar.read_calendar_events.v1"],
  },
  "/characters/{character_id}/clones/": { get: ["esi-clones.read_clones.v1"] },
  "/characters/{character_id}/contacts/": {
    delete: ["esi-characters.write_contacts.v1"],
    get: ["esi-characters.read_contacts.v1"],
    post: ["esi-characters.write_contacts.v1"],
    put: ["esi-characters.write_contacts.v1"],
  },
  "/characters/{character_id}/contacts/labels/": {
    get: ["esi-characters.read_contacts.v1"],
  },
  "/characters/{character_id}/contracts/": {
    get: ["esi-contracts.read_character_contracts.v1"],
  },
  "/characters/{character_id}/contracts/{contract_id}/bids/": {
    get: ["esi-contracts.read_character_contracts.v1"],
  },
  "/characters/{character_id}/contracts/{contract_id}/items/": {
    get: ["esi-contracts.read_character_contracts.v1"],
  },
  "/characters/{character_id}/corporationhistory/": { get: [] },
  "/characters/{character_id}/cspa/": {
    post: ["esi-characters.read_contacts.v1"],
  },
  "/characters/{character_id}/fatigue/": {
    get: ["esi-characters.read_fatigue.v1"],
  },
  "/characters/{character_id}/fittings/": {
    get: ["esi-fittings.read_fittings.v1"],
    post: ["esi-fittings.write_fittings.v1"],
  },
  "/characters/{character_id}/fittings/{fitting_id}/": {
    delete: ["esi-fittings.write_fittings.v1"],
  },
  "/characters/{character_id}/fleet/": { get: ["esi-fleets.read_fleet.v1"] },
  "/characters/{character_id}/fw/stats/": {
    get: ["esi-characters.read_fw_stats.v1"],
  },
  "/characters/{character_id}/implants/": {
    get: ["esi-clones.read_implants.v1"],
  },
  "/characters/{character_id}/industry/jobs/": {
    get: ["esi-industry.read_character_jobs.v1"],
  },
  "/characters/{character_id}/killmails/recent/": {
    get: ["esi-killmails.read_killmails.v1"],
  },
  "/characters/{character_id}/location/": {
    get: ["esi-location.read_location.v1"],
  },
  "/characters/{character_id}/loyalty/points/": {
    get: ["esi-characters.read_loyalty.v1"],
  },
  "/characters/{character_id}/mail/": {
    get: ["esi-mail.read_mail.v1"],
    post: ["esi-mail.send_mail.v1"],
  },
  "/characters/{character_id}/mail/labels/": {
    get: ["esi-mail.read_mail.v1"],
    post: ["esi-mail.organize_mail.v1"],
  },
  "/characters/{character_id}/mail/labels/{label_id}/": {
    delete: ["esi-mail.organize_mail.v1"],
  },
  "/characters/{character_id}/mail/lists/": { get: ["esi-mail.read_mail.v1"] },
  "/characters/{character_id}/mail/{mail_id}/": {
    delete: ["esi-mail.organize_mail.v1"],
    get: ["esi-mail.read_mail.v1"],
    put: ["esi-mail.organize_mail.v1"],
  },
  "/characters/{character_id}/medals/": {
    get: ["esi-characters.read_medals.v1"],
  },
  "/characters/{character_id}/mining/": {
    get: ["esi-industry.read_character_mining.v1"],
  },
  "/characters/{character_id}/notifications/": {
    get: ["esi-characters.read_notifications.v1"],
  },
  "/characters/{character_id}/notifications/contacts/": {
    get: ["esi-characters.read_notifications.v1"],
  },
  "/characters/{character_id}/online/": {
    get: ["esi-location.read_online.v1"],
  },
  "/characters/{character_id}/opportunities/": {
    get: ["esi-characters.read_opportunities.v1"],
  },
  "/characters/{character_id}/orders/": {
    get: ["esi-markets.read_character_orders.v1"],
  },
  "/characters/{character_id}/orders/history/": {
    get: ["esi-markets.read_character_orders.v1"],
  },
  "/characters/{character_id}/planets/": {
    get: ["esi-planets.manage_planets.v1"],
  },
  "/characters/{character_id}/planets/{planet_id}/": {
    get: ["esi-planets.manage_planets.v1"],
  },
  "/characters/{character_id}/portrait/": { get: [] },
  "/characters/{character_id}/roles/": {
    get: ["esi-characters.read_corporation_roles.v1"],
  },
  "/characters/{character_id}/search/": {
    get: ["esi-search.search_structures.v1"],
  },
  "/characters/{character_id}/ship/": {
    get: ["esi-location.read_ship_type.v1"],
  },
  "/characters/{character_id}/skillqueue/": {
    get: ["esi-skills.read_skillqueue.v1"],
  },
  "/characters/{character_id}/skills/": { get: ["esi-skills.read_skills.v1"] },
  "/characters/{character_id}/standings/": {
    get: ["esi-characters.read_standings.v1"],
  },
  "/characters/{character_id}/titles/": {
    get: ["esi-characters.read_titles.v1"],
  },
  "/characters/{character_id}/wallet/": {
    get: ["esi-wallet.read_character_wallet.v1"],
  },
  "/characters/{character_id}/wallet/journal/": {
    get: ["esi-wallet.read_character_wallet.v1"],
  },
  "/characters/{character_id}/wallet/transactions/": {
    get: ["esi-wallet.read_character_wallet.v1"],
  },
  "/contracts/public/bids/{contract_id}/": { get: [] },
  "/contracts/public/items/{contract_id}/": { get: [] },
  "/contracts/public/{region_id}/": { get: [] },
  "/corporation/{corporation_id}/mining/extractions/": {
    get: ["esi-industry.read_corporation_mining.v1"],
  },
  "/corporation/{corporation_id}/mining/observers/": {
    get: ["esi-industry.read_corporation_mining.v1"],
  },
  "/corporation/{corporation_id}/mining/observers/{observer_id}/": {
    get: ["esi-industry.read_corporation_mining.v1"],
  },
  "/corporations/npccorps/": { get: [] },
  "/corporations/{corporation_id}/": { get: [] },
  "/corporations/{corporation_id}/alliancehistory/": { get: [] },
  "/corporations/{corporation_id}/assets/": {
    get: ["esi-assets.read_corporation_assets.v1"],
  },
  "/corporations/{corporation_id}/assets/locations/": {
    post: ["esi-assets.read_corporation_assets.v1"],
  },
  "/corporations/{corporation_id}/assets/names/": {
    post: ["esi-assets.read_corporation_assets.v1"],
  },
  "/corporations/{corporation_id}/blueprints/": {
    get: ["esi-corporations.read_blueprints.v1"],
  },
  "/corporations/{corporation_id}/bookmarks/": {
    get: ["esi-bookmarks.read_corporation_bookmarks.v1"],
  },
  "/corporations/{corporation_id}/bookmarks/folders/": {
    get: ["esi-bookmarks.read_corporation_bookmarks.v1"],
  },
  "/corporations/{corporation_id}/contacts/": {
    get: ["esi-corporations.read_contacts.v1"],
  },
  "/corporations/{corporation_id}/contacts/labels/": {
    get: ["esi-corporations.read_contacts.v1"],
  },
  "/corporations/{corporation_id}/containers/logs/": {
    get: ["esi-corporations.read_container_logs.v1"],
  },
  "/corporations/{corporation_id}/contracts/": {
    get: ["esi-contracts.read_corporation_contracts.v1"],
  },
  "/corporations/{corporation_id}/contracts/{contract_id}/bids/": {
    get: ["esi-contracts.read_corporation_contracts.v1"],
  },
  "/corporations/{corporation_id}/contracts/{contract_id}/items/": {
    get: ["esi-contracts.read_corporation_contracts.v1"],
  },
  "/corporations/{corporation_id}/customs_offices/": {
    get: ["esi-planets.read_customs_offices.v1"],
  },
  "/corporations/{corporation_id}/divisions/": {
    get: ["esi-corporations.read_divisions.v1"],
  },
  "/corporations/{corporation_id}/facilities/": {
    get: ["esi-corporations.read_facilities.v1"],
  },
  "/corporations/{corporation_id}/fw/stats/": {
    get: ["esi-corporations.read_fw_stats.v1"],
  },
  "/corporations/{corporation_id}/icons/": { get: [] },
  "/corporations/{corporation_id}/industry/jobs/": {
    get: ["esi-industry.read_corporation_jobs.v1"],
  },
  "/corporations/{corporation_id}/killmails/recent/": {
    get: ["esi-killmails.read_corporation_killmails.v1"],
  },
  "/corporations/{corporation_id}/medals/": {
    get: ["esi-corporations.read_medals.v1"],
  },
  "/corporations/{corporation_id}/medals/issued/": {
    get: ["esi-corporations.read_medals.v1"],
  },
  "/corporations/{corporation_id}/members/": {
    get: ["esi-corporations.read_corporation_membership.v1"],
  },
  "/corporations/{corporation_id}/members/limit/": {
    get: ["esi-corporations.track_members.v1"],
  },
  "/corporations/{corporation_id}/members/titles/": {
    get: ["esi-corporations.read_titles.v1"],
  },
  "/corporations/{corporation_id}/membertracking/": {
    get: ["esi-corporations.track_members.v1"],
  },
  "/corporations/{corporation_id}/orders/": {
    get: ["esi-markets.read_corporation_orders.v1"],
  },
  "/corporations/{corporation_id}/orders/history/": {
    get: ["esi-markets.read_corporation_orders.v1"],
  },
  "/corporations/{corporation_id}/roles/": {
    get: ["esi-corporations.read_corporation_membership.v1"],
  },
  "/corporations/{corporation_id}/roles/history/": {
    get: ["esi-corporations.read_corporation_membership.v1"],
  },
  "/corporations/{corporation_id}/shareholders/": {
    get: ["esi-wallet.read_corporation_wallets.v1"],
  },
  "/corporations/{corporation_id}/standings/": {
    get: ["esi-corporations.read_standings.v1"],
  },
  "/corporations/{corporation_id}/starbases/": {
    get: ["esi-corporations.read_starbases.v1"],
  },
  "/corporations/{corporation_id}/starbases/{starbase_id}/": {
    get: ["esi-corporations.read_starbases.v1"],
  },
  "/corporations/{corporation_id}/structures/": {
    get: ["esi-corporations.read_structures.v1"],
  },
  "/corporations/{corporation_id}/titles/": {
    get: ["esi-corporations.read_titles.v1"],
  },
  "/corporations/{corporation_id}/wallets/": {
    get: ["esi-wallet.read_corporation_wallets.v1"],
  },
  "/corporations/{corporation_id}/wallets/{division}/journal/": {
    get: ["esi-wallet.read_corporation_wallets.v1"],
  },
  "/corporations/{corporation_id}/wallets/{division}/transactions/": {
    get: ["esi-wallet.read_corporation_wallets.v1"],
  },
  "/dogma/attributes/": { get: [] },
  "/dogma/attributes/{attribute_id}/": { get: [] },
  "/dogma/dynamic/items/{type_id}/{item_id}/": { get: [] },
  "/dogma/effects/": { get: [] },
  "/dogma/effects/{effect_id}/": { get: [] },
  "/fleets/{fleet_id}/": {
    get: ["esi-fleets.read_fleet.v1"],
    put: ["esi-fleets.write_fleet.v1"],
  },
  "/fleets/{fleet_id}/members/": {
    get: ["esi-fleets.read_fleet.v1"],
    post: ["esi-fleets.write_fleet.v1"],
  },
  "/fleets/{fleet_id}/members/{member_id}/": {
    delete: ["esi-fleets.write_fleet.v1"],
    put: ["esi-fleets.write_fleet.v1"],
  },
  "/fleets/{fleet_id}/squads/{squad_id}/": {
    delete: ["esi-fleets.write_fleet.v1"],
    put: ["esi-fleets.write_fleet.v1"],
  },
  "/fleets/{fleet_id}/wings/": {
    get: ["esi-fleets.read_fleet.v1"],
    post: ["esi-fleets.write_fleet.v1"],
  },
  "/fleets/{fleet_id}/wings/{wing_id}/": {
    delete: ["esi-fleets.write_fleet.v1"],
    put: ["esi-fleets.write_fleet.v1"],
  },
  "/fleets/{fleet_id}/wings/{wing_id}/squads/": {
    post: ["esi-fleets.write_fleet.v1"],
  },
  "/fw/leaderboards/": { get: [] },
  "/fw/leaderboards/characters/": { get: [] },
  "/fw/leaderboards/corporations/": { get: [] },
  "/fw/stats/": { get: [] },
  "/fw/systems/": { get: [] },
  "/fw/wars/": { get: [] },
  "/incursions/": { get: [] },
  "/industry/facilities/": { get: [] },
  "/industry/systems/": { get: [] },
  "/insurance/prices/": { get: [] },
  "/killmails/{killmail_id}/{killmail_hash}/": { get: [] },
  "/loyalty/stores/{corporation_id}/offers/": { get: [] },
  "/markets/groups/": { get: [] },
  "/markets/groups/{market_group_id}/": { get: [] },
  "/markets/prices/": { get: [] },
  "/markets/structures/{structure_id}/": {
    get: ["esi-markets.structure_markets.v1"],
  },
  "/markets/{region_id}/history/": { get: [] },
  "/markets/{region_id}/orders/": { get: [] },
  "/markets/{region_id}/types/": { get: [] },
  "/opportunities/groups/": { get: [] },
  "/opportunities/groups/{group_id}/": { get: [] },
  "/opportunities/tasks/": { get: [] },
  "/opportunities/tasks/{task_id}/": { get: [] },
  "/route/{origin}/{destination}/": { get: [] },
  "/sovereignty/campaigns/": { get: [] },
  "/sovereignty/map/": { get: [] },
  "/sovereignty/structures/": { get: [] },
  "/status/": { get: [] },
  "/ui/autopilot/waypoint/": { post: ["esi-ui.write_waypoint.v1"] },
  "/ui/openwindow/contract/": { post: ["esi-ui.open_window.v1"] },
  "/ui/openwindow/information/": { post: ["esi-ui.open_window.v1"] },
  "/ui/openwindow/marketdetails/": { post: ["esi-ui.open_window.v1"] },
  "/ui/openwindow/newmail/": { post: ["esi-ui.open_window.v1"] },
  "/universe/ancestries/": { get: [] },
  "/universe/asteroid_belts/{asteroid_belt_id}/": { get: [] },
  "/universe/bloodlines/": { get: [] },
  "/universe/categories/": { get: [] },
  "/universe/categories/{category_id}/": { get: [] },
  "/universe/constellations/": { get: [] },
  "/universe/constellations/{constellation_id}/": { get: [] },
  "/universe/factions/": { get: [] },
  "/universe/graphics/": { get: [] },
  "/universe/graphics/{graphic_id}/": { get: [] },
  "/universe/groups/": { get: [] },
  "/universe/groups/{group_id}/": { get: [] },
  "/universe/ids/": { post: [] },
  "/universe/moons/{moon_id}/": { get: [] },
  "/universe/names/": { post: [] },
  "/universe/planets/{planet_id}/": { get: [] },
  "/universe/races/": { get: [] },
  "/universe/regions/": { get: [] },
  "/universe/regions/{region_id}/": { get: [] },
  "/universe/schematics/{schematic_id}/": { get: [] },
  "/universe/stargates/{stargate_id}/": { get: [] },
  "/universe/stars/{star_id}/": { get: [] },
  "/universe/stations/{station_id}/": { get: [] },
  "/universe/structures/": { get: [] },
  "/universe/structures/{structure_id}/": {
    get: ["esi-universe.read_structures.v1"],
  },
  "/universe/system_jumps/": { get: [] },
  "/universe/system_kills/": { get: [] },
  "/universe/systems/": { get: [] },
  "/universe/systems/{system_id}/": { get: [] },
  "/universe/types/": { get: [] },
  "/universe/types/{type_id}/": { get: [] },
  "/wars/": { get: [] },
  "/wars/{war_id}/": { get: [] },
  "/wars/{war_id}/killmails/": { get: [] },
};
