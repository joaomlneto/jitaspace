import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const MercenaryAddIcon = createEveIconComponent({
  name: "Mercenary Add Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
