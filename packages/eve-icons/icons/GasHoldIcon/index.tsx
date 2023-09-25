import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const GasHoldIcon = createEveIconComponent({
  name: "Gas Hold Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
