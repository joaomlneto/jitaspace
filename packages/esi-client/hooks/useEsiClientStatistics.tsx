import {
  createContext,
  memo,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import axios from "axios";

type EsiClientStatistics = {
  esiErrorsRemaining?: number;
  esiErrorsResetOn?: Date;
  setEsiErrorInfo: (remaining: number, reset: number) => void;
};

const defaultEsiClientStatistics: EsiClientStatistics = {
  setEsiErrorInfo: () => {
    return;
  },
};

const EsiClientStatistics = createContext<EsiClientStatistics>(
  defaultEsiClientStatistics,
);
export const EsiClientStatisticsProvider = memo(
  ({ children }: PropsWithChildren) => {
    console.log("rerendering esi client STATISTICS provider");

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
        if (remaining) setEsiErrorsRemaining(parseInt(remaining));
        // @ts-expect-error type of res.headers.get not detected as function?
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const reset: string | undefined = res.headers.get(
          "x-esi-error-limit-reset",
        );
        if (reset) setEsiErrorsResetOn(new Date(parseInt(reset) * 1000));
        //console.log({ remaining, reset });
        return res;
      });
    }, []);

    return (
      <EsiClientStatistics.Provider
        value={{
          esiErrorsRemaining,
          esiErrorsResetOn,
          setEsiErrorInfo: () => {
            return;
          },
        }}
      >
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
