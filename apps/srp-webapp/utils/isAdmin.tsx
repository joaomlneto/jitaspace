import {
  ESIScope,
  getCharactersCharacterId,
  getCharactersCharacterIdRoles,
} from "@jitaspace/esi-client";
import { GetCharactersCharacterIdRoles200RolesItem } from "@jitaspace/esi-client/src";
import {
  ESI_BASE_URL,
  getEveSsoAccessTokenPayload,
} from "@jitaspace/esi-hooks";

import { env } from "~/env.mjs";

export async function isTokenAdmin({
  characterId,
  accessToken,
}: {
  characterId: number;
  accessToken: string;
}) {
  const requiredScopes: ESIScope[] = [
    "esi-wallet.read_corporation_wallets.v1",
    "esi-characters.read_corporation_roles.v1",
    "esi-corporations.read_corporation_membership.v1",
  ];
  const possibleCorporationRoles: GetCharactersCharacterIdRoles200RolesItem[] =
    ["Director", "Accountant", "Junior_Accountant"];

  // check if token has required scopes
  console.log("going to decode token", accessToken.slice(0, 50) + "...");
  const payload = getEveSsoAccessTokenPayload(accessToken);
  console.log("token decoded");
  const hasRequiredScopes = requiredScopes.every(
    (scope) => payload?.scp?.includes(scope),
  );
  console.log("has required scopes?", hasRequiredScopes);
  if (!hasRequiredScopes) {
    console.log("token has insufficient scopes. ignoring.");
    return false;
  }
  console.log("token has required scopes");

  // check if character is in SRP corporation
  const characterResponse = await getCharactersCharacterId(
    characterId,
    {},
    { baseURL: ESI_BASE_URL },
  );
  const corporationId = characterResponse.data.corporation_id;
  const isInSrpCorporation =
    corporationId.toString() === env.NEXT_PUBLIC_SRP_CORPORATION_ID;
  console.log("is character in corporation?", isInSrpCorporation);
  if (!isInSrpCorporation) {
    console.log("character is not in corporation. ignoring.");
    return false;
  }

  // check if character has required corporation roles
  const corporationRolesResponse = await getCharactersCharacterIdRoles(
    characterId,
    {},
    {
      baseURL: ESI_BASE_URL,
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  const hasRequiredCorporationRoles = possibleCorporationRoles.some(
    (role) => corporationRolesResponse.data.roles?.includes(role),
  );
  if (!hasRequiredCorporationRoles) {
    console.log("character is missing required corporation roles. ignoring.");
    return false;
  }

  return true;
}
