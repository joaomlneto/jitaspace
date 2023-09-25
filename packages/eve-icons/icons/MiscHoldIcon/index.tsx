import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const MiscHoldIcon = createEveIconComponent({
  name: "Misc Hold Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
