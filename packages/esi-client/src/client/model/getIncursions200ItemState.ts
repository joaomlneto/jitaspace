/**
 * Generated by orval v6.11.1 🍺
 * Do not edit manually.
 * EVE Swagger Interface
 * An OpenAPI for EVE Online
 * OpenAPI spec version: 1.17
 */

/**
 * The state of this incursion
 */
export type GetIncursions200ItemState = typeof GetIncursions200ItemState[keyof typeof GetIncursions200ItemState];


// eslint-disable-next-line @typescript-eslint/no-redeclare
export const GetIncursions200ItemState = {
  withdrawing: 'withdrawing',
  mobilizing: 'mobilizing',
  established: 'established',
} as const;