import type {
  AllianceContact,
  CharacterContact,
  CorporationContact,
  EsiSubjectItem,
} from "@jitaspace/hooks";

/** Whose contact list a contact comes from. */
export type ContactSourceKind = "character" | "corporation" | "alliance";

export interface ContactSource {
  kind: ContactSourceKind;
  subjectId: number;
}

/**
 * One contact as the merged table shows it: the fields every source shares,
 * the source it came from, and its label names already resolved.
 *
 * Labels are resolved up front because label ids are per source — label 3 on a
 * character and label 3 on its corporation are different labels — so the table
 * could not resolve them from a single list.
 */
export type ContactRow = Pick<
  CharacterContact,
  | "contact_id"
  | "contact_type"
  | "standing"
  | "is_watched"
  | "is_blocked"
  | "label_ids"
> & {
  source: ContactSource;
  labelNames: string[];
};

/**
 * Keyed `character:<id>` / `corporation:<id>` / `alliance:<id>` rather than by
 * bare id, so the selection round-trips through the URL unambiguously.
 */
export const contactSourceKey = ({ kind, subjectId }: ContactSource) =>
  `${kind}:${subjectId}`;

/** The same contact can appear once per source, so the source is in the key. */
export const contactRowKey = (row: ContactRow) =>
  `${contactSourceKey(row.source)}:${row.contact_id}`;

interface ContactLabel {
  label_id: number;
  label_name: string;
}

/**
 * Tag one kind's contacts with their source and resolve their label names
 * against that same source's labels. A label id the source does not list
 * (deleted, or its labels have not loaded yet) shows as the id itself.
 */
export function toContactRows(
  kind: ContactSourceKind,
  contacts: EsiSubjectItem<
    CharacterContact | CorporationContact | AllianceContact
  >[],
  labels: EsiSubjectItem<ContactLabel>[],
): ContactRow[] {
  const labelNames = new Map(
    labels.map((label) => [
      `${label.subjectId}:${label.label_id}`,
      label.label_name,
    ]),
  );

  return contacts.map((contact) => ({
    contact_id: contact.contact_id,
    contact_type: contact.contact_type,
    standing: contact.standing,
    is_watched: "is_watched" in contact ? contact.is_watched : undefined,
    is_blocked: "is_blocked" in contact ? contact.is_blocked : undefined,
    label_ids: contact.label_ids,
    source: { kind, subjectId: contact.subjectId },
    labelNames: (contact.label_ids ?? []).map(
      (labelId) =>
        labelNames.get(`${contact.subjectId}:${labelId}`) ?? String(labelId),
    ),
  }));
}
