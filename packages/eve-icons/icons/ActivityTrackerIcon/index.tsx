import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const ActivityTrackerIcon = createEveIconComponent({
  name: "Activity Tracker Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
