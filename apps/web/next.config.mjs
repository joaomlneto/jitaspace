import withPWAInit from "@ducanh2912/next-pwa";
import bundleAnalyzer from "@next/bundle-analyzer";

/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds and Linting.
 */
!process.env.SKIP_ENV_VALIDATION && (await import("./env.mjs"));

/** @type {import("next").NextConfig} */
const config = {
    reactStrictMode: true,

    /** Enables hot reloading for local packages without a build step */
    transpilePackages: [
        "@jitaspace/auth",
        "@jitaspace/db",
        "@jitaspace/esi-metadata",
        "@jitaspace/esi-client",
        "@jitaspace/esi-meta-client",
        "@jitaspace/eve-icons",
        "@jitaspace/eve-scrape",
        "@jitaspace/hooks",
        "@jitaspace/sde-client",
        "@jitaspace/tiptap-eve",
        "@jitaspace/ui",
        "@jitaspace/utils",
        // FIXME: This should not be required to be here! Workaround by the package author while in alpha.
        // It throws a weird error saying it cannot find MantineProvider otherwise...!
        "mantine-react-table"
    ],

    /** We already do linting and typechecking as separate tasks in CI */
    eslint: {ignoreDuringBuilds: !!process.env.CI},
    typescript: {ignoreBuildErrors: !!process.env.CI},

    /** Allow images from CCP CDN */
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "web.ccpgamescdn.com",
            },
            {
                protocol: "https",
                hostname: "images.evetech.net",
            },
        ],
    },

    rewrites: async () => [
        {
            source: "/analytics/:match*",
            destination: "https://analytics.umami.is/:match*", // Proxy to Umami
        },
    ],

    async redirects() {
        return [
            {
                source: "/bookmarks",
                //destination: 'https://github.com/esi/esi-issues/issues/1340',
                destination: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                permanent: false,
            },
        ];
    },
};

const withPWA = withPWAInit({
    dest: "public",
});

const withBundleAnalyzer = bundleAnalyzer({
    enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer(withPWA(config));
