import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const SatelliteIcon = createEveIconComponent({
  name: "Satellite Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
