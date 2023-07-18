// FIXME: REWRITE THIS FILE IN PROPER TYPESCRIPT!

export type FittingModule = {
  name: string;
  quantity: number;
};

export type FittingModuleWithAmmo = FittingModule & {
  ammo?: string;
};

export type ShipFitting = {
  typeName: string;
  shipName: string;
  highSlots: FittingModuleWithAmmo[];
  midSlots: FittingModuleWithAmmo[];
  lowSlots: FittingModule[];
  rigSlots: FittingModule[];
  subsystemSlots: FittingModule[];
  droneBay: FittingModule[];
  cargoHold: FittingModule[];
};

export const LOW_SLOTS_ATTRIBUTE_ID = 12;
export const MID_SLOTS_ATTRIBUTE_ID = 13;
export const HIGH_SLOTS_ATTRIBUTE_ID = 14;
export const RIG_SLOTS_ATTRIBUTE_ID = 1137;
export const SUBSYSTEM_SLOTS_ATTRIBUTE_ID = 1367;

const modulesAreMergeable = (
  a: FittingModuleWithAmmo,
  b: FittingModuleWithAmmo,
) => typeof a == typeof b && a.name == b.name && a.ammo == b.ammo;

const mergeModules = (modules: FittingModuleWithAmmo[]) => {
  return modules.filter((module, index, array) => {
    const matchingIndex = array.findIndex((m) =>
      modulesAreMergeable(m, module),
    );
    // if we found a matching module that is not this one, transfer quantities
    if (![-1, index].includes(matchingIndex)) {
      // @ts-expect-error guaranteed to exist
      array[matchingIndex].quantity += array[index].quantity;
      // @ts-expect-error guaranteed to exist
      array[index].quantity = 0;
      return false;
    }
    return true;
  });
};

const mergeModulesInFitting = (fitting: ShipFitting) => {
  return {
    ...fitting,
    highSlots: mergeModules(fitting.highSlots),
    midSlots: mergeModules(fitting.midSlots),
    lowSlots: mergeModules(fitting.lowSlots),
    rigSlots: mergeModules(fitting.rigSlots),
    subsystemSlots: mergeModules(fitting.subsystemSlots),
    droneBay: mergeModules(fitting.droneBay),
    cargoHold: mergeModules(fitting.cargoHold),
  };
};

export const parseEFTFitString = (
  data: string,
  mergeSimilarModules = true,
): ShipFitting => {
  const lines = data.trim().split("\n");
  let lineIndex = 0;

  // parse header and create fit object
  // @ts-expect-error guaranteed to exist
  const [typeName, shipName] = lines[lineIndex++].slice(1, -1).split(",");
  const fit: ShipFitting = {
    typeName: typeName ?? "",
    shipName: shipName ?? "",
    highSlots: [],
    midSlots: [],
    lowSlots: [],
    rigSlots: [],
    subsystemSlots: [],
    droneBay: [],
    cargoHold: [],
  };

  // parse low slots - lines only include name of module
  // @ts-expect-error guaranteed to exist
  while (lines[lineIndex].length > 0) {
    // @ts-expect-error guaranteed to exist
    fit.lowSlots.push({ name: lines[lineIndex++], quantity: 1 });
  }
  lineIndex++;

  // parse mid-slots - lines include name of module and optionally name of ammo
  // @ts-expect-error guaranteed to exist
  while (lines[lineIndex].length > 0) {
    // @ts-expect-error guaranteed to exist
    const [name, ammo] = lines[lineIndex++].split(",").map((s) => s.trim());
    fit.midSlots.push({ name: name!, ammo, quantity: 1 });
  }
  lineIndex++;

  // parse high slots - lines include name of module and optionally name of ammo
  // @ts-expect-error guaranteed to exist
  while (lines[lineIndex].length > 0) {
    // @ts-expect-error guaranteed to exist
    const [name, ammo] = lines[lineIndex++].split(",").map((s) => s.trim());
    fit.highSlots.push({ name: name!, ammo, quantity: 1 });
  }
  lineIndex++;

  // parse rig slots - lines only include name of module
  // @ts-expect-error guaranteed to exist
  while (lines[lineIndex] && lines[lineIndex].length > 0)
    // @ts-expect-error guaranteed to exist
    fit.rigSlots.push({ name: lines[lineIndex++], quantity: 1 });
  lineIndex++;

  // parse subsystem slots - lines only include name of module
  // @ts-expect-error guaranteed to exist
  while (lines[lineIndex] && lines[lineIndex].length > 0)
    // @ts-expect-error guaranteed to exist
    fit.subsystemSlots.push({ name: lines[lineIndex++], quantity: 1 });
  lineIndex++;

  // parse drone bay  - lines include name of module and quantity
  // @ts-expect-error guaranteed to exist
  while (lines[lineIndex] && lines[lineIndex].length > 0) {
    // @ts-expect-error guaranteed to exist
    const tokens = lines[lineIndex].split(" ");
    fit.droneBay.push({
      name: tokens.slice(0, -1).join(" "),
      // @ts-expect-error guaranteed to exist
      quantity: Number(tokens.slice(-1)[0].slice(1)),
    });
    lineIndex++;
  }
  lineIndex++;

  // parse cargo hold - lines include name of module and quantity
  // @ts-expect-error guaranteed to exist
  while (lines[lineIndex] && lines[lineIndex].length > 0) {
    // @ts-expect-error guaranteed to exist
    const tokens = lines[lineIndex].split(" ");
    fit.cargoHold.push({
      name: tokens.slice(0, -1).join(" "),
      // @ts-expect-error guaranteed to exist
      quantity: Number(tokens.slice(-1)[0].slice(1)),
    });
    lineIndex++;
  }

  return mergeSimilarModules ? mergeModulesInFitting(fit) : fit;
};

export function toEFTFitString(fit: ShipFitting) {
  const lines = [
    `[${fit.typeName},${fit.shipName}]`,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    ...fit.lowSlots.flatMap((module) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      Array(module.quantity).fill(`${module.name}`),
    ),
    "",
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    ...fit.midSlots.flatMap((module) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      Array(module.quantity).fill(
        `${module.name}${module.ammo ? `, ${module.ammo}` : ""}`,
      ),
    ),
    "",
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    ...fit.highSlots.flatMap((module) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      Array(module.quantity).fill(
        `${module.name}${module.ammo ? `, ${module.ammo}` : ""}`,
      ),
    ),
    "",
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    ...fit.rigSlots.flatMap((module) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      Array(module.quantity).fill(`${module.name}`),
    ),
    "",
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    ...fit.subsystemSlots.flatMap((module) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      Array(module.quantity).fill(`${module.name}`),
    ),
    "",
    ...fit.droneBay.flatMap((module) => `${module.name} x${module.quantity}`),
    "",
    ...fit.cargoHold.flatMap((module) => `${module.name} x${module.quantity}`),
  ];

  return lines.join("\n");
}
