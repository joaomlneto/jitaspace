import type { ReactElement } from "react";

import {
  CategoryAgentMissionIcon,
  WindowBasicServicesIcon,
  WindowBountyOfficeIcon,
  WindowCloneBayIcon,
  WindowContractCourierIcon,
  WindowDockingIcon,
  WindowFactionalWarfareIcon,
  WindowFittingIcon,
  WindowIndustryIcon,
  WindowInsuranceIcon,
  WindowItemHangarIcon,
  WindowJumpClonesIcon,
  WindowLpStoreIcon,
  WindowMarketIcon,
  WindowMarketOrdersIcon,
  WindowNewsPostIcon,
  WindowOfficesIcon,
  WindowPaintToolIcon,
  WindowRepairShopIcon,
  WindowReprocessIcon,
  WindowReprocessingIcon,
  WindowResearchIcon,
  WindowSecurityStatusIcon,
} from "@jitaspace/eve-icons";

/**
 * The client's own icon for each station service, by `stationServiceId`
 * (stationServices.yaml). Services the client has no icon for, mostly ones
 * retired long ago (Gambling, Surgery, DNA Therapy), fall back to the generic
 * station services icon.
 */
const SERVICE_ICONS: Record<number, (size: number) => ReactElement> = {
  // Bounty Missions
  1: (size) => <WindowBountyOfficeIcon size={size} alt="" />,
  // Assassination Missions
  2: (size) => <CategoryAgentMissionIcon size={size} alt="" />,
  // Courier Missions
  3: (size) => <WindowContractCourierIcon size={size} alt="" />,
  // Reprocessing Plant
  5: (size) => <WindowReprocessingIcon size={size} alt="" />,
  // Refinery
  6: (size) => <WindowReprocessIcon size={size} alt="" />,
  // Market
  7: (size) => <WindowMarketIcon size={size} alt="" />,
  // Black Market
  8: (size) => <WindowMarketIcon size={size} alt="" />,
  // Stock Exchange
  9: (size) => <WindowMarketOrdersIcon size={size} alt="" />,
  // Cloning
  10: (size) => <WindowCloneBayIcon size={size} alt="" />,
  // Repair Facilities
  13: (size) => <WindowRepairShopIcon size={size} alt="" />,
  // Factory
  14: (size) => <WindowIndustryIcon size={size} alt="" />,
  // Laboratory
  15: (size) => <WindowResearchIcon size={size} alt="" />,
  // Fitting
  17: (size) => <WindowFittingIcon size={size} alt="" />,
  // Paintshop
  18: (size) => <WindowPaintToolIcon size={size} alt="" />,
  // News
  19: (size) => <WindowNewsPostIcon size={size} alt="" />,
  // Storage
  20: (size) => <WindowItemHangarIcon size={size} alt="" />,
  // Insurance
  21: (size) => <WindowInsuranceIcon size={size} alt="" />,
  // Docking
  22: (size) => <WindowDockingIcon size={size} alt="" />,
  // Office Rental
  23: (size) => <WindowOfficesIcon size={size} alt="" />,
  // Jump Clone Facility
  24: (size) => <WindowJumpClonesIcon size={size} alt="" />,
  // Loyalty Point Store
  25: (size) => <WindowLpStoreIcon size={size} alt="" />,
  // Navy Offices
  26: (size) => <WindowFactionalWarfareIcon size={size} alt="" />,
  // Security Office
  27: (size) => <WindowSecurityStatusIcon size={size} alt="" />,
};

/** The client's icon for a station service, decorative beside its name. */
export function ServiceIcon({
  serviceId,
  size,
}: Readonly<{ serviceId: number; size: number }>): ReactElement {
  const icon = SERVICE_ICONS[serviceId];
  return icon ? icon(size) : <WindowBasicServicesIcon size={size} alt="" />;
}

/** Service ids the page annotates with the station's own figures. */
export const SERVICE = {
  reprocessingPlant: 5,
  docking: 22,
  officeRental: 23,
  loyaltyPointStore: 25,
} as const;
