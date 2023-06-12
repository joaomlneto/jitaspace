import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const RestrictionIcon = createEveIconComponent({
  name: "Restriction Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
