import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const MercenaryAllyIcon = createEveIconComponent({
  name: "Mercenary Ally Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
