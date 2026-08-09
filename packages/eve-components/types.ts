/**
 * A mail sender that is a mailing list rather than a character or corporation.
 *
 * Declared here rather than alongside any one component because the sender
 * anchor, avatar and name components all accept it: three identical local
 * copies made `MailingList` ambiguous across the barrel re-exports in
 * `index.ts`.
 */
export interface MailingList {
  mailing_list_id: number;
  name: string;
}
