import { type NextApiRequest, type NextApiResponse } from "next";

export default async function NextApiRouteHandler(
  req: NextApiRequest,
  res: NextApiResponse<
    | { error: string }
    | {
        shipName: string;
        shipTypeId: number;
        shipItemId: number;
        itemsInShip: any;
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
    return res.status(401).json({ error: "Authorization header invalid." });
  }

  // Get the token
  const token = req.headers.authorization.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ error: "Authorization header token invalid." });
  }

  // TODO: Check if token is valid (signature, expiration)

  // Decode token
  const decoded = JSON.parse(atob(token.split(".")[1]!));

  // Extract character ID from token
  const characterId = decoded.sub.split(":")[2];
  if (!characterId) {
    return res.status(401).json({ error: "No character ID found." });
  }

  // Extract scopes from token
  const scopes: string[] = decoded.scp;
  if (!scopes) {
    return res.status(401).json({ error: "No scopes found." });
  }

  // Check if scopes are valid/sufficient
  const requiredScopes = [
    "esi-location.read_ship_type.v1",
    "esi-assets.read_assets.v1",
  ];
  if (!requiredScopes.every((scope) => scopes.includes(scope))) {
    return res.status(401).json({
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
    return res.status(500).json({ error: "Could not get current ship." });
  }

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
    return res.status(500).json({ error: "Could not get assets." });
  }

  const numPagesAssets = parseInt(assetsResponse.headers.get("x-pages")!);

  const assetsData = await assetsResponse.json();
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
      return res.status(500).json({ error: "Could not get assets." });
    }

    const assetsData = await assetsResponse.json();

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
        .sort((a, b) => (a.is_singleton ? -1 : 1))
        .map((module) => `${names[module.type_id]}`)
        .join(",");
    }),
    "",
    ...usedHighSlots.map((slot) => {
      return modules
        .filter((module) => module.location_flag === slot)
        .sort((a, b) => (a.is_singleton ? -1 : 1))
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
    eft: eft.join("\n"),
  });
}
