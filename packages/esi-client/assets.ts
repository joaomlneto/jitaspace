/**
 * Generated by orval v6.11.1 🍺
 * Do not edit manually.
 * EVE Swagger Interface
 * An OpenAPI for EVE Online
 * OpenAPI spec version: 1.17
 */
import axios from 'axios'
import type {
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError
} from 'axios'
import useSwr from 'swr'
import type {
  SWRConfiguration,
  Key
} from 'swr'
import type {
  GetCharactersCharacterIdAssets200Item,
  BadRequest,
  Unauthorized,
  Forbidden,
  GetCharactersCharacterIdAssets404,
  ErrorLimited,
  InternalServerError,
  ServiceUnavailable,
  GatewayTimeout,
  GetCharactersCharacterIdAssetsParams,
  PostCharactersCharacterIdAssetsLocations200Item,
  PostCharactersCharacterIdAssetsLocationsParams,
  PostCharactersCharacterIdAssetsNames200Item,
  PostCharactersCharacterIdAssetsNamesParams,
  GetCorporationsCorporationIdAssets200Item,
  GetCorporationsCorporationIdAssetsParams,
  PostCorporationsCorporationIdAssetsLocations200Item,
  PostCorporationsCorporationIdAssetsLocationsParams,
  PostCorporationsCorporationIdAssetsNames200Item,
  PostCorporationsCorporationIdAssetsNamesParams
} from './model'



  
  /**
 * Return a list of the characters assets

---
Alternate route: `/dev/characters/{character_id}/assets/`

Alternate route: `/v5/characters/{character_id}/assets/`

---
This route is cached for up to 3600 seconds
 * @summary Get character assets
 */
export const getCharactersCharacterIdAssets = (
    characterId: number,
    params?: GetCharactersCharacterIdAssetsParams, options?: AxiosRequestConfig
 ): Promise<AxiosResponse<GetCharactersCharacterIdAssets200Item[]>> => {
    return axios.get(
      `/characters/${characterId}/assets/`,{
    ...options,
        params: {...params, ...options?.params},}
    );
  }


export const getGetCharactersCharacterIdAssetsKey = (characterId: number,
    params?: GetCharactersCharacterIdAssetsParams,) => [`/characters/${characterId}/assets/`, ...(params ? [params]: [])];

    
export type GetCharactersCharacterIdAssetsQueryResult = NonNullable<Awaited<ReturnType<typeof getCharactersCharacterIdAssets>>>
export type GetCharactersCharacterIdAssetsQueryError = AxiosError<void | BadRequest | Unauthorized | Forbidden | GetCharactersCharacterIdAssets404 | ErrorLimited | InternalServerError | ServiceUnavailable | GatewayTimeout>

export const useGetCharactersCharacterIdAssets = <TError = AxiosError<void | BadRequest | Unauthorized | Forbidden | GetCharactersCharacterIdAssets404 | ErrorLimited | InternalServerError | ServiceUnavailable | GatewayTimeout>>(
 characterId: number,
    params?: GetCharactersCharacterIdAssetsParams, options?: { swr?:SWRConfiguration<Awaited<ReturnType<typeof getCharactersCharacterIdAssets>>, TError> & { swrKey?: Key, enabled?: boolean }, axios?: AxiosRequestConfig }

  ) => {

  const {swr: swrOptions, axios: axiosOptions} = options ?? {}

  const isEnabled = swrOptions?.enabled !== false && !!(characterId)
    const swrKey = swrOptions?.swrKey ?? (() => isEnabled ? getGetCharactersCharacterIdAssetsKey(characterId,params) : null);
  const swrFn = () => getCharactersCharacterIdAssets(characterId,params, axiosOptions);

  const query = useSwr<Awaited<ReturnType<typeof swrFn>>, TError>(swrKey, swrFn, swrOptions)

  return {
    swrKey,
    ...query
  }
}

/**
 * Return locations for a set of item ids, which you can get from character assets endpoint. Coordinates for items in hangars or stations are set to (0,0,0)

---
Alternate route: `/dev/characters/{character_id}/assets/locations/`

Alternate route: `/v2/characters/{character_id}/assets/locations/`

 * @summary Get character asset locations
 */
export const postCharactersCharacterIdAssetsLocations = (
    characterId: number,
    postCharactersCharacterIdAssetsLocationsBody: number[],
    params?: PostCharactersCharacterIdAssetsLocationsParams, options?: AxiosRequestConfig
 ): Promise<AxiosResponse<PostCharactersCharacterIdAssetsLocations200Item[]>> => {
    return axios.post(
      `/characters/${characterId}/assets/locations/`,
      postCharactersCharacterIdAssetsLocationsBody,{
    ...options,
        params: {...params, ...options?.params},}
    );
  }


/**
 * Return names for a set of item ids, which you can get from character assets endpoint. Typically used for items that can customize names, like containers or ships.

---
Alternate route: `/dev/characters/{character_id}/assets/names/`

Alternate route: `/legacy/characters/{character_id}/assets/names/`

Alternate route: `/v1/characters/{character_id}/assets/names/`

 * @summary Get character asset names
 */
