/**
 * Generated by orval v6.11.1 🍺
 * Do not edit manually.
 * EVE Swagger Interface
 * An OpenAPI for EVE Online
 * OpenAPI spec version: 1.17
 */
import type { PostCharactersCharacterIdMailBodyRecipientsItemRecipientType } from './postCharactersCharacterIdMailBodyRecipientsItemRecipientType';

/**
 * recipient object
 */
export type PostCharactersCharacterIdMailBodyRecipientsItem = {
  /** recipient_id integer */
  recipient_id: number;
  /** recipient_type string */
  recipient_type: PostCharactersCharacterIdMailBodyRecipientsItemRecipientType;
};