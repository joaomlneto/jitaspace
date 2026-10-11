import type { ReactElement } from "react";
import { createElement } from "react";

import type { EveIconComponent } from "@jitaspace/eve-icons";
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
const SERVICE_ICONS: Record<number, EveIconComponent> = {
  1: WindowBountyOfficeIcon, // Bounty Missions
  2: CategoryAgentMissionIcon, // Assassination Missions
  3: WindowContractCourierIcon, // Courier Missions
  5: WindowReprocessingIcon, // Reprocessing Plant
  6: WindowReprocessIcon, // Refinery
  7: WindowMarketIcon, // Market
  8: WindowMarketIcon, // Black Market
  9: WindowMarketOrdersIcon, // Stock Exchange
  10: WindowCloneBayIcon, // Cloning
  13: WindowRepairShopIcon, // Repair Facilities
  14: WindowIndustryIcon, // Factory
  15: WindowResearchIcon, // Laboratory
  17: WindowFittingIcon, // Fitting
  18: WindowPaintToolIcon, // Paintshop
  19: WindowNewsPostIcon, // News
  20: WindowItemHangarIcon, // Storage
  21: WindowInsuranceIcon, // Insurance
  22: WindowDockingIcon, // Docking
  23: WindowOfficesIcon, // Office Rental
  24: WindowJumpClonesIcon, // Jump Clone Facility
  25: WindowLpStoreIcon, // Loyalty Point Store
  26: WindowFactionalWarfareIcon, // Navy Offices
  27: WindowSecurityStatusIcon, // Security Office
};

/** The client's icon for a station service, decorative beside its name. */
export function ServiceIcon({
  serviceId,
  size,
}: Readonly<{ serviceId: number; size: number }>): ReactElement {
  return createElement(SERVICE_ICONS[serviceId] ?? WindowBasicServicesIcon, {
    size,
    alt: "",
  });
}

/** Service ids the page annotates with the station's own figures. */
export const SERVICE = {
  reprocessingPlant: 5,
  docking: 22,
  officeRental: 23,
  loyaltyPointStore: 25,
} as const;
