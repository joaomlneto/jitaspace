/**
 * Generated by orval v6.11.1 🍺
 * Do not edit manually.
 * EVE Swagger Interface
 * An OpenAPI for EVE Online
 * OpenAPI spec version: 1.17
 */
import type { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import axios from "axios";
import type { Key, SWRConfiguration } from "swr";
import useSwr from "swr";

import type {
  BadRequest,
  DeleteCharactersCharacterIdContactsParams,
  ErrorLimited,
  Forbidden,
  GatewayTimeout,
  GetAlliancesAllianceIdContacts200Item,
  GetAlliancesAllianceIdContactsLabels200Item,
  GetAlliancesAllianceIdContactsLabelsParams,
  GetAlliancesAllianceIdContactsParams,
  GetCharactersCharacterIdContacts200Item,
  GetCharactersCharacterIdContactsLabels200Item,
  GetCharactersCharacterIdContactsLabelsParams,
  GetCharactersCharacterIdContactsParams,
  GetCorporationsCorporationIdContacts200Item,
  GetCorporationsCorporationIdContactsLabels200Item,
  GetCorporationsCorporationIdContactsLabelsParams,
  GetCorporationsCorporationIdContactsParams,
  InternalServerError,
  PostCharactersCharacterIdContactsParams,
  PutCharactersCharacterIdContactsParams,
  ServiceUnavailable,
  Unauthorized,
} from "./model";

/**
 * Return contacts of an alliance

---
Alternate route: `/dev/alliances/{alliance_id}/contacts/`

Alternate route: `/v2/alliances/{alliance_id}/contacts/`

---
This route is cached for up to 300 seconds
 * @summary Get alliance contacts
 */
export const getAlliancesAllianceIdContacts = (
  allianceId: number,
  params?: GetAlliancesAllianceIdContactsParams,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<GetAlliancesAllianceIdContacts200Item[]>> => {
  return axios.get(`/alliances/${allianceId}/contacts/`, {
    ...options,
    params: { ...params, ...options?.params },
  });
};

export const getGetAlliancesAllianceIdContactsKey = (
  allianceId: number,
  params?: GetAlliancesAllianceIdContactsParams,
) => [`/alliances/${allianceId}/contacts/`, ...(params ? [params] : [])];

export type GetAlliancesAllianceIdContactsQueryResult = NonNullable<
  Awaited<ReturnType<typeof getAlliancesAllianceIdContacts>>
>;
export type GetAlliancesAllianceIdContactsQueryError = AxiosError<
  | void
  | BadRequest
  | Unauthorized
  | Forbidden
  | ErrorLimited
  | InternalServerError
  | ServiceUnavailable
  | GatewayTimeout
>;

export const useGetAlliancesAllianceIdContacts = <
  TError = AxiosError<
    | void
    | BadRequest
    | Unauthorized
    | Forbidden
    | ErrorLimited
    | InternalServerError
    | ServiceUnavailable
    | GatewayTimeout
  >,
>(
  allianceId: number,
  params?: GetAlliancesAllianceIdContactsParams,
  options?: {
    swr?: SWRConfiguration<
      Awaited<ReturnType<typeof getAlliancesAllianceIdContacts>>,
      TError
    > & { swrKey?: Key; enabled?: boolean };
    axios?: AxiosRequestConfig;
  },
) => {
  const { swr: swrOptions, axios: axiosOptions } = options ?? {};

  const isEnabled = swrOptions?.enabled !== false && !!allianceId;
  const swrKey =
    swrOptions?.swrKey ??
    (() =>
      isEnabled
        ? getGetAlliancesAllianceIdContactsKey(allianceId, params)
        : null);
  const swrFn = () =>
    getAlliancesAllianceIdContacts(allianceId, params, axiosOptions);

  const query = useSwr<Awaited<ReturnType<typeof swrFn>>, TError>(
    swrKey,
    swrFn,
    swrOptions,
  );

  return {
    swrKey,
    ...query,
  };
};

/**
 * Return custom labels for an alliance's contacts

---
Alternate route: `/dev/alliances/{alliance_id}/contacts/labels/`

Alternate route: `/legacy/alliances/{alliance_id}/contacts/labels/`

Alternate route: `/v1/alliances/{alliance_id}/contacts/labels/`

---
This route is cached for up to 300 seconds
 * @summary Get alliance contact labels
 */
export const getAlliancesAllianceIdContactsLabels = (
  allianceId: number,
  params?: GetAlliancesAllianceIdContactsLabelsParams,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<GetAlliancesAllianceIdContactsLabels200Item[]>> => {
  return axios.get(`/alliances/${allianceId}/contacts/labels/`, {
    ...options,
    params: { ...params, ...options?.params },
  });
};

export const getGetAlliancesAllianceIdContactsLabelsKey = (
  allianceId: number,
  params?: GetAlliancesAllianceIdContactsLabelsParams,
) => [`/alliances/${allianceId}/contacts/labels/`, ...(params ? [params] : [])];

export type GetAlliancesAllianceIdContactsLabelsQueryResult = NonNullable<
  Awaited<ReturnType<typeof getAlliancesAllianceIdContactsLabels>>
>;
export type GetAlliancesAllianceIdContactsLabelsQueryError = AxiosError<
  | void
  | BadRequest
  | Unauthorized
  | Forbidden
  | ErrorLimited
  | InternalServerError
  | ServiceUnavailable
  | GatewayTimeout
>;

export const useGetAlliancesAllianceIdContactsLabels = <
  TError = AxiosError<
    | void
    | BadRequest
    | Unauthorized
    | Forbidden
    | ErrorLimited
    | InternalServerError
    | ServiceUnavailable
    | GatewayTimeout
  >,
>(
  allianceId: number,
  params?: GetAlliancesAllianceIdContactsLabelsParams,
  options?: {
    swr?: SWRConfiguration<
      Awaited<ReturnType<typeof getAlliancesAllianceIdContactsLabels>>,
      TError
    > & { swrKey?: Key; enabled?: boolean };
    axios?: AxiosRequestConfig;
  },
) => {
  const { swr: swrOptions, axios: axiosOptions } = options ?? {};

  const isEnabled = swrOptions?.enabled !== false && !!allianceId;
  const swrKey =
    swrOptions?.swrKey ??
    (() =>
      isEnabled
        ? getGetAlliancesAllianceIdContactsLabelsKey(allianceId, params)
        : null);
  const swrFn = () =>
    getAlliancesAllianceIdContactsLabels(allianceId, params, axiosOptions);

  const query = useSwr<Awaited<ReturnType<typeof swrFn>>, TError>(
    swrKey,
    swrFn,
    swrOptions,
  );

  return {
    swrKey,
    ...query,
  };
};

/**
 * Bulk delete contacts

---
Alternate route: `/dev/characters/{character_id}/contacts/`

Alternate route: `/v2/characters/{character_id}/contacts/`

 * @summary Delete contacts
 */
export const deleteCharactersCharacterIdContacts = (
  characterId: number,
  params: DeleteCharactersCharacterIdContactsParams,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<void>> => {
  return axios.delete(`/characters/${characterId}/contacts/`, {
    ...options,
    params: { ...params, ...options?.params },
  });
};

/**
 * Return contacts of a character

---
Alternate route: `/dev/characters/{character_id}/contacts/`

Alternate route: `/v2/characters/{character_id}/contacts/`

---
This route is cached for up to 300 seconds
 * @summary Get contacts
 */
export const getCharactersCharacterIdContacts = (
  characterId: number,
  params?: GetCharactersCharacterIdContactsParams,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<GetCharactersCharacterIdContacts200Item[]>> => {
  return axios.get(`/characters/${characterId}/contacts/`, {
    ...options,
    params: { ...params, ...options?.params },
  });
};

export const getGetCharactersCharacterIdContactsKey = (
  characterId: number,
  params?: GetCharactersCharacterIdContactsParams,
) => [`/characters/${characterId}/contacts/`, ...(params ? [params] : [])];

export type GetCharactersCharacterIdContactsQueryResult = NonNullable<
  Awaited<ReturnType<typeof getCharactersCharacterIdContacts>>
>;
export type GetCharactersCharacterIdContactsQueryError = AxiosError<
  | void
  | BadRequest
  | Unauthorized
  | Forbidden
  | ErrorLimited
  | InternalServerError
  | ServiceUnavailable
  | GatewayTimeout
>;

export const useGetCharactersCharacterIdContacts = <
  TError = AxiosError<
    | void
    | BadRequest
    | Unauthorized
    | Forbidden
    | ErrorLimited
    | InternalServerError
    | ServiceUnavailable
    | GatewayTimeout
  >,
>(
  characterId: number,
  params?: GetCharactersCharacterIdContactsParams,
  options?: {
    swr?: SWRConfiguration<
      Awaited<ReturnType<typeof getCharactersCharacterIdContacts>>,
      TError
    > & { swrKey?: Key; enabled?: boolean };
    axios?: AxiosRequestConfig;
  },
) => {
  const { swr: swrOptions, axios: axiosOptions } = options ?? {};

  const isEnabled = swrOptions?.enabled !== false && !!characterId;
  const swrKey =
    swrOptions?.swrKey ??
    (() =>
      isEnabled
        ? getGetCharactersCharacterIdContactsKey(characterId, params)
        : null);
  const swrFn = () =>
    getCharactersCharacterIdContacts(characterId, params, axiosOptions);

  const query = useSwr<Awaited<ReturnType<typeof swrFn>>, TError>(
    swrKey,
    swrFn,
    swrOptions,
  );

  return {
    swrKey,
    ...query,
  };
};

/**
 * Bulk add contacts with same settings

---
Alternate route: `/dev/characters/{character_id}/contacts/`

Alternate route: `/v2/characters/{character_id}/contacts/`

 * @summary Add contacts
 */
export const postCharactersCharacterIdContacts = (
  characterId: number,
  postCharactersCharacterIdContactsBody: number[],
  params: PostCharactersCharacterIdContactsParams,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<number[]>> => {
  return axios.post(
    `/characters/${characterId}/contacts/`,
    postCharactersCharacterIdContactsBody,
    {
      ...options,
      params: { ...params, ...options?.params },
    },
  );
};

/**
 * Bulk edit contacts with same settings

---
Alternate route: `/dev/characters/{character_id}/contacts/`

Alternate route: `/v2/characters/{character_id}/contacts/`

 * @summary Edit contacts
 */
export const putCharactersCharacterIdContacts = (
  characterId: number,
  putCharactersCharacterIdContactsBody: number[],
  params: PutCharactersCharacterIdContactsParams,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<void>> => {
  return axios.put(
    `/characters/${characterId}/contacts/`,
    putCharactersCharacterIdContactsBody,
    {
      ...options,
      params: { ...params, ...options?.params },
    },
  );
};

/**
 * Return custom labels for a character's contacts

---
Alternate route: `/dev/characters/{character_id}/contacts/labels/`

Alternate route: `/legacy/characters/{character_id}/contacts/labels/`

Alternate route: `/v1/characters/{character_id}/contacts/labels/`

---
This route is cached for up to 300 seconds
 * @summary Get contact labels
 */
export const getCharactersCharacterIdContactsLabels = (
  characterId: number,
  params?: GetCharactersCharacterIdContactsLabelsParams,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<GetCharactersCharacterIdContactsLabels200Item[]>> => {
  return axios.get(`/characters/${characterId}/contacts/labels/`, {
    ...options,
    params: { ...params, ...options?.params },
  });
};

export const getGetCharactersCharacterIdContactsLabelsKey = (
  characterId: number,
  params?: GetCharactersCharacterIdContactsLabelsParams,
) => [
  `/characters/${characterId}/contacts/labels/`,
  ...(params ? [params] : []),
];

export type GetCharactersCharacterIdContactsLabelsQueryResult = NonNullable<
  Awaited<ReturnType<typeof getCharactersCharacterIdContactsLabels>>
>;
export type GetCharactersCharacterIdContactsLabelsQueryError = AxiosError<
  | void
  | BadRequest
  | Unauthorized
  | Forbidden
  | ErrorLimited
  | InternalServerError
  | ServiceUnavailable
  | GatewayTimeout
>;

export const useGetCharactersCharacterIdContactsLabels = <
  TError = AxiosError<
    | void
    | BadRequest
    | Unauthorized
    | Forbidden
    | ErrorLimited
    | InternalServerError
    | ServiceUnavailable
    | GatewayTimeout
  >,
>(
  characterId: number,
  params?: GetCharactersCharacterIdContactsLabelsParams,
  options?: {
    swr?: SWRConfiguration<
      Awaited<ReturnType<typeof getCharactersCharacterIdContactsLabels>>,
      TError
    > & { swrKey?: Key; enabled?: boolean };
    axios?: AxiosRequestConfig;
  },
) => {
  const { swr: swrOptions, axios: axiosOptions } = options ?? {};

  const isEnabled = swrOptions?.enabled !== false && !!characterId;
  const swrKey =
    swrOptions?.swrKey ??
    (() =>
      isEnabled
        ? getGetCharactersCharacterIdContactsLabelsKey(characterId, params)
        : null);
  const swrFn = () =>
    getCharactersCharacterIdContactsLabels(characterId, params, axiosOptions);

  const query = useSwr<Awaited<ReturnType<typeof swrFn>>, TError>(
    swrKey,
    swrFn,
    swrOptions,
  );

  return {
    swrKey,
    ...query,
  };
};

/**
 * Return contacts of a corporation

---
Alternate route: `/dev/corporations/{corporation_id}/contacts/`

Alternate route: `/v2/corporations/{corporation_id}/contacts/`

---
This route is cached for up to 300 seconds
 * @summary Get corporation contacts
 */
export const getCorporationsCorporationIdContacts = (
  corporationId: number,
  params?: GetCorporationsCorporationIdContactsParams,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<GetCorporationsCorporationIdContacts200Item[]>> => {
  return axios.get(`/corporations/${corporationId}/contacts/`, {
    ...options,
    params: { ...params, ...options?.params },
  });
};

export const getGetCorporationsCorporationIdContactsKey = (
  corporationId: number,
  params?: GetCorporationsCorporationIdContactsParams,
) => [`/corporations/${corporationId}/contacts/`, ...(params ? [params] : [])];

export type GetCorporationsCorporationIdContactsQueryResult = NonNullable<
  Awaited<ReturnType<typeof getCorporationsCorporationIdContacts>>
>;
export type GetCorporationsCorporationIdContactsQueryError = AxiosError<
  | void
  | BadRequest
  | Unauthorized
  | Forbidden
  | ErrorLimited
  | InternalServerError
  | ServiceUnavailable
  | GatewayTimeout
>;

export const useGetCorporationsCorporationIdContacts = <
  TError = AxiosError<
    | void
    | BadRequest
    | Unauthorized
    | Forbidden
    | ErrorLimited
    | InternalServerError
    | ServiceUnavailable
    | GatewayTimeout
  >,
>(
  corporationId: number,
  params?: GetCorporationsCorporationIdContactsParams,
  options?: {
    swr?: SWRConfiguration<
      Awaited<ReturnType<typeof getCorporationsCorporationIdContacts>>,
      TError
    > & { swrKey?: Key; enabled?: boolean };
    axios?: AxiosRequestConfig;
  },
) => {
  const { swr: swrOptions, axios: axiosOptions } = options ?? {};

  const isEnabled = swrOptions?.enabled !== false && !!corporationId;
  const swrKey =
    swrOptions?.swrKey ??
    (() =>
      isEnabled
        ? getGetCorporationsCorporationIdContactsKey(corporationId, params)
        : null);
  const swrFn = () =>
    getCorporationsCorporationIdContacts(corporationId, params, axiosOptions);

  const query = useSwr<Awaited<ReturnType<typeof swrFn>>, TError>(
    swrKey,
    swrFn,
    swrOptions,
  );

  return {
    swrKey,
    ...query,
  };
};

/**
 * Return custom labels for a corporation's contacts

---
Alternate route: `/dev/corporations/{corporation_id}/contacts/labels/`

Alternate route: `/legacy/corporations/{corporation_id}/contacts/labels/`

Alternate route: `/v1/corporations/{corporation_id}/contacts/labels/`

---
This route is cached for up to 300 seconds
 * @summary Get corporation contact labels
 */
export const getCorporationsCorporationIdContactsLabels = (
  corporationId: number,
  params?: GetCorporationsCorporationIdContactsLabelsParams,
  options?: AxiosRequestConfig,
): Promise<
  AxiosResponse<GetCorporationsCorporationIdContactsLabels200Item[]>
> => {
  return axios.get(`/corporations/${corporationId}/contacts/labels/`, {
    ...options,
    params: { ...params, ...options?.params },
  });
};

export const getGetCorporationsCorporationIdContactsLabelsKey = (
  corporationId: number,
  params?: GetCorporationsCorporationIdContactsLabelsParams,
) => [
  `/corporations/${corporationId}/contacts/labels/`,
  ...(params ? [params] : []),
];

export type GetCorporationsCorporationIdContactsLabelsQueryResult = NonNullable<
  Awaited<ReturnType<typeof getCorporationsCorporationIdContactsLabels>>
>;
export type GetCorporationsCorporationIdContactsLabelsQueryError = AxiosError<
  | void
  | BadRequest
  | Unauthorized
  | Forbidden
  | ErrorLimited
  | InternalServerError
  | ServiceUnavailable
  | GatewayTimeout
>;

export const useGetCorporationsCorporationIdContactsLabels = <
  TError = AxiosError<
    | void
    | BadRequest
    | Unauthorized
    | Forbidden
    | ErrorLimited
    | InternalServerError
    | ServiceUnavailable
    | GatewayTimeout
  >,
>(
  corporationId: number,
  params?: GetCorporationsCorporationIdContactsLabelsParams,
  options?: {
    swr?: SWRConfiguration<
      Awaited<ReturnType<typeof getCorporationsCorporationIdContactsLabels>>,
      TError
    > & { swrKey?: Key; enabled?: boolean };
    axios?: AxiosRequestConfig;
  },
) => {
  const { swr: swrOptions, axios: axiosOptions } = options ?? {};

  const isEnabled = swrOptions?.enabled !== false && !!corporationId;
  const swrKey =
    swrOptions?.swrKey ??
    (() =>
      isEnabled
        ? getGetCorporationsCorporationIdContactsLabelsKey(
            corporationId,
            params,
          )
        : null);
  const swrFn = () =>
    getCorporationsCorporationIdContactsLabels(
      corporationId,
      params,
      axiosOptions,
    );

  const query = useSwr<Awaited<ReturnType<typeof swrFn>>, TError>(
    swrKey,
    swrFn,
    swrOptions,
  );

  return {
    swrKey,
    ...query,
  };
};