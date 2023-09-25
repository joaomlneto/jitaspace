import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const TipOfTheDayIcon = createEveIconComponent({
  name: "Tip of the Day Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
