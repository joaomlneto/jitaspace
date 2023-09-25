import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const MoonDrillSchedulerIcon = createEveIconComponent({
  name: "Moon Drill Scheduler Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
