/**
 * Generated by orval v6.11.1 🍺
 * Do not edit manually.
 * EVE Swagger Interface
 * An OpenAPI for EVE Online
 * OpenAPI spec version: 1.17
 */

/**
 * new_mail object
 */
export type PostUiOpenwindowNewmailBody = {
  /** body string */
  body: string;
  /** recipients array */
  recipients: number[];
  /** subject string */
  subject: string;
  /** to_corp_or_alliance_id integer */
  to_corp_or_alliance_id?: number;
  /** Corporations, alliances and mailing lists are all types of mailing groups. You may only send to one mailing group, at a time, so you may fill out either this field or the to_corp_or_alliance_ids field */
  to_mailing_list_id?: number;
};