export const postCharactersCharacterIdAssetsNames = (
    characterId: number,
    postCharactersCharacterIdAssetsNamesBody: number[],
    params?: PostCharactersCharacterIdAssetsNamesParams, options?: AxiosRequestConfig
 ): Promise<AxiosResponse<PostCharactersCharacterIdAssetsNames200Item[]>> => {
    return axios.post(
      `/characters/${characterId}/assets/names/`,
      postCharactersCharacterIdAssetsNamesBody,{
    ...options,
        params: {...params, ...options?.params},}
    );
  }


/**
 * Return a list of the corporation assets

---
Alternate route: `/dev/corporations/{corporation_id}/assets/`

Alternate route: `/v5/corporations/{corporation_id}/assets/`

---
This route is cached for up to 3600 seconds

---
Requires one of the following EVE corporation role(s): Director

 * @summary Get corporation assets
 */
export const getCorporationsCorporationIdAssets = (
    corporationId: number,
    params?: GetCorporationsCorporationIdAssetsParams, options?: AxiosRequestConfig
 ): Promise<AxiosResponse<GetCorporationsCorporationIdAssets200Item[]>> => {
    return axios.get(
      `/corporations/${corporationId}/assets/`,{
    ...options,
        params: {...params, ...options?.params},}
    );
  }


export const getGetCorporationsCorporationIdAssetsKey = (corporationId: number,
    params?: GetCorporationsCorporationIdAssetsParams,) => [`/corporations/${corporationId}/assets/`, ...(params ? [params]: [])];

    
export type GetCorporationsCorporationIdAssetsQueryResult = NonNullable<Awaited<ReturnType<typeof getCorporationsCorporationIdAssets>>>
export type GetCorporationsCorporationIdAssetsQueryError = AxiosError<void | BadRequest | Unauthorized | Forbidden | ErrorLimited | InternalServerError | ServiceUnavailable | GatewayTimeout>

export const useGetCorporationsCorporationIdAssets = <TError = AxiosError<void | BadRequest | Unauthorized | Forbidden | ErrorLimited | InternalServerError | ServiceUnavailable | GatewayTimeout>>(
 corporationId: number,
    params?: GetCorporationsCorporationIdAssetsParams, options?: { swr?:SWRConfiguration<Awaited<ReturnType<typeof getCorporationsCorporationIdAssets>>, TError> & { swrKey?: Key, enabled?: boolean }, axios?: AxiosRequestConfig }

  ) => {

  const {swr: swrOptions, axios: axiosOptions} = options ?? {}

  const isEnabled = swrOptions?.enabled !== false && !!(corporationId)
    const swrKey = swrOptions?.swrKey ?? (() => isEnabled ? getGetCorporationsCorporationIdAssetsKey(corporationId,params) : null);
  const swrFn = () => getCorporationsCorporationIdAssets(corporationId,params, axiosOptions);

  const query = useSwr<Awaited<ReturnType<typeof swrFn>>, TError>(swrKey, swrFn, swrOptions)

  return {
    swrKey,
    ...query
  }
}

/**
 * Return locations for a set of item ids, which you can get from corporation assets endpoint. Coordinates for items in hangars or stations are set to (0,0,0)

---
Alternate route: `/dev/corporations/{corporation_id}/assets/locations/`

Alternate route: `/v2/corporations/{corporation_id}/assets/locations/`


---
Requires one of the following EVE corporation role(s): Director

 * @summary Get corporation asset locations
 */
export const postCorporationsCorporationIdAssetsLocations = (
    corporationId: number,
    postCorporationsCorporationIdAssetsLocationsBody: number[],
    params?: PostCorporationsCorporationIdAssetsLocationsParams, options?: AxiosRequestConfig
 ): Promise<AxiosResponse<PostCorporationsCorporationIdAssetsLocations200Item[]>> => {
    return axios.post(
      `/corporations/${corporationId}/assets/locations/`,
      postCorporationsCorporationIdAssetsLocationsBody,{
    ...options,
        params: {...params, ...options?.params},}
    );
  }


/**
 * Return names for a set of item ids, which you can get from corporation assets endpoint. Only valid for items that can customize names, like containers or ships

---
Alternate route: `/dev/corporations/{corporation_id}/assets/names/`

Alternate route: `/legacy/corporations/{corporation_id}/assets/names/`

Alternate route: `/v1/corporations/{corporation_id}/assets/names/`


---
Requires one of the following EVE corporation role(s): Director

 * @summary Get corporation asset names
 */
export const postCorporationsCorporationIdAssetsNames = (
    corporationId: number,
    postCorporationsCorporationIdAssetsNamesBody: number[],
    params?: PostCorporationsCorporationIdAssetsNamesParams, options?: AxiosRequestConfig
 ): Promise<AxiosResponse<PostCorporationsCorporationIdAssetsNames200Item[]>> => {
    return axios.post(
      `/corporations/${corporationId}/assets/names/`,
      postCorporationsCorporationIdAssetsNamesBody,{
    ...options,
        params: {...params, ...options?.params},}
    );
  }

