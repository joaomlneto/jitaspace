import { client } from "../../../client";

export type ScrapeRecentKillsEventPayload = {
  data: {};
};

export const scrapeZkillboardRecentKills = client.createFunction(
  {
    id: "scrape-zkillboard-recent-kills",
    name: "Scrape Recent Kills",
    concurrency: {
      limit: 1,
    },
  },
  { event: "scrape/zkillboard/recent-kills" },
  async ({}) => {
    const stepStartTime = performance.now();

    // Get all Dogma Effect Categories in Hoboleaks
    const kill: {
      package: null | {
        killID: number;
        killmail: {
          attackers: {
            alliance_id?: number;
            character_id?: number;
            corporation_id?: number;
            damage_done: number;
            faction_id?: number;
            final_blow: boolean;
            security_status: number;
            ship_type_id: number;
            weapon_type_id?: number;
          }[];
          killmail_id: number;
          killmail_time: string;
          solar_system_id: number;
          victim: {
            alliance_id?: number;
            character_id?: number;
            corporation_id?: number;
            damage_taken: number;
            items: {
              flag: number;
              item_type_id: number;
              quantity_dropped?: number;
              quantity_destroyed?: number;
              singleton: number;
            }[];
            position: {
              x: number;
              y: number;
              z: number;
            };
            ship_type_id: number;
          };
        };
        zkb: {
          locationID: number;
          hash: string;
          fittedValue: number;
          droppedValue: number;
          destroyedValue: number;
          totalValue: number;
          points: number;
          npc: boolean;
          solo: boolean;
          awox: boolean;
          labels: string[];
          href: string;
        };
      };
    } = await fetch(
      // FIXME: queueID should come from env file
      "https://redisq.zkillboard.com/listen.php?ttw=1&queueID=jitaspace-l0zGVYWX1BAHolNWQUAwV1HRxhACgmp8",
      {
        headers: {
          // FIXME: User Agent should come from env file
          "User-Agent": "www.jita.space - Joao Neto - joao@jita.space",
        },
      },
    ).then((res) => res.json());

    console.log({ kill });

    return kill;
  },
);
