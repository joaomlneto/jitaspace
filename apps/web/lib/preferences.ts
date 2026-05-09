import { create } from "zustand";

export const ESI_ACCEPT_LANGUAGE_STORAGE_KEY = "jitaspace.esi-accept-language";
export const APP_THEME_STORAGE_KEY = "jitaspace.app-theme";

export const DEFAULT_ESI_ACCEPT_LANGUAGE = "en";
export const DEFAULT_APP_THEME = "default";

export const ESI_ACCEPT_LANGUAGE_OPTIONS = [
  { languageCode: "en", label: "English", countryCode: "GB" },
  { languageCode: "de", label: "German", countryCode: "DE" },
  { languageCode: "es", label: "Spanish", countryCode: "ES" },
  { languageCode: "fr", label: "French", countryCode: "FR" },
  { languageCode: "ja", label: "Japanese", countryCode: "JP" },
  { languageCode: "ko", label: "Korean", countryCode: "KR" },
  { languageCode: "ru", label: "Russian", countryCode: "RU" },
  { languageCode: "zh", label: "Chinese", countryCode: "CN" },
] as const;

export const APP_THEME_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "eve", label: "EVE" },
  { value: "amarr", label: "Amarr" },
  { value: "caldari", label: "Caldari" },
  { value: "gallente", label: "Gallente" },
  { value: "minmatar", label: "Minmatar" },
] as const;

export type EsiAcceptLanguage =
  (typeof ESI_ACCEPT_LANGUAGE_OPTIONS)[number]["languageCode"];
export type AppTheme = (typeof APP_THEME_OPTIONS)[number]["value"];

type PreferencesState = {
  esiAcceptLanguage: EsiAcceptLanguage;
  appTheme: AppTheme;
  hydrateFromStorage: () => void;
  setEsiAcceptLanguage: (value: EsiAcceptLanguage) => void;
  setAppTheme: (value: AppTheme) => void;
};

export const sanitizeAppTheme = (
  value: string | null | undefined,
): AppTheme | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValue = value.trim().toLowerCase();

  const themeOption = APP_THEME_OPTIONS.find(
    (item) => item.value === normalizedValue,
  );

  return themeOption?.value;
};

export const getStoredEsiAcceptLanguage = (): EsiAcceptLanguage | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }

  const value = window.localStorage.getItem(ESI_ACCEPT_LANGUAGE_STORAGE_KEY);

  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValue = value.trim().toLowerCase();

  const languageOption = ESI_ACCEPT_LANGUAGE_OPTIONS.find(
    (item) => item.languageCode === normalizedValue,
  );

  return languageOption?.languageCode;
};

export const getStoredAppTheme = (): AppTheme | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }

  return sanitizeAppTheme(window.localStorage.getItem(APP_THEME_STORAGE_KEY));
};

const getHydratedPreferences = () => {
  return {
    esiAcceptLanguage:
      getStoredEsiAcceptLanguage() ?? DEFAULT_ESI_ACCEPT_LANGUAGE,
    appTheme: getStoredAppTheme() ?? DEFAULT_APP_THEME,
  };
};

const writePreferencesToStorage = (
  key: typeof ESI_ACCEPT_LANGUAGE_STORAGE_KEY | typeof APP_THEME_STORAGE_KEY,
  value: string,
) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, value);
};

export const usePreferencesStore = create<PreferencesState>((set) => {
  return {
    ...getHydratedPreferences(),
    hydrateFromStorage: () => {
      if (typeof window === "undefined") {
        return;
      }

      set(getHydratedPreferences());
    },
    setEsiAcceptLanguage: (value) => {
      set({ esiAcceptLanguage: value });
      writePreferencesToStorage(ESI_ACCEPT_LANGUAGE_STORAGE_KEY, value);
    },
    setAppTheme: (value) => {
      set({ appTheme: value });
      writePreferencesToStorage(APP_THEME_STORAGE_KEY, value);
    },
  };
});

export const setStoredEsiAcceptLanguage = (value: EsiAcceptLanguage) => {
  usePreferencesStore.getState().setEsiAcceptLanguage(value);
};

export const setStoredAppTheme = (value: AppTheme) => {
  usePreferencesStore.getState().setAppTheme(value);
};
