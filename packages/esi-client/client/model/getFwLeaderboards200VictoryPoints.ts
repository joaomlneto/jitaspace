/**
 * Generated by orval v6.11.1 🍺
 * Do not edit manually.
 * EVE Swagger Interface
 * An OpenAPI for EVE Online
 * OpenAPI spec version: 1.17
 */
import type { GetFwLeaderboards200VictoryPointsActiveTotalItem } from './getFwLeaderboards200VictoryPointsActiveTotalItem';
import type { GetFwLeaderboards200VictoryPointsLastWeekItem } from './getFwLeaderboards200VictoryPointsLastWeekItem';
import type { GetFwLeaderboards200VictoryPointsYesterdayItem } from './getFwLeaderboards200VictoryPointsYesterdayItem';

/**
 * Top 4 rankings of factions by victory points from yesterday, last week and in total
 */
export type GetFwLeaderboards200VictoryPoints = {
  /** Top 4 ranking of factions active in faction warfare by total victory points. A faction is considered "active" if they have participated in faction warfare in the past 14 days */
  active_total: GetFwLeaderboards200VictoryPointsActiveTotalItem[];
  /** Top 4 ranking of factions by victory points in the past week */
  last_week: GetFwLeaderboards200VictoryPointsLastWeekItem[];
  /** Top 4 ranking of factions by victory points in the past day */
  yesterday: GetFwLeaderboards200VictoryPointsYesterdayItem[];
};