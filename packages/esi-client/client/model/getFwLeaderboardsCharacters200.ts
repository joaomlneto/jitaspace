/**
 * Generated by orval v6.11.1 🍺
 * Do not edit manually.
 * EVE Swagger Interface
 * An OpenAPI for EVE Online
 * OpenAPI spec version: 1.17
 */
import type { GetFwLeaderboardsCharacters200Kills } from './getFwLeaderboardsCharacters200Kills';
import type { GetFwLeaderboardsCharacters200VictoryPoints } from './getFwLeaderboardsCharacters200VictoryPoints';

/**
 * 200 ok object
 */
export type GetFwLeaderboardsCharacters200 = {
  /** Top 100 rankings of pilots by number of kills from yesterday, last week and in total */
  kills: GetFwLeaderboardsCharacters200Kills;
  /** Top 100 rankings of pilots by victory points from yesterday, last week and in total */
  victory_points: GetFwLeaderboardsCharacters200VictoryPoints;
};