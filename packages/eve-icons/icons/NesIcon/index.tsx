import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const NesIcon = createEveIconComponent({
  name: "New Eden Store Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
