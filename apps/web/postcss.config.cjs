module.exports = {
  plugins: {
    // Drops the empty `url("")`s in the ship tree library's stylesheet, which
    // Turbopack refuses to resolve. See the plugin for the details.
    "@jitaspace/ship-tree/postcss": {},
    "postcss-preset-mantine": {},
    "postcss-simple-vars": {
      variables: {
        "mantine-breakpoint-xs": "36em",
        "mantine-breakpoint-sm": "48em",
        "mantine-breakpoint-md": "62em",
        "mantine-breakpoint-lg": "75em",
        "mantine-breakpoint-xl": "88em",
      },
    },
  },
};
