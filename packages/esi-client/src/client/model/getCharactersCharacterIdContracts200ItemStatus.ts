/**
 * Generated by orval v6.11.1 🍺
 * Do not edit manually.
 * EVE Swagger Interface
 * An OpenAPI for EVE Online
 * OpenAPI spec version: 1.17
 */

/**
 * Status of the the contract
 */
export type GetCharactersCharacterIdContracts200ItemStatus = typeof GetCharactersCharacterIdContracts200ItemStatus[keyof typeof GetCharactersCharacterIdContracts200ItemStatus];


// eslint-disable-next-line @typescript-eslint/no-redeclare
export const GetCharactersCharacterIdContracts200ItemStatus = {
  outstanding: 'outstanding',
  in_progress: 'in_progress',
  finished_issuer: 'finished_issuer',
  finished_contractor: 'finished_contractor',
  finished: 'finished',
  cancelled: 'cancelled',
  rejected: 'rejected',
  failed: 'failed',
  deleted: 'deleted',
  reversed: 'reversed',
} as const;