import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const MercenaryIcon = createEveIconComponent({
  name: "Mercenary Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
