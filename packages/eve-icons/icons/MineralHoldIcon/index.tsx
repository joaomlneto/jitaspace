import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const MineralHoldIcon = createEveIconComponent({
  name: "Mineral Hold Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
