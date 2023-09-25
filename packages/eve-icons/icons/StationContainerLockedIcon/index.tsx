import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const StationContainerLockedIcon = createEveIconComponent({
  name: "Station Container Locked Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
