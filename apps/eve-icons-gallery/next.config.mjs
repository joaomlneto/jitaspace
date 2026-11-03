/**
 * A fully static site: `next build` writes plain HTML/JS/PNG files to `out/`,
 * so it can be hosted anywhere. The icon PNGs are copied from
 * `@jitaspace/eve-icons/assets` into `public/icons/` by the `copy-icons` script.
 *
 * @type {import("next").NextConfig}
 */
const config = {
  output: "export",
  reactStrictMode: true,
  trailingSlash: true,
  transpilePackages: ["@jitaspace/eve-icons"],
};

export default config;
