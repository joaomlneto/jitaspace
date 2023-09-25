import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const DecorationsIcon = createEveIconComponent({
  name: "Decorations Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
