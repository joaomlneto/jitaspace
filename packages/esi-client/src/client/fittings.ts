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
  DeleteCharactersCharacterIdFittingsFittingIdParams,
  ErrorLimited,
  Forbidden,
  GatewayTimeout,
  GetCharactersCharacterIdFittings200Item,
  GetCharactersCharacterIdFittingsParams,
  InternalServerError,
  PostCharactersCharacterIdFittings201,
  PostCharactersCharacterIdFittingsBody,
  PostCharactersCharacterIdFittingsParams,
  ServiceUnavailable,
  Unauthorized,
} from "./model";

/**
 * Return fittings of a character

---
Alternate route: `/dev/characters/{character_id}/fittings/`

Alternate route: `/v2/characters/{character_id}/fittings/`

---
This route is cached for up to 300 seconds
 * @summary Get fittings
 */
export const getCharactersCharacterIdFittings = (
  characterId: number,
  params?: GetCharactersCharacterIdFittingsParams,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<GetCharactersCharacterIdFittings200Item[]>> => {
  return axios.get(`/characters/${characterId}/fittings/`, {
    ...options,
    params: { ...params, ...options?.params },
  });
};

export const getGetCharactersCharacterIdFittingsKey = (
  characterId: number,
  params?: GetCharactersCharacterIdFittingsParams,
) => [`/characters/${characterId}/fittings/`, ...(params ? [params] : [])];

export type GetCharactersCharacterIdFittingsQueryResult = NonNullable<
  Awaited<ReturnType<typeof getCharactersCharacterIdFittings>>
>;
export type GetCharactersCharacterIdFittingsQueryError = AxiosError<
  | void
  | BadRequest
  | Unauthorized
  | Forbidden
  | ErrorLimited
  | InternalServerError
  | ServiceUnavailable
  | GatewayTimeout
>;

export const useGetCharactersCharacterIdFittings = <
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
  params?: GetCharactersCharacterIdFittingsParams,
  options?: {
    swr?: SWRConfiguration<
      Awaited<ReturnType<typeof getCharactersCharacterIdFittings>>,
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
        ? getGetCharactersCharacterIdFittingsKey(characterId, params)
        : null);
  const swrFn = () =>
    getCharactersCharacterIdFittings(characterId, params, axiosOptions);

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
 * Save a new fitting for a character

---
Alternate route: `/dev/characters/{character_id}/fittings/`

Alternate route: `/v2/characters/{character_id}/fittings/`

 * @summary Create fitting
 */
export const postCharactersCharacterIdFittings = (
  characterId: number,
  postCharactersCharacterIdFittingsBody: PostCharactersCharacterIdFittingsBody,
  params?: PostCharactersCharacterIdFittingsParams,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<PostCharactersCharacterIdFittings201>> => {
  return axios.post(
    `/characters/${characterId}/fittings/`,
    postCharactersCharacterIdFittingsBody,
    {
      ...options,
      params: { ...params, ...options?.params },
    },
  );
};

/**
 * Delete a fitting from a character

---
Alternate route: `/dev/characters/{character_id}/fittings/{fitting_id}/`

Alternate route: `/legacy/characters/{character_id}/fittings/{fitting_id}/`

Alternate route: `/v1/characters/{character_id}/fittings/{fitting_id}/`

 * @summary Delete fitting
 */
export const deleteCharactersCharacterIdFittingsFittingId = (
  characterId: number,
  fittingId: number,
  params?: DeleteCharactersCharacterIdFittingsFittingIdParams,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<void>> => {
  return axios.delete(`/characters/${characterId}/fittings/${fittingId}/`, {
    ...options,
    params: { ...params, ...options?.params },
  });
};