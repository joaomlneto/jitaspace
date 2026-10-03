import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const ESI_ACCEPT_LANGUAGE_STORAGE_KEY = "jitaspace.esi-accept-language";
export const APP_THEME_STORAGE_KEY = "jitaspace.app-theme";
export const PREFERENCES_STORAGE_KEY = "jitaspace.preferences";

export const DEFAULT_ESI_ACCEPT_LANGUAGE = "en";
export const DEFAULT_APP_THEME = "default";
export const DEFAULT_DATA_TABLE_ENGINE = "tanstack";

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
  { value: "eve_v2", label: "EVE v2" },
  { value: "amarr", label: "Amarr" },
  { value: "caldari", label: "Caldari" },
  { value: "gallente", label: "Gallente" },
  { value: "minmatar", label: "Minmatar" },
  { value: "whpd", label: "WHPD" },
] as const;

/** The engines every data table can render with (`~/components/DataTable`). */
export const DATA_TABLE_ENGINE_OPTIONS = [
  { value: "tanstack", label: "TanStack" },
  { value: "mantine-datatable", label: "mantine-datatable" },
] as const;

export type EsiAcceptLanguage =
  (typeof ESI_ACCEPT_LANGUAGE_OPTIONS)[number]["languageCode"];
export type AppTheme = (typeof APP_THEME_OPTIONS)[number]["value"];
export type DataTableEngine =
  (typeof DATA_TABLE_ENGINE_OPTIONS)[number]["value"];

interface PreferencesState {
  esiAcceptLanguage: EsiAcceptLanguage;
  appTheme: AppTheme;
  dataTableEngine: DataTableEngine;
  setEsiAcceptLanguage: (value: EsiAcceptLanguage) => void;
  setAppTheme: (value: AppTheme) => void;
  setDataTableEngine: (value: DataTableEngine) => void;
}

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

const sanitizeDataTableEngine = (value: unknown): DataTableEngine | undefined =>
  DATA_TABLE_ENGINE_OPTIONS.find((item) => item.value === value)?.value;

const sanitizeEsiAcceptLanguage = (
  value: string | null | undefined,
): EsiAcceptLanguage | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValue = value.trim().toLowerCase();

  return ESI_ACCEPT_LANGUAGE_OPTIONS.find(
    (item) => item.languageCode === normalizedValue,
  )?.languageCode;
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      esiAcceptLanguage: DEFAULT_ESI_ACCEPT_LANGUAGE,
      appTheme: DEFAULT_APP_THEME,
      dataTableEngine: DEFAULT_DATA_TABLE_ENGINE,
      setEsiAcceptLanguage: (value) => set({ esiAcceptLanguage: value }),
      setAppTheme: (value) => set({ appTheme: value }),
      setDataTableEngine: (value) => set({ dataTableEngine: value }),
    }),
    {
      name: PREFERENCES_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<PreferencesState>;
        return {
          ...currentState,
          esiAcceptLanguage:
            sanitizeEsiAcceptLanguage(persisted.esiAcceptLanguage) ??
            DEFAULT_ESI_ACCEPT_LANGUAGE,
          appTheme: sanitizeAppTheme(persisted.appTheme) ?? DEFAULT_APP_THEME,
          dataTableEngine:
            sanitizeDataTableEngine(persisted.dataTableEngine) ??
            DEFAULT_DATA_TABLE_ENGINE,
        };
      },
    },
  ),
);

export const setStoredEsiAcceptLanguage = (value: EsiAcceptLanguage) => {
  usePreferencesStore.getState().setEsiAcceptLanguage(value);
};

export const setStoredAppTheme = (value: AppTheme) => {
  usePreferencesStore.getState().setAppTheme(value);
};
