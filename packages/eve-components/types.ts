/**
 * A character's mailing list, as returned by ESI's
 * `GET /characters/{character_id}/mail/lists/`.
 *
 * The `EveMailSender*` trio (anchor, avatar and name) each take the character's
 * mailing lists to tell a mailing-list sender apart from a character or
 * corporation id. Declared once here because those three live in different
 * barrels, and a copy per barrel makes the package's root `export *` ambiguous.
 */
export interface MailingList {
  mailing_list_id: number;
  name: string;
}
