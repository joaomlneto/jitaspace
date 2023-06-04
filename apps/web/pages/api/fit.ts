import { type NextApiRequest, type NextApiResponse } from "next";
import { HttpStatusCode } from "axios";
import * as jose from "jose";

export default async function NextApiRouteHandler(
  req: NextApiRequest,
  res: NextApiResponse<
    | { error: string }
    | {
        shipName: string;
        shipTypeId: number;
        shipItemId: number;
        itemsInShip: unknown;
        names: Record<string, string>;
        eft: string;
      }
  >,
) {
  // Check if authorization header is present and has the right format
  if (
    !req.headers.authorization ||
    !req.headers.authorization.startsWith("Bearer ")
  ) {
    return res
      .status(HttpStatusCode.Unauthorized)
      .json({ error: "Authorization header invalid." });
  }

  // Get the token
  const token = req.headers.authorization.split(" ")[1];

  if (!token) {
    return res
      .status(HttpStatusCode.Unauthorized)
      .json({ error: "Authorization header token invalid." });
  }

  // Decode token

  const tokenPayload = token.split(".")[1];
  if (!tokenPayload) {
    return res
      .status(HttpStatusCode.Unauthorized)
      .json({ error: "Token payload invalid." });
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const decoded: Record<string, string> = JSON.parse(
    Buffer.from(tokenPayload, "base64").toString(),
  );

  // Check if token is valid (signature, expiration)
  try {
    const JWKS = jose.createRemoteJWKSet(
      new URL("https://login.eveonline.com/oauth/jwks"),
    );
    await jose.jwtVerify(token, JWKS, {
      issuer: "login.eveonline.com",
      audience: "EVE Online",
    });
  } catch (e) {
    console.error("error verifying token", (e as Error).message);
    return res
      .status(HttpStatusCode.Forbidden)
      .json({ error: "Token is invalid. " + (e as Error).message });
  }

  if (!decoded.sub) {
    return res
      .status(HttpStatusCode.BadRequest)
      .json({ error: "No subject found in token." });
  }

  // Extract character ID from token
  const characterId: string | undefined = decoded.sub.split(":")[2];
  if (!characterId) {
    return res
      .status(HttpStatusCode.BadRequest)
      .json({ error: "No character ID found." });
  }

  // Extract scopes from token

  const scopes: string[] = decoded.scp as unknown as string[];
  if (!scopes) {
    return res
      .status(HttpStatusCode.BadRequest)
      .json({ error: "No scopes found." });
  }

  // Check if scopes are valid/sufficient
  const requiredScopes = [
    "esi-location.read_ship_type.v1",
    "esi-assets.read_assets.v1",
  ];
  if (!requiredScopes.every((scope) => scopes.includes(scope))) {
    return res.status(HttpStatusCode.Forbidden).json({
      error: `Scopes missing in EVE SSO token: ${requiredScopes
        .filter((scope) => !scopes.includes(scope))
        .join(", ")}`,
    });
  }

  // get current ship
  const currentShipResponse = await fetch(
    `https://esi.evetech.net/latest/characters/${characterId}/ship/`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!currentShipResponse.ok) {
    return res
      .status(HttpStatusCode.InternalServerError)
      .json({ error: "Could not get current ship." });
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const currentShip: {
    ship_item_id: number;
    ship_name: string;
    ship_type_id: number;
  } = await currentShipResponse.json();

  let assets: {
    is_blueprint_copy?: boolean;
    is_singleton: boolean;
    item_id: number;
    location_flag: string;
    location_id: number;
    location_type: "station" | "solar_system" | "item" | "other";
    quantity: number;
    type_id: number;
  }[] = [];

  // get (first page of) assets
  const assetsResponse = await fetch(
    `https://esi.evetech.net/latest/characters/${characterId}/assets/`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!assetsResponse.ok) {
    return res
      .status(HttpStatusCode.InternalServerError)
      .json({ error: "Could not get assets." });
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const numPagesAssets = parseInt(assetsResponse.headers.get("x-pages")!);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const assetsData = await assetsResponse.json();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  assets = [...assets, ...assetsData];

  // get remaining pages of assets
  for (let i = 2; i <= numPagesAssets; i++) {
    const assetsResponse = await fetch(
      `https://esi.evetech.net/latest/characters/${characterId}/assets/?page=${i}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!assetsResponse.ok) {
      return res
        .status(HttpStatusCode.InternalServerError)
        .json({ error: "Could not get assets." });
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const assetsData = await assetsResponse.json();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    assets = [...assets, ...assetsData];
  }

  // determine the modules that are fitted to the current ship (or in cargo)
  const modules = assets.filter(
    (asset) => asset.location_id === currentShip.ship_item_id,
  );

  // get the names of all types that are used in the fit (ship + modules)
  const typeIds = [
    ...new Set([
      currentShip.ship_type_id,
      ...modules.map((module) => module.type_id),
    ]),
  ];

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const typeNames: { category: string; name: string; id: number }[] =
    await fetch(`https://esi.evetech.net/latest/universe/names/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(typeIds),
    }).then((res) => res.json());

  const names: Record<string, string> = {};
  typeNames.forEach((type) => {
    names[type.id] = type.name;
  });

  const usedMedSlots = [
    ...new Set(
      modules
        .filter((module) => module.location_flag.startsWith("MedSlot"))
        .map(({ location_flag }) => location_flag),
    ),
  ].sort();

  const usedHighSlots = [
    ...new Set(
      modules
        .filter((module) => module.location_flag.startsWith("HiSlot"))
        .map(({ location_flag }) => location_flag),
    ),
  ].sort();

  const eft: string[] = [
    `[${names[currentShip.ship_type_id]}, ${currentShip.ship_name}]`,
    ...modules
      .filter((module) => module.location_flag.startsWith("LoSlot"))
      .sort((a, b) => a.location_flag.localeCompare(b.location_flag))
      .map((module) => `${names[module.type_id]}`),
    "",
    ...usedMedSlots.map((slot) => {
      return modules
        .filter((module) => module.location_flag === slot)
        .sort((a, _b) => (a.is_singleton ? -1 : 1))
        .map((module) => `${names[module.type_id]}`)
        .join(",");
    }),
    "",
    ...usedHighSlots.map((slot) => {
      return modules
        .filter((module) => module.location_flag === slot)
        .sort((a, _b) => (a.is_singleton ? -1 : 1))
        .map((module) => `${names[module.type_id]}`)
        .join(",");
    }),
    "",
    ...modules
      .filter((module) => module.location_flag.startsWith("RigSlot"))
      .map((module) => `${names[module.type_id]}`),
    "",
    ...modules
      .filter((module) => module.location_flag.startsWith("SubSystemSlot"))
      .map((module) => `${names[module.type_id]}`),
    "",
    ...modules
      .filter(
        (module) =>
          module.location_flag.startsWith("DroneBay") ||
          module.location_flag.startsWith("FighterBay"),
      )
      .map((module) => `${names[module.type_id]}`),
    "",
    ...modules
      .filter((module) => module.location_flag.startsWith("Cargo"))
      .map((module) => `${names[module.type_id]} x${module.quantity}`),
  ];

  return res.json({
    shipItemId: currentShip.ship_item_id,
    shipName: currentShip.ship_name,
    shipTypeId: currentShip.ship_type_id,
    itemsInShip: modules,
    names,
    eft: eft.join("\n").trim(),
  });
}
