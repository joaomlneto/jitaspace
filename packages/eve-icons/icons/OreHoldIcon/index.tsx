import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const OreHoldIcon = createEveIconComponent({
  name: "Ore Hold Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
