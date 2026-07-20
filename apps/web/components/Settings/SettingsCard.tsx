"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Group,
  Menu,
  Switch,
  Tabs,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import {
  IconChevronDown,
  IconFlask,
  IconRefresh,
  IconRestore,
  IconSettings,
} from "@tabler/icons-react";
import ReactCountryFlag from "react-country-flag";

import { setAcceptLanguage } from "@jitaspace/esi-client";

import { useDismissedNews } from "~/components/News";
import {
  APP_THEME_OPTIONS,
  ESI_ACCEPT_LANGUAGE_OPTIONS,
  usePreferencesStore,
} from "~/lib/preferences";
import classes from "./SettingsCard.module.css";

export function SettingsCard() {
  const [languageMenuOpened, setLanguageMenuOpened] = useState(false);
  const [themeMenuOpened, setThemeMenuOpened] = useState(false);
  const acceptLanguage = usePreferencesStore(
    (state) => state.esiAcceptLanguage,
  );
  const selectedTheme = usePreferencesStore((state) => state.appTheme);
  const experimentalDataTables = usePreferencesStore(
    (state) => state.experimentalDataTables,
  );
  const experimentalActiveWars = usePreferencesStore(
    (state) => state.experimentalActiveWars,
  );
  const setSelectedAcceptLanguage = usePreferencesStore(
    (state) => state.setEsiAcceptLanguage,
  );
  const setSelectedTheme = usePreferencesStore((state) => state.setAppTheme);
  const setExperimentalDataTables = usePreferencesStore(
    (state) => state.setExperimentalDataTables,
  );
  const setExperimentalActiveWars = usePreferencesStore(
    (state) => state.setExperimentalActiveWars,
  );

  const {
    dismissedIds,
    mounted: newsMounted,
    reset: resetHiddenNews,
  } = useDismissedNews();
  const hiddenNewsCount = dismissedIds.length;

  useEffect(() => {
    setAcceptLanguage(acceptLanguage);
  }, [acceptLanguage]);

  const selectedLanguage = useMemo(
    () =>
      ESI_ACCEPT_LANGUAGE_OPTIONS.find(
        (item) => item.languageCode === acceptLanguage,
      ) ?? ESI_ACCEPT_LANGUAGE_OPTIONS[0],
    [acceptLanguage],
  );

  const languageItems = ESI_ACCEPT_LANGUAGE_OPTIONS.map((item) => (
    <Menu.Item
      key={item.languageCode}
      onClick={() => {
        setSelectedAcceptLanguage(item.languageCode);
      }}
      leftSection={
        <ReactCountryFlag
          countryCode={item.countryCode}
          svg
          className={classes.flag}
          aria-label={`${item.label} flag`}
        />
      }
    >
      {item.label}
    </Menu.Item>
  ));

  const selectedThemeOption = useMemo(
    () =>
      APP_THEME_OPTIONS.find((item) => item.value === selectedTheme) ??
      APP_THEME_OPTIONS[0],
    [selectedTheme],
  );

  const themeItems = APP_THEME_OPTIONS.map((item) => (
    <Menu.Item
      key={item.value}
      onClick={() => {
        setSelectedTheme(item.value);
      }}
    >
      {item.label}
    </Menu.Item>
  ));

  const handleResetHiddenNews = () => {
    resetHiddenNews();
    showNotification({
      title: "Hidden news reset",
      message: "Dismissed news banners will appear again on the home page.",
    });
  };

  const hiddenNewsNoun = hiddenNewsCount === 1 ? "item" : "items";
  const hiddenNewsPronoun = hiddenNewsCount === 1 ? "it" : "them";
  const hiddenNewsDescription =
    newsMounted && hiddenNewsCount > 0
      ? `You have dismissed ${hiddenNewsCount} news ${hiddenNewsNoun}. Reset to show ${hiddenNewsPronoun} again at the top of the home page.`
      : "Dismissed news banners will reappear at the top of the home page.";

  return (
    <Tabs defaultValue="general">
      <Tabs.List mb="md">
        <Tabs.Tab value="general" leftSection={<IconSettings size={16} />}>
          General
        </Tabs.Tab>
        <Tabs.Tab value="experimental" leftSection={<IconFlask size={16} />}>
          Experimental
        </Tabs.Tab>
        <Tabs.Tab value="reset" leftSection={<IconRefresh size={16} />}>
          Reset
        </Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="general">
        <Text fz="xs" c="dimmed" mt={3} mb="md">
          Choose the language for ESI requests and the UI theme.
        </Text>

        <Group
          justify="space-between"
          className={classes.item}
          wrap="nowrap"
          gap="xl"
        >
          <div>
            <Text>Language</Text>
            <Text size="xs" c="dimmed">
              Used in ESI requests through the `Accept-Language` header
            </Text>
          </div>

          <Menu
            onOpen={() => setLanguageMenuOpened(true)}
            onClose={() => setLanguageMenuOpened(false)}
            radius="md"
            width="target"
          >
            <Menu.Target>
              <UnstyledButton
                className={classes.control}
                data-expanded={languageMenuOpened || undefined}
              >
                <Group gap="xs">
                  <ReactCountryFlag
                    countryCode={selectedLanguage.countryCode}
                    svg
                    className={classes.flag}
                    aria-label={`${selectedLanguage.label} flag`}
                  />
                  <span className={classes.label}>
                    {selectedLanguage.label}
                  </span>
                </Group>
                <IconChevronDown
                  size={16}
                  className={classes.icon}
                  stroke={1.5}
                />
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>{languageItems}</Menu.Dropdown>
          </Menu>
        </Group>

        <Group
          justify="space-between"
          className={classes.item}
          wrap="nowrap"
          gap="xl"
        >
          <div>
            <Text>Theme</Text>
            <Text size="xs" c="dimmed">
              Choose the global UI theme
            </Text>
          </div>

          <Menu
            onOpen={() => setThemeMenuOpened(true)}
            onClose={() => setThemeMenuOpened(false)}
            radius="md"
            width="target"
          >
            <Menu.Target>
              <UnstyledButton
                className={classes.control}
                data-expanded={themeMenuOpened || undefined}
                aria-label="Theme"
              >
                <Group gap="xs">
                  <span className={classes.label}>
                    {selectedThemeOption.label}
                  </span>
                </Group>
                <IconChevronDown
                  size={16}
                  className={classes.icon}
                  stroke={1.5}
                />
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>{themeItems}</Menu.Dropdown>
          </Menu>
        </Group>
      </Tabs.Panel>

      <Tabs.Panel value="experimental">
        <Text fz="xs" c="dimmed" mt={3} mb="md">
          Try out features that are still in development.
        </Text>

        <Group
          justify="space-between"
          className={classes.item}
          wrap="nowrap"
          gap="xl"
        >
          <div>
            <Text>New data tables</Text>
            <Text size="xs" c="dimmed">
              Enable the experimental DataTable components. When on, each table
              shows an engine selector (TanStack or mantine-datatable). When
              off, the classic mantine-react-table is used everywhere.
            </Text>
          </div>
          <Switch
            className={classes.switch}
            checked={experimentalDataTables}
            onChange={(event) =>
              setExperimentalDataTables(event.currentTarget.checked)
            }
            aria-label="Enable experimental data tables"
          />
        </Group>

        <Group
          justify="space-between"
          className={classes.item}
          wrap="nowrap"
          gap="xl"
        >
          <div>
            <Text>New Active Wars page</Text>
            <Text size="xs" c="dimmed">
              Replace the Active Wars table with the redesigned overview —
              headline stats, aggressor and defender leaderboards, and a
              filterable list you can switch between rows and a compact table.
            </Text>
          </div>
          <Switch
            className={classes.switch}
            checked={experimentalActiveWars}
            onChange={(event) =>
              setExperimentalActiveWars(event.currentTarget.checked)
            }
            aria-label="Enable the new Active Wars page"
          />
        </Group>
      </Tabs.Panel>

      <Tabs.Panel value="reset">
        <Text fz="xs" c="dimmed" mt={3} mb="md">
          Restore things you have dismissed.
        </Text>

        <Group
          justify="space-between"
          className={classes.item}
          wrap="nowrap"
          gap="xl"
        >
          <div>
            <Text>Hidden news</Text>
            <Text size="xs" c="dimmed">
              {hiddenNewsDescription}
            </Text>
          </div>

          <Button
            variant="default"
            leftSection={<IconRestore size={16} />}
            disabled={!newsMounted || hiddenNewsCount === 0}
            onClick={handleResetHiddenNews}
          >
            Reset hidden news
          </Button>
        </Group>
      </Tabs.Panel>
    </Tabs>
  );
}
