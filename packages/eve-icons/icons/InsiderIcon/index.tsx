import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const InsiderIcon = createEveIconComponent({
  name: "Insider Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
