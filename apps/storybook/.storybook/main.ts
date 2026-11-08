import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/nextjs-vite";
import { mergeConfig } from "vite";

/**
 * The stories render in the web app's own Mantine themes, so `apps/web`'s
 * `~/` alias has to resolve here too: `themes/`, `app/mantine-provider.tsx`
 * (for its CSS variables resolver) and the `lib/` helpers they import all use
 * it. So does `components/Link/EntityLinks.tsx`, which gives the cards the web
 * app's routes. No other web-app code is bundled.
 */
const webApp = fileURLToPath(new URL("../../web/", import.meta.url));

const config: StorybookConfig = {
  framework: "@storybook/nextjs-vite",
  stories: ["../stories/**/*.mdx", "../stories/**/*.stories.tsx"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  // The themes' wallpapers (`theme.other.appBackground`) are served from the
  // web app's public folder; mirror that path so they load here unchanged.
  staticDirs: [{ from: "../../web/public/wallpapers", to: "/wallpapers" }],
  core: { disableTelemetry: true },
  viteFinal: (viteConfig) =>
    mergeConfig(viteConfig, {
      resolve: { alias: [{ find: /^~\//, replacement: webApp }] },
      build: {
        // Storybook's own preview runtime (with its test utilities), docs
        // blocks and axe-core are each 0.6-1.4 MB minified, and are loaded
        // once. The default 500 kB limit warns on every build.
        chunkSizeWarningLimit: 1500,
        rolldownOptions: {
          // Mantine marks ~800 modules "use client". The directive only means
          // something to a React Server Components bundler; this is a
          // client-only bundle, so dropping it is correct, not a risk.
          checks: { moduleLevelDirective: false },
        },
      },
    }),
};

export default config;
