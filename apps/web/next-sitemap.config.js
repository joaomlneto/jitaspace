/**
 * Configuration for `next-sitemap`
 * @see https://www.npmjs.com/package/next-sitemap
 */

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: "https://www.jita.space",
  generateRobotsTxt: true, // (optional)
  additionalPaths: async () => {
    /** @type {{loc: string}[]} */
    const paths = [];

    // Add pages for Types
    const firstPage = await fetch(
      `https://esi.evetech.net/latest/universe/types/`,
    );
    /** @type number */
    const numPages = Number(firstPage.headers.get("x-pages"));
    let typeIds = await firstPage.json();
    for (let page = 2; page <= numPages; page++) {
      // FIXME: GET PATH FROM SPEC
      const pageTypeIds = await fetch(
        `https://esi.evetech.net/latest/universe/types/?page=${page}`,
      ).then((res) => res.json());
      typeIds = [...typeIds, ...pageTypeIds];
    }
    paths.push(
      ...typeIds.map((/** @type number */ typeId) => ({
        loc: `/type/${typeId}`,
      })),
    );

    return paths;
  },
  // ...other options
};
