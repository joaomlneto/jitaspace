import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const ShipsIcon = createEveIconComponent({
  name: "Ships Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
