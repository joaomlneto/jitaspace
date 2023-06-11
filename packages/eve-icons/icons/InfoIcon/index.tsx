import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const InfoIcon = createEveIconComponent({
  name: "Info Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
