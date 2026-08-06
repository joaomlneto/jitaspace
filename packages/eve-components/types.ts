/**
 * A character's mailing-list subscription, as returned by ESI's
 * `/characters/{character_id}/mail/lists/` endpoint.
 *
 * The three `EveMailSender*` components each declared their own copy of this
 * interface, which made the package's root `index.ts` star-exports ambiguous
 * (TS2308). Declaring it once here keeps a single exported `MailingList`.
 */
export interface MailingList {
  mailing_list_id: number;
  name: string;
}
