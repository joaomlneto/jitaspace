import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const SalvageHoldIcon = createEveIconComponent({
  name: "Salvage Hold Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
