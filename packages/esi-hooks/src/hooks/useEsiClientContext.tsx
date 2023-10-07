import {
  createContext,
  memo,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import axios from "axios";

import { type ESIScope } from "@jitaspace/esi-client-kubb";

import { getEveSsoAccessTokenPayload } from "../utils";


type EsiClientContext = {
  loading: boolean;
  characterId?: number;
  characterName?: string;
  accessToken?: string;
  scopes: ESIScope[];
  expires?: number;
  tokenExpirationDate?: Date;
  isTokenValid: boolean;
  //setAccessToken: (accessToken?: string) => void;
  //setLoading: (loading: boolean) => void;
  setAuth: ({
    accessToken,
    loading,
  }: {
    accessToken?: string;
    loading: boolean;
  }) => void;
};

const defaultEsiClientContext: EsiClientContext = {
  loading: true,
  setAuth: () => {
    return;
  },
  scopes: [],
  isTokenValid: false,
};

const EsiClientContext = createContext<EsiClientContext>(
  defaultEsiClientContext,
);
export const EsiClientContextProvider = memo(
  (props: PropsWithChildren<{ accessToken?: string }>) => {
    const [loading, setLoading] = useState<boolean>(true);

    const [auth, setAuth] = useState<{
      accessToken?: string;
      loading: boolean;
    }>({ accessToken: props.accessToken, loading: false });

    const tokenPayload = useMemo(
      () => getEveSsoAccessTokenPayload(auth.accessToken),
      [auth.accessToken],
    );

    const characterIdStr = useMemo(
      () => tokenPayload?.sub.split(":")[2],
      [tokenPayload],
    );

    const tokenExpirationDate = useMemo(
      () => (tokenPayload?.exp ? new Date(tokenPayload.exp * 1000) : undefined),
      [tokenPayload],
    );

    // FIXME: MAKE TOKEN_VALID RETURN FALSE WHEN THE TOKEN EXPIRES

    useEffect(() => {
      if (auth.accessToken) {
        //console.log("injecting token in ESI Client");
        axios.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${auth.accessToken}`;
        /*axios.defaults.headers.common["User-Agent"] =
          "https://www.jita.space - Joao Neto";*/
        setLoading(false);
      }
    }, [auth.accessToken]);

    return (
      <EsiClientContext.Provider
        value={{
          loading: auth.loading,
          accessToken: auth.accessToken,
          characterId: characterIdStr ? parseInt(characterIdStr) : undefined,
          characterName: tokenPayload?.name,
          scopes: tokenPayload?.scp ?? [],
          expires: tokenPayload?.exp,
          tokenExpirationDate,
          isTokenValid: !loading && auth.accessToken !== undefined,
          setAuth,
        }}
      >
        {props.children}
      </EsiClientContext.Provider>
    );
  },
);
EsiClientContextProvider.displayName = "EsiClientContextProvider";

export function useEsiClientContext() {
  const ctx = useContext(EsiClientContext);

  if (!ctx) {
    throw new Error(
      "[@jitaspace/esi-client] EsiClientContextProvider was not found in tree",
    );
  }

  return ctx;
}
