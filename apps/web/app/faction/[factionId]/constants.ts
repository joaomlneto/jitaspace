/** How many of the largest enlisted player corporations the page lists. */
export const ENLISTED_CORPORATIONS_SHOWN = 250;

/**
 * The Ship Tree tab's tree viewport. On a phone the tree fits to the width and
 * is only ~200px tall, so a full-height viewport would be mostly empty; leave
 * room to pan. Here rather than in the tab's module so the page's loading
 * placeholder can match it without loading the tree.
 */
export const SHIP_TREE_TAB_HEIGHT = { base: 360, sm: "70vh" } as const;
export const SHIP_TREE_TAB_MIN_HEIGHT = { base: 360, sm: 480 } as const;

/** The Ship Tree tab's clone type in the URL; cleared when another tab opens. */
export const SHIP_TREE_OMEGA_PARAM = "omega";
