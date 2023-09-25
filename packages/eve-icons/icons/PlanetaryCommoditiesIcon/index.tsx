import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const PlanetaryCommoditiesIcon = createEveIconComponent({
  name: "Planetary Commodities Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
