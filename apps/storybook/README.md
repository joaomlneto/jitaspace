# @jitaspace/storybook

A [Storybook](https://storybook.js.org) for [`@jitaspace/ui`](../../packages/ui):
every presentational component, with controls, docs and accessibility checks.

The stories render inside the web app's own Mantine themes, imported from
[`apps/web/themes`](../web/themes) through the web app's `~/` alias, so a
component looks the way it does on the site. The toolbar switches the theme,
the colour scheme and the theme's wallpaper.

```bash
pnpm --filter @jitaspace/storybook dev     # http://localhost:6006
pnpm --filter @jitaspace/storybook build   # static site in storybook-static/
```

It runs on `@storybook/nextjs-vite`, which provides `next/link`, `next/image`
and Next's static image imports, all of which `@jitaspace/ui` uses. The build
is a static site and is not deployed anywhere yet.

## Writing stories

Stories live in `stories/`, one file per component group, titled
`Components/<Group>`. Avatars and type icons load real images from CCP's image
server and `icons.jita.space`, so use real ids: `stories/fixtures.ts` holds a
set resolved through ESI. Nothing here calls ESI at runtime; the data-aware
components in `@jitaspace/eve-components` are not covered.
