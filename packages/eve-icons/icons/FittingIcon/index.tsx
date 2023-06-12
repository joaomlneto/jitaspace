import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const FittingIcon = createEveIconComponent({
  name: "Fitting Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
