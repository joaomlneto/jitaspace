/**
 * Generated by orval v6.11.1 🍺
 * Do not edit manually.
 * EVE Swagger Interface
 * An OpenAPI for EVE Online
 * OpenAPI spec version: 1.17
 */
import type { PutFleetsFleetIdMembersMemberIdBodyRole } from './putFleetsFleetIdMembersMemberIdBodyRole';

/**
 * movement object
 */
export type PutFleetsFleetIdMembersMemberIdBody = {
  /** If a character is moved to the `fleet_commander` role, neither `wing_id` or `squad_id` should be specified. If a character is moved to the `wing_commander` role, only `wing_id` should be specified. If a character is moved to the `squad_commander` role, both `wing_id` and `squad_id` should be specified. If a character is moved to the `squad_member` role, both `wing_id` and `squad_id` should be specified. */
  role: PutFleetsFleetIdMembersMemberIdBodyRole;
  /** squad_id integer */
  squad_id?: number;
  /** wing_id integer */
  wing_id?: number;
};