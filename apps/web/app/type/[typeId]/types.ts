/**
 * SDE dogma metadata for one type, resolved on the server from our own database
 * and handed to the client page as a plain, serializable prop.
 *
 * ESI supplies which attributes a type has and their values; only the SDE knows
 * how to present them — display name, icon, unit symbol and the category each
 * attribute is grouped under. The page previously walked that as a three-level
 * client-side cascade (attribute → unit → category); one server query covers it.
 */
export interface TypeDogmaAttributeMeta {
  displayName?: string;
  name?: string;
  iconId?: number;
  unitId?: number;
  categoryId?: number;
}

export interface TypeDogmaMeta {
  /** Keyed by attribute id. */
  attributes: Record<number, TypeDogmaAttributeMeta>;
  /** Unit symbol, keyed by unit id. */
  unitSymbols: Record<number, string>;
  /** Category name, keyed by dogma attribute category id. */
  categoryNames: Record<number, string>;
}

export const emptyTypeDogmaMeta: TypeDogmaMeta = {
  attributes: {},
  unitSymbols: {},
  categoryNames: {},
};
