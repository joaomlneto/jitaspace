import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const FuelBayIcon = createEveIconComponent({
  name: "Fuel Bay Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
