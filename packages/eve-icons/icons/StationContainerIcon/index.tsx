import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const StationContainerIcon = createEveIconComponent({
  name: "Station Container Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
