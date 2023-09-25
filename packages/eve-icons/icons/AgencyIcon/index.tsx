import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const AgencyIcon = createEveIconComponent({
  name: "Agency Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
