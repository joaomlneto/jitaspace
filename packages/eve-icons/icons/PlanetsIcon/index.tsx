import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const PlanetsIcon = createEveIconComponent({
  name: "Planets Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
