import "@mantine/core/styles.css";

import type { MantineColorScheme } from "@mantine/core";
import type { Decorator, Preview } from "@storybook/nextjs-vite";
import { Box, MantineProvider, useMantineTheme } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";

import type { AppTheme } from "~/lib/preferences";
import { cssVariablesResolver } from "~/app/mantine-provider";
import { APP_THEME_OPTIONS } from "~/lib/preferences";
import { resolveAppTheme } from "~/themes";
import { isDefaultThemeSeasonOver } from "~/themes/season";

/** The app's wallpaper, painted behind the story the way MainLayout does. */
const Wallpaper = () => {
  const theme = useMantineTheme();
  const background = theme.other.appBackground;
  if (!background) return null;
  return (
    <Box
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        background,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    />
  );
};

const withMantine: Decorator = (Story, context) => {
  const appTheme = context.globals.appTheme as AppTheme;
  const colorScheme = context.globals.colorScheme as Exclude<
    MantineColorScheme,
    "auto"
  >;
  const wallpaper = context.globals.wallpaper !== "off";
  const theme = resolveAppTheme(appTheme, isDefaultThemeSeasonOver(Date.now()));

  return (
    <MantineProvider
      theme={theme}
      forceColorScheme={colorScheme}
      cssVariablesResolver={cssVariablesResolver}
    >
      <ModalsProvider>
        {context.viewMode === "docs" ? (
          // Docs pages sit on Storybook's own light canvas, which the dark
          // scheme's text would vanish into; give each example the app's body.
          <Box
            p="md"
            bg="var(--mantine-color-body)"
            c="var(--mantine-color-text)"
          >
            <Story />
          </Box>
        ) : (
          <>
            {wallpaper && <Wallpaper />}
            <Story />
          </>
        )}
      </ModalsProvider>
    </MantineProvider>
  );
};

const preview: Preview = {
  decorators: [withMantine],
  globalTypes: {
    appTheme: {
      description: "JitaSpace theme",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: APP_THEME_OPTIONS.map(({ value, label }) => ({
          value,
          title: label,
        })),
        dynamicTitle: true,
      },
    },
    colorScheme: {
      description: "Mantine color scheme",
      toolbar: {
        title: "Color scheme",
        icon: "mirror",
        items: [
          { value: "dark", title: "Dark", icon: "moon" },
          { value: "light", title: "Light", icon: "sun" },
        ],
        dynamicTitle: true,
      },
    },
    wallpaper: {
      description: "Paint the theme's wallpaper behind the story",
      toolbar: {
        title: "Wallpaper",
        icon: "photo",
        items: [
          { value: "on", title: "Wallpaper on" },
          { value: "off", title: "Wallpaper off" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    appTheme: "default",
    colorScheme: "dark",
    wallpaper: "on",
  },
  parameters: {
    layout: "padded",
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    nextjs: { appDirectory: true },
    options: {
      storySort: {
        order: ["Introduction", "Foundations", "Cards", "Components"],
      },
    },
    a11y: { test: "todo" },
  },
  tags: ["autodocs"],
};

export default preview;
