"use client";

import type { PropsWithChildren } from "react";
import {
  createContext,
  memo,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";

type EsiClientStatistics = {
  esiErrorsRemaining?: number;
  esiErrorsResetOn?: Date;
  setEsiErrorInfo: (remaining: number, reset: number) => void;
};

const defaultEsiClientStatistics: EsiClientStatistics = {
  setEsiErrorInfo: () => {},
};

const EsiClientStatistics = createContext<EsiClientStatistics>(
  defaultEsiClientStatistics,
);
export const EsiClientStatisticsProvider = memo(
  ({ children }: PropsWithChildren) => {
    const [esiErrorsRemaining, setEsiErrorsRemaining] = useState<number>(100);
    const [esiErrorsResetOn, setEsiErrorsResetOn] = useState<Date | undefined>(
      new Date(),
    );

    useEffect(() => {
      axios.interceptors.response.use((res) => {
        // @ts-expect-error type of res.headers.get not detected as function?
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const remaining: string | undefined = res.headers.get(
          "x-esi-error-limit-remain",
        );
        if (remaining) setEsiErrorsRemaining(Number.parseInt(remaining, 10));
        // @ts-expect-error type of res.headers.get not detected as function?
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const reset: string | undefined = res.headers.get(
          "x-esi-error-limit-reset",
        );
        if (reset)
          setEsiErrorsResetOn(new Date(Number.parseInt(reset, 10) * 1000));
        return res;
      });
    }, []);

    const value = useMemo<EsiClientStatistics>(
      () => ({
        esiErrorsRemaining,
        esiErrorsResetOn,
        setEsiErrorInfo: () => {},
      }),
      [esiErrorsRemaining, esiErrorsResetOn],
    );

    return (
      <EsiClientStatistics.Provider value={value}>
        {children}
      </EsiClientStatistics.Provider>
    );
  },
);
EsiClientStatisticsProvider.displayName = "EsiClientStatisticsProvider";

export function useEsiClientStatistics() {
  const ctx = useContext(EsiClientStatistics);

  if (!ctx) {
    throw new Error(
      "[@jitaspace/esi-client] EsiClientStatisticsProvider was not found in tree",
    );
  }

  return ctx;
}
