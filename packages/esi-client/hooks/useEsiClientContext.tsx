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

import { type ESIScope } from "../scopes";
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
  /*setAccessToken: () => {
    return;
  },
  setLoading: () => {
    return;
  },*/
  setAuth: () => {
    return;
  },
  scopes: [],
  isTokenValid: false,
};

const ESI_BASE_URL = "https://esi.evetech.net/latest";

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

    // Set the URL for the API server
    // https://orval.dev/guides/set-base-url
    // FIXME: THIS SHOULD BE MOVED INTO AN INSTANCE OF AXIOS, NOT THE GLOBAL ONE!
    axios.defaults.baseURL = ESI_BASE_URL;

    useEffect(() => {
      if (auth.accessToken) {
        console.log("injecting token in ESI Client");
        axios.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${auth.accessToken}`;
        setLoading(false);
      }
    }, [auth.accessToken]);

    const characterId = useMemo(
      () => (characterIdStr ? parseInt(characterIdStr) : undefined),
      [characterIdStr],
    );

    return (
      <EsiClientContext.Provider
        value={{
          loading: auth.loading,
          accessToken: auth.accessToken,
          characterId,
          characterName: tokenPayload?.name,
          scopes: tokenPayload?.scp ?? [],
          expires: tokenPayload?.exp,
          tokenExpirationDate,
          //setAccessToken
          isTokenValid: !loading && auth.accessToken !== undefined,
          //setLoading,
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
