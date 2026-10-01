/**
 * PostCSS plugin that drops declarations whose value is an empty `url("")`, in
 * `@eve-online-tools/eve-ship-tree`'s stylesheet only.
 *
 * Why: the library's published `styles.css` contains twenty of them
 * (`--ship-tree-elements-icons: url("")` for sixteen element icons and
 * `--ship-tree-groups-icon-small-npc: url("")` for four group icons), left by
 * textures its build could not resolve. They render as nothing, but Turbopack
 * tries to resolve every `url()` and fails the whole build on the empty one
 * (`Module not found: Can't resolve ''`). Removing them changes nothing that
 * was visible and lets the stylesheet be imported.
 *
 * The scope is deliberate: any other stylesheet with an empty `url()` is a bug
 * we would want to hear about, not paper over. If a later release of the library
 * stops emitting them this plugin finds nothing to do.
 *
 * Registered in `apps/web/postcss.config.cjs`.
 */

const LIBRARY = /[\\/]@eve-online-tools[\\/]eve-ship-tree[\\/]/;
const EMPTY_URL = /url\(\s*(?:""|'')\s*\)/;

/** @returns {import("postcss").Plugin} */
function dropEmptyUrls() {
  return {
    postcssPlugin: "jitaspace-ship-tree-drop-empty-urls",
    Declaration(declaration) {
      const file = declaration.source?.input.file;
      if (!file || !LIBRARY.test(file)) return;
      if (!EMPTY_URL.test(declaration.value)) return;

      const rule = declaration.parent;
      declaration.remove();
      // Don't leave `[data-element="8"]{}` behind.
      if (rule?.nodes.length === 0) rule.remove();
    },
  };
}
dropEmptyUrls.postcss = true;

module.exports = dropEmptyUrls;
