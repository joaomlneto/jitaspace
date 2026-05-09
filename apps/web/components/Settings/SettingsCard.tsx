"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Group, Menu, Text, UnstyledButton } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import ReactCountryFlag from "react-country-flag";

import { setAcceptLanguage } from "@jitaspace/esi-client";

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
  const hydrateFromStorage = usePreferencesStore(
    (state) => state.hydrateFromStorage,
  );
  const setSelectedAcceptLanguage = usePreferencesStore(
    (state) => state.setEsiAcceptLanguage,
  );
  const setSelectedTheme = usePreferencesStore((state) => state.setAppTheme);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  useEffect(() => {
    setAcceptLanguage(acceptLanguage);
  }, [acceptLanguage]);

  const selectedLanguage = useMemo(
    () =>
      ESI_ACCEPT_LANGUAGE_OPTIONS.find(
        (item) => item.value === acceptLanguage,
      ) ?? ESI_ACCEPT_LANGUAGE_OPTIONS[0],
    [acceptLanguage],
  );

  const languageItems = ESI_ACCEPT_LANGUAGE_OPTIONS.map((item) => (
    <Menu.Item
      key={item.value}
      onClick={() => {
        setSelectedAcceptLanguage(item.value);
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

  return (
    <Card withBorder radius="md" p="xl" className={classes.card}>
      <Text fz="lg" className={classes.title} fw={500}>
        Configure settings
      </Text>
      <Text fz="xs" c="dimmed" mt={3} mb="xl">
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
                <span className={classes.label}>{selectedLanguage.label}</span>
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
    </Card>
  );
}
