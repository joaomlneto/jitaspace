import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const IncursionsIcon = createEveIconComponent({
  name: "Incursions Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
