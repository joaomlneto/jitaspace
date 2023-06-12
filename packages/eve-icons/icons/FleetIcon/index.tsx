import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const FleetIcon = createEveIconComponent({
  name: "Fleet Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
